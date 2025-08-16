import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GitHubService } from "./services/github";
import { codeAnalysisService } from "./services/openai";
import { insertUserSchema, insertRepositorySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import session from "express-session";

// Extend the session interface to include our custom properties
declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration for OAuth
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // GitHub OAuth routes
  app.get("/api/auth/github", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ message: "GitHub OAuth not configured" });
    }

    // Use HTTPS for deployed apps and dynamic protocol for development
    const protocol = process.env.NODE_ENV === 'production' || req.get('host')?.includes('replit.app') ? 'https' : req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/api/auth/github/callback`;
    const scope = "repo,user:email";
    const state = Math.random().toString(36).substring(7);
    
    console.log('OAuth redirect URI:', redirectUri); // Debug log
    
    (req.session as any).oauthState = state;
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    res.redirect(authUrl);
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || state !== (req.session as any).oauthState) {
        return res.status(400).json({ message: "Invalid OAuth callback" });
      }

      const accessToken = await GitHubService.exchangeCodeForToken(code as string);
      const githubService = new GitHubService(accessToken);
      const profile = await githubService.getUserProfile();

      let user = await storage.getUserByGithubId(profile.id.toString());
      
      if (!user) {
        user = await storage.createUser({
          githubId: profile.id.toString(),
          username: profile.login,
          email: profile.email,
          avatarUrl: profile.avatar_url,
          accessToken,
        });
      } else {
        user = await storage.updateUser(user.id, {
          accessToken,
          username: profile.login,
          email: profile.email,
          avatarUrl: profile.avatar_url,
        });
      }

      (req.session as any).userId = user?.id;
      res.redirect("/");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Middleware to check authentication
  const requireAuth = async (req: any, res: any, next: any) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    req.user = user;
    next();
  };

  // User profile route
  app.get("/api/user/profile", requireAuth, (req: any, res) => {
    const { accessToken, ...userProfile } = req.user;
    res.json(userProfile);
  });

  // Repository routes
  app.get("/api/repositories", requireAuth, async (req: any, res) => {
    try {
      const githubService = new GitHubService(req.user.accessToken);
      const githubRepos = await githubService.getUserRepositories();
      
      // Get stored repositories for this user
      const storedRepos = await storage.getRepositoriesByUser(req.user.id);
      const storedRepoMap = new Map(storedRepos.map(repo => [repo.githubId, repo]));
      
      // Merge GitHub data with stored data
      const repositories = githubRepos.map(githubRepo => {
        const stored = storedRepoMap.get(githubRepo.id);
        return stored || {
          githubId: githubRepo.id,
          name: githubRepo.name,
          fullName: githubRepo.full_name,
          description: githubRepo.description,
          isPrivate: githubRepo.private,
          language: githubRepo.language,
          stars: githubRepo.stargazers_count,
          forks: githubRepo.forks_count,
          url: githubRepo.html_url,
          userId: req.user.id,
        };
      });
      
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  app.post("/api/repositories/:githubId/select", requireAuth, async (req: any, res) => {
    try {
      const githubId = parseInt(req.params.githubId);
      const githubService = new GitHubService(req.user.accessToken);
      
      // Check if repository already exists
      let repository = await storage.getRepositoryByGithubId(githubId);
      
      if (!repository) {
        // Fetch repository details from GitHub
        const githubRepos = await githubService.getUserRepositories();
        const githubRepo = githubRepos.find(repo => repo.id === githubId);
        
        if (!githubRepo) {
          return res.status(404).json({ message: "Repository not found" });
        }
        
        repository = await storage.createRepository({
          githubId: githubRepo.id,
          name: githubRepo.name,
          fullName: githubRepo.full_name,
          description: githubRepo.description,
          isPrivate: githubRepo.private,
          language: githubRepo.language,
          stars: githubRepo.stargazers_count,
          forks: githubRepo.forks_count,
          url: githubRepo.html_url,
          userId: req.user.id,
        });
      }
      
      // Fetch and store repository analysis data
      const [owner, repo] = repository.fullName.split('/');
      const analysisData = await githubService.getRepositoryDetails(owner, repo);
      
      // Store or update analysis
      let analysis = await storage.getRepositoryAnalysis(repository.id);
      if (analysis) {
        analysis = await storage.updateRepositoryAnalysis(repository.id, {
          commits: analysisData.commits,
          pullRequests: analysisData.pullRequests,
          issues: analysisData.issues,
          releases: analysisData.releases,
          contributors: analysisData.contributors,
          codeMetrics: {
            totalCommits: analysisData.commits.length,
            totalPRs: analysisData.pullRequests.length,
            totalIssues: analysisData.issues.length,
            totalReleases: analysisData.releases.length,
            totalContributors: analysisData.contributors.length,
          },
        });
      } else {
        analysis = await storage.createRepositoryAnalysis({
          repositoryId: repository.id,
          commits: analysisData.commits,
          pullRequests: analysisData.pullRequests,
          issues: analysisData.issues,
          releases: analysisData.releases,
          contributors: analysisData.contributors,
          codeMetrics: {
            totalCommits: analysisData.commits.length,
            totalPRs: analysisData.pullRequests.length,
            totalIssues: analysisData.issues.length,
            totalReleases: analysisData.releases.length,
            totalContributors: analysisData.contributors.length,
          },
        });
      }
      
      res.json({ repository, analysis });
    } catch (error) {
      console.error("Error selecting repository:", error);
      res.status(500).json({ message: "Failed to select repository" });
    }
  });

  app.get("/api/repositories/:id/analysis", requireAuth, async (req: any, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository || repository.userId !== req.user.id) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const analysis = await storage.getRepositoryAnalysis(repository.id);
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching repository analysis:", error);
      res.status(500).json({ message: "Failed to fetch repository analysis" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const conversations = await storage.getConversationsByUser(req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req: any, res) => {
    try {
      const conversation = await storage.getConversationWithMessages(req.params.id);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const { repositoryId, title } = req.body;
      
      const repository = await storage.getRepository(repositoryId);
      if (!repository || repository.userId !== req.user.id) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const conversation = await storage.createConversation({
        userId: req.user.id,
        repositoryId,
        title,
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Message and analysis routes
  app.post("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const { content } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Create user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content,
        metadata: null,
      });
      
      // Get repository analysis data
      const repository = await storage.getRepository(conversation.repositoryId!);
      const analysis = await storage.getRepositoryAnalysis(conversation.repositoryId!);
      
      // Get conversation history for context
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Generate AI response
      const analysisResult = await codeAnalysisService.analyzeQuestion(
        content,
        {
          repository,
          commits: analysis?.commits,
          pullRequests: analysis?.pullRequests,
          issues: analysis?.issues,
          releases: analysis?.releases,
          contributors: analysis?.contributors,
        },
        conversationHistory
      );
      
      // Create AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: analysisResult.answer,
        metadata: {
          followUpQuestions: analysisResult.followUpQuestions,
          insights: analysisResult.insights,
          confidence: analysisResult.confidence,
        },
      });
      
      // Update conversation title if this is the first message
      if (messages.length === 0) {
        const title = await codeAnalysisService.generateTitle(content);
        await storage.updateConversation(conversationId, { title });
      }
      
      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
