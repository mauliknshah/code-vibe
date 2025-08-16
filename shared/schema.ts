import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Repositories table
export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  githubId: integer("github_id").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(false),
  language: text("language"),
  stars: integer("stars").default(0),
  forks: integer("forks").default(0),
  url: text("url").notNull(),
  userId: varchar("user_id"),
  lastAnalyzed: timestamp("last_analyzed"),
  analysisData: jsonb("analysis_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  repositoryId: varchar("repository_id").references(() => repositories.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing analysis results, follow-up questions, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// GitHub data cache
export const repositoryAnalysis = pgTable("repository_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").references(() => repositories.id),
  commits: jsonb("commits"),
  pullRequests: jsonb("pull_requests"),
  issues: jsonb("issues"),
  releases: jsonb("releases"),
  contributors: jsonb("contributors"),
  codeMetrics: jsonb("code_metrics"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Schema exports
export const insertRepositorySchema = createInsertSchema(repositories).omit({
  id: true,
  createdAt: true,
  lastAnalyzed: true,
  analysisData: true,
  userId: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertRepositoryAnalysisSchema = createInsertSchema(repositoryAnalysis).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type RepositoryAnalysis = typeof repositoryAnalysis.$inferSelect;
export type InsertRepositoryAnalysis = z.infer<typeof insertRepositoryAnalysisSchema>;

// Additional types for API responses
export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  updated_at: string;
};

export type ConversationWithMessages = Conversation & {
  messages: Message[];
};

export type RepositoryWithAnalysis = Repository & {
  analysis?: RepositoryAnalysis;
};
