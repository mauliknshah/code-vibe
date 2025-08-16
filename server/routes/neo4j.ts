import type { Express } from "express";
import { Neo4jService } from "../services/neo4j";

export function registerNeo4jRoutes(app: Express) {
  // Get repository insights from Neo4j graph
  app.get("/api/repositories/:fullName/graph-insights", async (req, res) => {
    try {
      const { fullName } = req.params;
      const namespace = fullName.replace("%2F", "/"); // Handle URL encoding
      
      const neo4jConfig = {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password'
      };
      
      const neo4jService = Neo4jService.getInstance(neo4jConfig);
      const isConnected = await neo4jService.testConnection();
      
      if (!isConnected) {
        return res.status(503).json({ 
          message: "Neo4j database not available",
          available: false 
        });
      }
      
      const insights = await neo4jService.getRepositoryInsights(namespace);
      
      res.json({
        available: true,
        repository: namespace,
        insights
      });
    } catch (error) {
      console.error("Error fetching graph insights:", error);
      res.status(500).json({ 
        message: "Failed to fetch graph insights",
        available: false 
      });
    }
  });

  // Execute custom Cypher queries
  app.post("/api/graph/query", async (req, res) => {
    try {
      const { cypher, parameters = {} } = req.body;
      
      if (!cypher || typeof cypher !== 'string') {
        return res.status(400).json({ message: "Cypher query is required" });
      }
      
      const neo4jConfig = {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password'
      };
      
      const neo4jService = Neo4jService.getInstance(neo4jConfig);
      const isConnected = await neo4jService.testConnection();
      
      if (!isConnected) {
        return res.status(503).json({ 
          message: "Neo4j database not available",
          available: false 
        });
      }
      
      const results = await neo4jService.queryGraph(cypher, parameters);
      
      res.json({
        available: true,
        query: cypher,
        results
      });
    } catch (error) {
      console.error("Error executing Cypher query:", error);
      res.status(500).json({ 
        message: "Failed to execute query",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get repository collaboration network
  app.get("/api/repositories/:fullName/collaboration-network", async (req, res) => {
    try {
      const { fullName } = req.params;
      const namespace = fullName.replace("%2F", "/");
      
      const neo4jConfig = {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password'
      };
      
      const neo4jService = Neo4jService.getInstance(neo4jConfig);
      const isConnected = await neo4jService.testConnection();
      
      if (!isConnected) {
        return res.status(503).json({ 
          message: "Neo4j database not available",
          available: false 
        });
      }
      
      // Get collaboration patterns between contributors
      const collaborationQuery = `
        MATCH (c1:Contributor {namespace: $namespace})-[:AUTHORED]->(commit:Commit)
        MATCH (c2:Contributor {namespace: $namespace})-[:AUTHORED]->(commit2:Commit)
        WHERE c1 <> c2 AND commit.date > datetime() - duration('P30D')
        WITH c1, c2, count(DISTINCT commit) + count(DISTINCT commit2) as interaction_score
        WHERE interaction_score > 2
        RETURN c1.login as contributor1, c2.login as contributor2, interaction_score
        ORDER BY interaction_score DESC
        LIMIT 50
      `;
      
      const results = await neo4jService.queryGraph(collaborationQuery, { namespace });
      
      res.json({
        available: true,
        repository: namespace,
        collaborations: results
      });
    } catch (error) {
      console.error("Error fetching collaboration network:", error);
      res.status(500).json({ 
        message: "Failed to fetch collaboration network",
        available: false 
      });
    }
  });

  // Get repository evolution timeline
  app.get("/api/repositories/:fullName/evolution-timeline", async (req, res) => {
    try {
      const { fullName } = req.params;
      const namespace = fullName.replace("%2F", "/");
      
      const neo4jConfig = {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password'
      };
      
      const neo4jService = Neo4jService.getInstance(neo4jConfig);
      const isConnected = await neo4jService.testConnection();
      
      if (!isConnected) {
        return res.status(503).json({ 
          message: "Neo4j database not available",
          available: false 
        });
      }
      
      // Get timeline of major events
      const timelineQuery = `
        MATCH (repo:Repository {namespace: $namespace})
        OPTIONAL MATCH (commit:Commit {namespace: $namespace})
        OPTIONAL MATCH (pr:PullRequest {namespace: $namespace})
        OPTIONAL MATCH (issue:Issue {namespace: $namespace})
        OPTIONAL MATCH (release:Release {namespace: $namespace})
        
        WITH commit.date as commit_date, 'commit' as event_type, commit.message as description, commit.author_name as actor
        UNION
        WITH pr.created_at as commit_date, 'pull_request' as event_type, pr.title as description, null as actor
        UNION  
        WITH issue.created_at as commit_date, 'issue' as event_type, issue.title as description, null as actor
        UNION
        WITH release.published_at as commit_date, 'release' as event_type, release.name as description, null as actor
        
        WHERE commit_date IS NOT NULL
        RETURN event_type, description, actor, commit_date
        ORDER BY commit_date DESC
        LIMIT 100
      `;
      
      const results = await neo4jService.queryGraph(timelineQuery, { namespace });
      
      res.json({
        available: true,
        repository: namespace,
        timeline: results
      });
    } catch (error) {
      console.error("Error fetching evolution timeline:", error);
      res.status(500).json({ 
        message: "Failed to fetch evolution timeline",
        available: false 
      });
    }
  });
}