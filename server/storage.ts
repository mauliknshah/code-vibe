import { 
  type User, 
  type InsertUser, 
  type Repository, 
  type InsertRepository,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type RepositoryAnalysis,
  type InsertRepositoryAnalysis,
  type ConversationWithMessages,
  type RepositoryWithAnalysis
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Repository methods
  getRepository(id: string): Promise<Repository | undefined>;
  getRepositoryByGithubId(githubId: number): Promise<Repository | undefined>;
  getRepositoriesByUser(userId: string): Promise<Repository[]>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: string, updates: Partial<Repository>): Promise<Repository | undefined>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationWithMessages(id: string): Promise<ConversationWithMessages | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Repository Analysis methods
  getRepositoryAnalysis(repositoryId: string): Promise<RepositoryAnalysis | undefined>;
  createRepositoryAnalysis(analysis: InsertRepositoryAnalysis): Promise<RepositoryAnalysis>;
  updateRepositoryAnalysis(repositoryId: string, updates: Partial<RepositoryAnalysis>): Promise<RepositoryAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private repositories: Map<string, Repository> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message> = new Map();
  private repositoryAnalyses: Map<string, RepositoryAnalysis> = new Map();

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.githubId === githubId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      email: insertUser.email || null,
      avatarUrl: insertUser.avatarUrl || null,
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Repository methods
  async getRepository(id: string): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getRepositoryByGithubId(githubId: number): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(repo => repo.githubId === githubId);
  }

  async getRepositoriesByUser(userId: string): Promise<Repository[]> {
    return Array.from(this.repositories.values()).filter(repo => repo.userId === userId);
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = randomUUID();
    const repository: Repository = {
      ...insertRepository,
      description: insertRepository.description || null,
      isPrivate: insertRepository.isPrivate || false,
      language: insertRepository.language || null,
      stars: insertRepository.stars || 0,
      forks: insertRepository.forks || 0,
      userId: insertRepository.userId || null,
      id,
      createdAt: new Date(),
      lastAnalyzed: null,
      analysisData: null
    };
    this.repositories.set(id, repository);
    return repository;
  }

  async updateRepository(id: string, updates: Partial<Repository>): Promise<Repository | undefined> {
    const repository = this.repositories.get(id);
    if (!repository) return undefined;
    
    const updatedRepository = { ...repository, ...updates };
    this.repositories.set(id, updatedRepository);
    return updatedRepository;
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationWithMessages(id: string): Promise<ConversationWithMessages | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const messages = await this.getMessagesByConversation(id);
    return { ...conversation, messages };
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(conv => conv.userId === userId);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      title: insertConversation.title || null,
      userId: insertConversation.userId || null,
      repositoryId: insertConversation.repositoryId || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { ...conversation, ...updates, updatedAt: new Date() };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      conversationId: insertMessage.conversationId || null,
      metadata: insertMessage.metadata || null,
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  // Repository Analysis methods
  async getRepositoryAnalysis(repositoryId: string): Promise<RepositoryAnalysis | undefined> {
    return Array.from(this.repositoryAnalyses.values()).find(analysis => analysis.repositoryId === repositoryId);
  }

  async createRepositoryAnalysis(insertAnalysis: InsertRepositoryAnalysis): Promise<RepositoryAnalysis> {
    const id = randomUUID();
    const analysis: RepositoryAnalysis = {
      ...insertAnalysis,
      repositoryId: insertAnalysis.repositoryId || null,
      commits: insertAnalysis.commits || null,
      pullRequests: insertAnalysis.pullRequests || null,
      issues: insertAnalysis.issues || null,
      releases: insertAnalysis.releases || null,
      contributors: insertAnalysis.contributors || null,
      codeMetrics: insertAnalysis.codeMetrics || null,
      id,
      lastUpdated: new Date()
    };
    this.repositoryAnalyses.set(id, analysis);
    return analysis;
  }

  async updateRepositoryAnalysis(repositoryId: string, updates: Partial<RepositoryAnalysis>): Promise<RepositoryAnalysis | undefined> {
    const existing = await this.getRepositoryAnalysis(repositoryId);
    if (!existing) return undefined;
    
    const updatedAnalysis = { ...existing, ...updates, lastUpdated: new Date() };
    this.repositoryAnalyses.set(existing.id, updatedAnalysis);
    return updatedAnalysis;
  }
}

export const storage = new MemStorage();
