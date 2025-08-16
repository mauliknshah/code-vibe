import { Octokit } from "@octokit/rest";
import type { GitHubRepository } from "@shared/schema";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit();
  }

  async searchPublicRepositories(query: string, sort: 'stars' | 'updated' | 'forks' = 'stars'): Promise<GitHubRepository[]> {
    try {
      const response = await this.octokit.rest.search.repos({
        q: query,
        sort: sort,
        order: 'desc',
        per_page: 50,
      });
      
      return response.data.items.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        html_url: repo.html_url,
        updated_at: repo.updated_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Error searching repositories:", error);
      throw new Error("Failed to search repositories from GitHub");
    }
  }

  async getRepositoryByFullName(fullName: string): Promise<GitHubRepository> {
    try {
      const [owner, repo] = fullName.split('/');
      const response = await this.octokit.rest.repos.get({ owner, repo });
      
      return {
        id: response.data.id,
        name: response.data.name,
        full_name: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        language: response.data.language,
        stargazers_count: response.data.stargazers_count,
        forks_count: response.data.forks_count,
        html_url: response.data.html_url,
        updated_at: response.data.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching repository:", error);
      throw new Error("Failed to fetch repository from GitHub");
    }
  }

  async getRepositoryDetails(owner: string, repo: string) {
    try {
      const [repoDetails, commits, pullRequests, issues, releases, contributors] = await Promise.all([
        this.octokit.rest.repos.get({ owner, repo }),
        this.getCommits(owner, repo),
        this.getPullRequests(owner, repo),
        this.getIssues(owner, repo),
        this.getReleases(owner, repo),
        this.getContributors(owner, repo),
      ]);

      return {
        repository: repoDetails.data,
        commits,
        pullRequests,
        issues,
        releases,
        contributors,
      };
    } catch (error) {
      console.error("Error fetching repository details:", error);
      throw new Error("Failed to fetch repository details from GitHub");
    }
  }

  private async getCommits(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching commits:", error);
      return [];
    }
  }

  private async getPullRequests(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching pull requests:", error);
      return [];
    }
  }

  private async getIssues(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "all",
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching issues:", error);
      return [];
    }
  }

  private async getReleases(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page: 50,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching releases:", error);
      return [];
    }
  }

  private async getContributors(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

}
