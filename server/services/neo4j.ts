import neo4j from 'neo4j-driver';

type Driver = any;
type Session = any;

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
}

export class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
  }

  static getInstance(config?: Neo4jConfig): Neo4jService {
    if (!Neo4jService.instance) {
      if (!config) {
        throw new Error('Neo4j configuration required for first initialization');
      }
      Neo4jService.instance = new Neo4jService(config);
    }
    return Neo4jService.instance;
  }

  async testConnection(): Promise<boolean> {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      return true;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  async createRepositoryGraph(repositoryData: any): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite(async (tx: any) => {
        // Create repository namespace (separate graph per repo)
        const repoId = repositoryData.repository.id;
        const repoFullName = repositoryData.repository.full_name;

        // 1. Create Repository node
        await tx.run(`
          MERGE (repo:Repository {id: $repoId, namespace: $namespace})
          SET repo.name = $name,
              repo.full_name = $full_name,
              repo.description = $description,
              repo.language = $language,
              repo.stars = $stars,
              repo.forks = $forks,
              repo.html_url = $html_url,
              repo.created_at = datetime($created_at),
              repo.updated_at = datetime($updated_at),
              repo.size = $size,
              repo.default_branch = $default_branch,
              repo.license = $license,
              repo.topics = $topics,
              repo.archived = $archived,
              repo.disabled = $disabled
        `, {
          repoId: repoId,
          namespace: repoFullName,
          name: repositoryData.repository.name,
          full_name: repoFullName,
          description: repositoryData.repository.description || '',
          language: repositoryData.repository.language || 'Unknown',
          stars: repositoryData.repository.stargazers_count || 0,
          forks: repositoryData.repository.forks_count || 0,
          html_url: repositoryData.repository.html_url,
          created_at: repositoryData.repository.created_at,
          updated_at: repositoryData.repository.updated_at,
          size: repositoryData.repository.size || 0,
          default_branch: repositoryData.repository.default_branch || 'main',
          license: repositoryData.repository.license?.name || null,
          topics: repositoryData.repository.topics || [],
          archived: repositoryData.repository.archived || false,
          disabled: repositoryData.repository.disabled || false
        });

        // 2. Create Contributors and relationships
        for (const contributor of repositoryData.contributors || []) {
          await tx.run(`
            MERGE (contributor:Contributor {id: $contributorId, namespace: $namespace})
            SET contributor.login = $login,
                contributor.avatar_url = $avatar_url,
                contributor.html_url = $html_url,
                contributor.type = $type,
                contributor.contributions = $contributions,
                contributor.site_admin = $site_admin
            
            WITH contributor
            MATCH (repo:Repository {id: $repoId, namespace: $namespace})
            MERGE (contributor)-[:CONTRIBUTES_TO {contributions: $contributions}]->(repo)
          `, {
            contributorId: contributor.id,
            namespace: repoFullName,
            login: contributor.login,
            avatar_url: contributor.avatar_url,
            html_url: contributor.html_url,
            type: contributor.type || 'User',
            contributions: contributor.contributions || 0,
            site_admin: contributor.site_admin || false,
            repoId: repoId
          });
        }

        // 3. Create Commits and relationships
        for (const commit of repositoryData.commits || []) {
          const authorLogin = commit.author?.login || commit.commit?.author?.name || 'unknown';
          const committerLogin = commit.committer?.login || commit.commit?.committer?.name || 'unknown';

          await tx.run(`
            MERGE (commit:Commit {sha: $sha, namespace: $namespace})
            SET commit.message = $message,
                commit.date = datetime($date),
                commit.html_url = $html_url,
                commit.additions = $additions,
                commit.deletions = $deletions,
                commit.total = $total,
                commit.author_name = $author_name,
                commit.author_email = $author_email,
                commit.committer_name = $committer_name,
                commit.committer_email = $committer_email
            
            WITH commit
            MATCH (repo:Repository {id: $repoId, namespace: $namespace})
            MERGE (commit)-[:BELONGS_TO]->(repo)
          `, {
            sha: commit.sha,
            namespace: repoFullName,
            message: commit.commit?.message || '',
            date: commit.commit?.author?.date || commit.commit?.committer?.date,
            html_url: commit.html_url,
            additions: commit.stats?.additions || 0,
            deletions: commit.stats?.deletions || 0,
            total: commit.stats?.total || 0,
            author_name: commit.commit?.author?.name || '',
            author_email: commit.commit?.author?.email || '',
            committer_name: commit.commit?.committer?.name || '',
            committer_email: commit.commit?.committer?.email || '',
            repoId: repoId
          });

          // Link commits to contributors (AUTHORED and COMMITTED relationships)
          if (commit.author?.login) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $authorLogin, namespace: $namespace})
              MATCH (commit:Commit {sha: $sha, namespace: $namespace})
              MERGE (contributor)-[:AUTHORED {date: datetime($date)}]->(commit)
            `, {
              authorLogin: commit.author.login,
              sha: commit.sha,
              namespace: repoFullName,
              date: commit.commit?.author?.date
            });
          }

          if (commit.committer?.login && commit.committer.login !== commit.author?.login) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $committerLogin, namespace: $namespace})
              MATCH (commit:Commit {sha: $sha, namespace: $namespace})
              MERGE (contributor)-[:COMMITTED {date: datetime($date)}]->(commit)
            `, {
              committerLogin: commit.committer.login,
              sha: commit.sha,
              namespace: repoFullName,
              date: commit.commit?.committer?.date
            });
          }
        }

        // 4. Create Pull Requests and relationships
        for (const pr of repositoryData.pullRequests || []) {
          await tx.run(`
            MERGE (pr:PullRequest {id: $prId, namespace: $namespace})
            SET pr.number = $number,
                pr.title = $title,
                pr.body = $body,
                pr.state = $state,
                pr.created_at = datetime($created_at),
                pr.updated_at = datetime($updated_at),
                pr.closed_at = $closed_at,
                pr.merged_at = $merged_at,
                pr.html_url = $html_url,
                pr.merged = $merged,
                pr.mergeable = $mergeable,
                pr.additions = $additions,
                pr.deletions = $deletions,
                pr.changed_files = $changed_files,
                pr.base_ref = $base_ref,
                pr.head_ref = $head_ref,
                pr.draft = $draft
            
            WITH pr
            MATCH (repo:Repository {id: $repoId, namespace: $namespace})
            MERGE (pr)-[:TARGETS]->(repo)
          `, {
            prId: pr.id,
            namespace: repoFullName,
            number: pr.number,
            title: pr.title || '',
            body: pr.body || '',
            state: pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at ? `datetime("${pr.closed_at}")` : null,
            merged_at: pr.merged_at ? `datetime("${pr.merged_at}")` : null,
            html_url: pr.html_url,
            merged: pr.merged || false,
            mergeable: pr.mergeable,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            changed_files: pr.changed_files || 0,
            base_ref: pr.base?.ref || '',
            head_ref: pr.head?.ref || '',
            draft: pr.draft || false,
            repoId: repoId
          });

          // Link PR to author
          if (pr.user?.login) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $userLogin, namespace: $namespace})
              MATCH (pr:PullRequest {id: $prId, namespace: $namespace})
              MERGE (contributor)-[:OPENED {date: datetime($created_at)}]->(pr)
            `, {
              userLogin: pr.user.login,
              prId: pr.id,
              namespace: repoFullName,
              created_at: pr.created_at
            });
          }

          // Link PR to merge commit
          if (pr.merge_commit_sha) {
            await tx.run(`
              MATCH (commit:Commit {sha: $sha, namespace: $namespace})
              MATCH (pr:PullRequest {id: $prId, namespace: $namespace})
              MERGE (pr)-[:MERGED_AS]->(commit)
            `, {
              sha: pr.merge_commit_sha,
              prId: pr.id,
              namespace: repoFullName
            });
          }
        }

        // 5. Create Issues and relationships
        for (const issue of repositoryData.issues || []) {
          // Skip pull requests (they appear in issues API)
          if (issue.pull_request) continue;

          await tx.run(`
            MERGE (issue:Issue {id: $issueId, namespace: $namespace})
            SET issue.number = $number,
                issue.title = $title,
                issue.body = $body,
                issue.state = $state,
                issue.created_at = datetime($created_at),
                issue.updated_at = datetime($updated_at),
                issue.closed_at = $closed_at,
                issue.html_url = $html_url,
                issue.labels = $labels,
                issue.milestone = $milestone,
                issue.locked = $locked,
                issue.comments_count = $comments_count
            
            WITH issue
            MATCH (repo:Repository {id: $repoId, namespace: $namespace})
            MERGE (issue)-[:REPORTED_IN]->(repo)
          `, {
            issueId: issue.id,
            namespace: repoFullName,
            number: issue.number,
            title: issue.title || '',
            body: issue.body || '',
            state: issue.state,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            closed_at: issue.closed_at ? `datetime("${issue.closed_at}")` : null,
            html_url: issue.html_url,
            labels: issue.labels?.map((l: any) => l.name) || [],
            milestone: issue.milestone?.title || null,
            locked: issue.locked || false,
            comments_count: issue.comments || 0,
            repoId: repoId
          });

          // Link issue to reporter
          if (issue.user?.login) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $userLogin, namespace: $namespace})
              MATCH (issue:Issue {id: $issueId, namespace: $namespace})
              MERGE (contributor)-[:REPORTED {date: datetime($created_at)}]->(issue)
            `, {
              userLogin: issue.user.login,
              issueId: issue.id,
              namespace: repoFullName,
              created_at: issue.created_at
            });
          }

          // Link issue to assignees
          for (const assignee of issue.assignees || []) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $assigneeLogin, namespace: $namespace})
              MATCH (issue:Issue {id: $issueId, namespace: $namespace})
              MERGE (contributor)-[:ASSIGNED_TO]->(issue)
            `, {
              assigneeLogin: assignee.login,
              issueId: issue.id,
              namespace: repoFullName
            });
          }
        }

        // 6. Create Releases and relationships
        for (const release of repositoryData.releases || []) {
          await tx.run(`
            MERGE (release:Release {id: $releaseId, namespace: $namespace})
            SET release.tag_name = $tag_name,
                release.name = $name,
                release.body = $body,
                release.draft = $draft,
                release.prerelease = $prerelease,
                release.created_at = datetime($created_at),
                release.published_at = $published_at,
                release.html_url = $html_url,
                release.tarball_url = $tarball_url,
                release.zipball_url = $zipball_url,
                release.target_commitish = $target_commitish
            
            WITH release
            MATCH (repo:Repository {id: $repoId, namespace: $namespace})
            MERGE (release)-[:RELEASED_FOR]->(repo)
          `, {
            releaseId: release.id,
            namespace: repoFullName,
            tag_name: release.tag_name,
            name: release.name || release.tag_name,
            body: release.body || '',
            draft: release.draft || false,
            prerelease: release.prerelease || false,
            created_at: release.created_at,
            published_at: release.published_at ? `datetime("${release.published_at}")` : null,
            html_url: release.html_url,
            tarball_url: release.tarball_url,
            zipball_url: release.zipball_url,
            target_commitish: release.target_commitish || 'main',
            repoId: repoId
          });

          // Link release to author
          if (release.author?.login) {
            await tx.run(`
              MATCH (contributor:Contributor {login: $authorLogin, namespace: $namespace})
              MATCH (release:Release {id: $releaseId, namespace: $namespace})
              MERGE (contributor)-[:PUBLISHED {date: datetime($published_at)}]->(release)
            `, {
              authorLogin: release.author.login,
              releaseId: release.id,
              namespace: repoFullName,
              published_at: release.published_at || release.created_at
            });
          }

          // Link release to target commit
          if (release.target_commitish) {
            await tx.run(`
              MATCH (commit:Commit {sha: $sha, namespace: $namespace})
              MATCH (release:Release {id: $releaseId, namespace: $namespace})
              MERGE (release)-[:TAGGED_AT]->(commit)
            `, {
              sha: release.target_commitish,
              releaseId: release.id,
              namespace: repoFullName
            });
          }
        }

        // 7. Create additional semantic relationships
        await this.createSemanticRelationships(tx, repoFullName, repositoryData);
      });

      console.log(`✅ Successfully created graph for repository: ${repositoryData.repository.full_name}`);
    } catch (error) {
      console.error('Error creating repository graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private async createSemanticRelationships(tx: any, namespace: string, repositoryData: any): Promise<void> {
    // Link PRs to issues they close (parse "closes #123" from PR body)
    for (const pr of repositoryData.pullRequests || []) {
      if (pr.body) {
        const closesPattern = /(?:closes|fixes|resolves)\s+#(\d+)/gi;
        let match;
        while ((match = closesPattern.exec(pr.body)) !== null) {
          const issueNumber = parseInt(match[1]);
          await tx.run(`
            MATCH (pr:PullRequest {id: $prId, namespace: $namespace})
            MATCH (issue:Issue {number: $issueNumber, namespace: $namespace})
            MERGE (pr)-[:SOLVES]->(issue)
          `, {
            prId: pr.id,
            issueNumber: issueNumber,
            namespace: namespace
          });
        }
      }
    }

    // Link commits to PRs (commits that are part of a PR)
    for (const pr of repositoryData.pullRequests || []) {
      if (pr.head?.sha) {
        await tx.run(`
          MATCH (commit:Commit {sha: $sha, namespace: $namespace})
          MATCH (pr:PullRequest {id: $prId, namespace: $namespace})
          MERGE (commit)-[:PART_OF]->(pr)
        `, {
          sha: pr.head.sha,
          prId: pr.id,
          namespace: namespace
        });
      }
    }

    // Create file change relationships (if we have file data)
    for (const commit of repositoryData.commits || []) {
      if (commit.files) {
        for (const file of commit.files) {
          await tx.run(`
            MERGE (f:File {path: $path, namespace: $namespace})
            SET f.filename = $filename,
                f.language = $language
            
            WITH f
            MATCH (commit:Commit {sha: $sha, namespace: $namespace})
            MERGE (commit)-[:MODIFIES {
              status: $status,
              additions: $additions,
              deletions: $deletions,
              changes: $changes
            }]->(f)
          `, {
            path: file.filename,
            namespace: namespace,
            filename: file.filename.split('/').pop(),
            language: this.getFileLanguage(file.filename),
            sha: commit.sha,
            status: file.status,
            additions: file.additions || 0,
            deletions: file.deletions || 0,
            changes: file.changes || 0
          });
        }
      }
    }

    // Create milestone relationships
    for (const issue of repositoryData.issues || []) {
      if (issue.milestone) {
        await tx.run(`
          MERGE (milestone:Milestone {title: $title, namespace: $namespace})
          SET milestone.description = $description,
              milestone.state = $state,
              milestone.due_on = $due_on,
              milestone.created_at = datetime($created_at)
          
          WITH milestone
          MATCH (issue:Issue {id: $issueId, namespace: $namespace})
          MERGE (issue)-[:TRACKED_IN]->(milestone)
        `, {
          title: issue.milestone.title,
          namespace: namespace,
          description: issue.milestone.description || '',
          state: issue.milestone.state,
          due_on: issue.milestone.due_on ? `datetime("${issue.milestone.due_on}")` : null,
          created_at: issue.milestone.created_at,
          issueId: issue.id
        });
      }
    }
  }

  private getFileLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'JavaScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'sql': 'SQL',
      'md': 'Markdown',
      'json': 'JSON',
      'xml': 'XML',
      'yml': 'YAML',
      'yaml': 'YAML'
    };
    return languageMap[ext || ''] || 'Unknown';
  }

  async queryGraph(cypher: string, parameters: any = {}): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(cypher, parameters);
      return result.records.map((record: any) => record.toObject());
    } catch (error) {
      console.error('Error executing Cypher query:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getRepositoryInsights(namespace: string): Promise<any> {
    const queries = {
      // Top contributors by commits
      topContributors: `
        MATCH (c:Contributor {namespace: $namespace})-[:AUTHORED]->(commit:Commit)
        RETURN c.login as contributor, count(commit) as commits
        ORDER BY commits DESC LIMIT 10
      `,
      
      // Most active files
      mostChangedFiles: `
        MATCH (commit:Commit {namespace: $namespace})-[m:MODIFIES]->(f:File)
        RETURN f.path as file, count(m) as changes, sum(m.additions) as total_additions, sum(m.deletions) as total_deletions
        ORDER BY changes DESC LIMIT 10
      `,
      
      // Release frequency
      releasePattern: `
        MATCH (r:Release {namespace: $namespace})
        WHERE r.published_at IS NOT NULL
        RETURN r.tag_name as version, r.published_at as date, r.prerelease as prerelease
        ORDER BY r.published_at DESC
      `,
      
      // Issue resolution rate
      issueStats: `
        MATCH (i:Issue {namespace: $namespace})
        RETURN i.state as state, count(i) as count
      `,
      
      // PR merge rate
      prStats: `
        MATCH (pr:PullRequest {namespace: $namespace})
        RETURN pr.state as state, pr.merged as merged, count(pr) as count
      `,
      
      // Collaboration patterns
      collaborationNetwork: `
        MATCH (c1:Contributor {namespace: $namespace})-[:AUTHORED]->(commit:Commit)<-[:PART_OF]-(pr:PullRequest)<-[:OPENED]-(c2:Contributor)
        WHERE c1 <> c2
        RETURN c1.login as author, c2.login as pr_opener, count(DISTINCT pr) as collaborations
        ORDER BY collaborations DESC LIMIT 20
      `
    };

    const results: any = {};
    for (const [key, query] of Object.entries(queries)) {
      results[key] = await this.queryGraph(query, { namespace });
    }

    return results;
  }

  async deleteRepositoryGraph(namespace: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite(async (tx: any) => {
        await tx.run(`
          MATCH (n {namespace: $namespace})
          DETACH DELETE n
        `, { namespace });
      });
      console.log(`🗑️ Deleted graph for repository: ${namespace}`);
    } catch (error) {
      console.error('Error deleting repository graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}