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
      const [repoDetails, commits, pullRequests, issues, releases, contributors, totals] = await Promise.all([
        this.octokit.rest.repos.get({ owner, repo }),
        this.getCommits(owner, repo),
        this.getPullRequests(owner, repo),
        this.getIssues(owner, repo),
        this.getReleases(owner, repo),
        this.getContributors(owner, repo),
        this.getRepositoryTotals(owner, repo),
      ]);

      return {
        repository: repoDetails.data,
        commits,
        pullRequests,
        issues,
        releases,
        contributors,
        totals,
      };
    } catch (error) {
      console.error("Error fetching repository details:", error);
      throw new Error("Failed to fetch repository details from GitHub");
    }
  }

  private async getCommits(owner: string, repo: string) {
    try {
      // Get recent commits with pagination (limit to 300 for performance)
      const commits = [];
      let page = 1;
      const maxPages = 3; // 300 commits total
      
      while (page <= maxPages) {
        const response = await this.octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: 100,
          page,
        });
        
        commits.push(...response.data);
        
        // If we got less than 100 results, we've reached the end
        if (response.data.length < 100) {
          break;
        }
        
        page++;
      }
      
      return commits;
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
      // Get recent issues with pagination (limit to 500 for performance)
      const issues = [];
      let page = 1;
      const maxPages = 5; // 500 issues total
      
      while (page <= maxPages) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: "all",
          per_page: 100,
          page,
        });
        
        issues.push(...response.data);
        
        // If we got less than 100 results, we've reached the end
        if (response.data.length < 100) {
          break;
        }
        
        page++;
      }
      
      return issues;
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
      // Get all contributors with pagination
      const contributors = [];
      let page = 1;
      const maxPages = 5; // 500 contributors max
      
      while (page <= maxPages) {
        const response = await this.octokit.rest.repos.listContributors({
          owner,
          repo,
          per_page: 100,
          page,
        });
        
        contributors.push(...response.data);
        
        // If we got less than 100 results, we've reached the end
        if (response.data.length < 100) {
          break;
        }
        
        page++;
      }
      
      return contributors;
    } catch (error) {
      console.error("Error fetching contributors:", error);
      return [];
    }
  }

  private async getRepositoryTotals(owner: string, repo: string) {
    try {
      // Get accurate totals using GitHub's search API and repository metadata
      const [commitsSearch, contributorsSearch, issuesSearch, repoData] = await Promise.all([
        // Get total commit count using search API
        this.octokit.rest.search.commits({
          q: `repo:${owner}/${repo}`,
          per_page: 1, // We only need the total count
        }).catch(() => ({ data: { total_count: 0 } })),
        
        // Contributors count from the repository endpoint
        this.octokit.rest.repos.listContributors({
          owner,
          repo,
          per_page: 1,
        }).then(response => {
          // GitHub doesn't provide total count for contributors directly
          // We'll need to estimate or use the Link header if available
          const linkHeader = response.headers.link;
          if (linkHeader) {
            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastPageMatch) {
              return { total_count: parseInt(lastPageMatch[1]) * 100 }; // Rough estimate
            }
          }
          return { total_count: response.data.length };
        }).catch(() => ({ total_count: 0 })),
        
        // Get total issues count using search API
        this.octokit.rest.search.issuesAndPullRequests({
          q: `repo:${owner}/${repo} is:issue`,
          per_page: 1, // We only need the total count
        }).catch(() => ({ data: { total_count: 0 } })),
        
        // Get repository metadata
        this.octokit.rest.repos.get({ owner, repo }).catch(() => ({ data: {} })),
      ]);

      // Also get open issues count specifically
      const openIssuesSearch = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo} is:issue is:open`,
        per_page: 1,
      }).catch(() => ({ data: { total_count: 0 } }));

      return {
        totalCommits: commitsSearch.data.total_count || 0,
        totalContributors: contributorsSearch.total_count || 0,
        totalIssues: issuesSearch.data.total_count || 0,
        openIssues: openIssuesSearch.data.total_count || 0,
        // Additional metadata from repository
        stars: (repoData.data as any)?.stargazers_count || 0,
        forks: (repoData.data as any)?.forks_count || 0,
        watchers: (repoData.data as any)?.watchers_count || 0,
      };
    } catch (error) {
      console.error("Error fetching repository totals:", error);
      return {
        totalCommits: 0,
        totalContributors: 0,
        totalIssues: 0,
        openIssues: 0,
        stars: 0,
        forks: 0,
        watchers: 0,
      };
    }
  }

}
