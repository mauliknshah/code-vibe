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
      // Get repository metadata first - this gives us reliable open issues count
      const repoData = await this.octokit.rest.repos.get({ owner, repo }).catch(() => ({ data: {} }));
      
      // Get more accurate counts using pagination and Link headers
      const [totalCommits, totalContributors, totalIssues] = await Promise.all([
        this.getAccurateCommitCount(owner, repo),
        this.getAccurateContributorCount(owner, repo),
        this.getAccurateIssueCount(owner, repo),
      ]);

      return {
        totalCommits,
        totalContributors,
        totalIssues,
        openIssues: (repoData.data as any)?.open_issues_count || 0, // Open issues from repo metadata
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

  private async getAccurateCommitCount(owner: string, repo: string): Promise<number> {
    try {
      // Try to get accurate commit count by checking multiple pages
      let totalCommits = 0;
      let page = 1;
      const maxPages = 10; // Check up to 1000 commits to get a better estimate
      
      while (page <= maxPages) {
        const response = await this.octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: 100,
          page,
        });
        
        totalCommits += response.data.length;
        
        // If we got less than 100 results, we've reached the end
        if (response.data.length < 100) {
          break;
        }
        
        page++;
      }
      
      // If we hit the max pages limit, estimate based on what we found
      if (page > maxPages && totalCommits === maxPages * 100) {
        // We likely have more commits, so estimate conservatively
        return Math.round(totalCommits * 1.5); // Conservative estimate
      }
      
      return totalCommits;
    } catch (error) {
      console.error("Error getting accurate commit count:", error);
      return 0;
    }
  }

  private async getAccurateContributorCount(owner: string, repo: string): Promise<number> {
    try {
      // Get contributors count using Link header for accurate pagination
      const response = await this.octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100,
        page: 1,
      });
      
      // Check Link header for total pages
      const linkHeader = response.headers.link;
      if (linkHeader) {
        const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastPageMatch) {
          const lastPage = parseInt(lastPageMatch[1]);
          // Get the last page to count remaining contributors
          const lastPageResponse = await this.octokit.rest.repos.listContributors({
            owner,
            repo,
            per_page: 100,
            page: lastPage,
          });
          
          return (lastPage - 1) * 100 + lastPageResponse.data.length;
        }
      }
      
      // Fallback: return the count from first page if no pagination
      return response.data.length;
    } catch (error) {
      console.error("Error getting accurate contributor count:", error);
      return 0;
    }
  }

  private async getAccurateIssueCount(owner: string, repo: string): Promise<number> {
    try {
      // Count total issues (open + closed) using pagination
      let totalIssues = 0;
      let page = 1;
      const maxPages = 5; // Check up to 500 issues for performance
      
      while (page <= maxPages) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: "all", // Get both open and closed issues
          per_page: 100,
          page,
        });
        
        totalIssues += response.data.length;
        
        // If we got less than 100 results, we've reached the end
        if (response.data.length < 100) {
          break;
        }
        
        page++;
      }
      
      // If we hit the max pages limit, estimate based on what we found
      if (page > maxPages && totalIssues === maxPages * 100) {
        // We likely have more issues, so estimate conservatively
        return Math.round(totalIssues * 1.2); // Conservative estimate
      }
      
      return totalIssues;
    } catch (error) {
      console.error("Error getting accurate issue count:", error);
      return 0;
    }
  }

}
