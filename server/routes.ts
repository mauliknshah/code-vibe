import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GitHubService } from "./services/github";
import { codeAnalysisService } from "./services/openai";
import { insertRepositorySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {

  // Repository search route
  app.get("/api/repositories/search", async (req, res) => {
    try {
      const { q, sort = 'stars' } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const githubService = new GitHubService();
      const repositories = await githubService.searchPublicRepositories(q as string, sort as 'stars' | 'updated' | 'forks');
      
      res.json(repositories);
    } catch (error) {
      console.error("Error searching repositories:", error);
      res.status(500).json({ message: "Failed to search repositories" });
    }
  });

  app.post("/api/repositories/select", async (req, res) => {
    try {
      const { fullName } = req.body;
      
      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ message: "Repository full name is required" });
      }
      
      const githubService = new GitHubService();
      
      // Check if repository already exists
      let repository = await storage.getRepositoryByFullName(fullName);
      
      if (!repository) {
        // Fetch repository details from GitHub
        const githubRepo = await githubService.getRepositoryByFullName(fullName);
        
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
            // Use accurate totals from GitHub API search instead of array lengths
            totalCommits: analysisData.totals.totalCommits,
            totalPRs: analysisData.pullRequests.length, // PRs don't have pagination issues usually
            totalIssues: analysisData.totals.totalIssues,
            totalReleases: analysisData.releases.length, // Releases are usually limited
            totalContributors: analysisData.totals.totalContributors,
            openIssues: analysisData.totals.openIssues,
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
            // Use accurate totals from GitHub API search instead of array lengths
            totalCommits: analysisData.totals.totalCommits,
            totalPRs: analysisData.pullRequests.length, // PRs don't have pagination issues usually
            totalIssues: analysisData.totals.totalIssues,
            totalReleases: analysisData.releases.length, // Releases are usually limited
            totalContributors: analysisData.totals.totalContributors,
            openIssues: analysisData.totals.openIssues,
          },
        });
      }
      
      res.json({ repository, analysis });
    } catch (error) {
      console.error("Error selecting repository:", error);
      res.status(500).json({ message: "Failed to select repository" });
    }
  });

  app.get("/api/repositories/:id/analysis", async (req, res) => {
    try {
      const repository = await storage.getRepository(req.params.id);
      if (!repository) {
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
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversationWithMessages(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { repositoryId, title } = req.body;
      
      const repository = await storage.getRepository(repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const conversation = await storage.createConversation({
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
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { content } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
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
