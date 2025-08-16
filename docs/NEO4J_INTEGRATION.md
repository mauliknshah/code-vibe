# Neo4j Graph Database Integration

## Overview

CodeInsight now includes comprehensive Neo4j graph database integration for advanced repository relationship analysis. Each repository creates a separate graph with semantic relationships between contributors, commits, pull requests, issues, releases, and files.

## Graph Schema

### Node Types

#### Repository
- **Properties**: id, name, full_name, description, language, stars, forks, created_at, updated_at, size, default_branch, license, topics, archived, disabled
- **Namespace**: Each repository has a unique namespace (full_name)

#### Contributor  
- **Properties**: id, login, avatar_url, html_url, type, contributions, site_admin
- **Relationships**: CONTRIBUTES_TO repository, AUTHORED commits, COMMITTED commits, OPENED pull requests, REPORTED issues, ASSIGNED_TO issues, PUBLISHED releases

#### Commit
- **Properties**: sha, message, date, html_url, additions, deletions, total, author_name, author_email, committer_name, committer_email
- **Relationships**: BELONGS_TO repository, PART_OF pull request, MODIFIES files

#### PullRequest
- **Properties**: id, number, title, body, state, created_at, updated_at, closed_at, merged_at, merged, mergeable, additions, deletions, changed_files, base_ref, head_ref, draft
- **Relationships**: TARGETS repository, MERGED_AS commit, SOLVES issues

#### Issue
- **Properties**: id, number, title, body, state, created_at, updated_at, closed_at, labels, milestone, locked, comments_count
- **Relationships**: REPORTED_IN repository, TRACKED_IN milestone

#### Release
- **Properties**: id, tag_name, name, body, draft, prerelease, created_at, published_at, html_url, target_commitish
- **Relationships**: RELEASED_FOR repository, TAGGED_AT commit

#### File
- **Properties**: path, filename, language
- **Relationships**: Modified by commits with change metadata (status, additions, deletions, changes)

#### Milestone
- **Properties**: title, description, state, due_on, created_at
- **Relationships**: Tracks issues

### Semantic Relationships

#### Primary Relationships
- **CONTRIBUTES_TO**: Contributor → Repository (with contributions count)
- **BELONGS_TO**: Commit → Repository
- **TARGETS**: PullRequest → Repository
- **REPORTED_IN**: Issue → Repository
- **RELEASED_FOR**: Release → Repository

#### Authorship Relationships
- **AUTHORED**: Contributor → Commit (with date)
- **COMMITTED**: Contributor → Commit (with date, when different from author)
- **OPENED**: Contributor → PullRequest (with date)
- **REPORTED**: Contributor → Issue (with date)
- **PUBLISHED**: Contributor → Release (with date)

#### Code Relationships
- **PART_OF**: Commit → PullRequest
- **MERGED_AS**: PullRequest → Commit (merge commit)
- **MODIFIES**: Commit → File (with change statistics)
- **TAGGED_AT**: Release → Commit

#### Issue Management
- **SOLVES**: PullRequest → Issue (parsed from PR body)
- **ASSIGNED_TO**: Contributor → Issue
- **TRACKED_IN**: Issue → Milestone

## API Endpoints

### Repository Graph Insights
```
GET /api/repositories/:fullName/graph-insights
```
Returns comprehensive analytics including:
- Top contributors by commits
- Most changed files with statistics
- Release patterns and frequency
- Issue resolution rates
- Pull request merge rates
- Collaboration networks

### Custom Cypher Queries
```
POST /api/graph/query
Content-Type: application/json

{
  "cypher": "MATCH (c:Contributor)-[:AUTHORED]->(commit:Commit) RETURN c.login, count(commit) ORDER BY count(commit) DESC LIMIT 10",
  "parameters": {}
}
```

### Collaboration Network
```
GET /api/repositories/:fullName/collaboration-network
```
Returns contributor interaction patterns and collaboration scores.

### Evolution Timeline
```
GET /api/repositories/:fullName/evolution-timeline
```
Returns chronological timeline of commits, pull requests, issues, and releases.

## Configuration

### Environment Variables
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

### Docker Setup
```bash
# Run Neo4j in Docker
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -d \
  -v $HOME/neo4j/data:/data \
  -v $HOME/neo4j/logs:/logs \
  -v $HOME/neo4j/import:/var/lib/neo4j/import \
  -v $HOME/neo4j/plugins:/plugins \
  --env NEO4J_AUTH=neo4j/your_password \
  neo4j:latest
```

## Usage Examples

### Query Top Contributors
```cypher
MATCH (c:Contributor {namespace: "facebook/react"})-[:AUTHORED]->(commit:Commit)
RETURN c.login as contributor, count(commit) as commits
ORDER BY commits DESC LIMIT 10
```

### Find PR-Issue Relationships
```cypher
MATCH (pr:PullRequest {namespace: "facebook/react"})-[:SOLVES]->(issue:Issue)
RETURN pr.number, pr.title, issue.number, issue.title
```

### Collaboration Patterns
```cypher
MATCH (c1:Contributor {namespace: "facebook/react"})-[:AUTHORED]->(commit:Commit)<-[:PART_OF]-(pr:PullRequest)<-[:OPENED]-(c2:Contributor)
WHERE c1 <> c2
RETURN c1.login, c2.login, count(DISTINCT pr) as collaborations
ORDER BY collaborations DESC
```

### File Evolution
```cypher
MATCH (commit:Commit {namespace: "facebook/react"})-[m:MODIFIES]->(f:File)
WHERE f.filename CONTAINS ".tsx"
RETURN f.path, sum(m.additions) as total_additions, sum(m.deletions) as total_deletions, count(m) as changes
ORDER BY changes DESC LIMIT 20
```

### Release Timeline
```cypher
MATCH (r:Release {namespace: "facebook/react"})
WHERE r.published_at IS NOT NULL
RETURN r.tag_name, r.name, r.published_at, r.prerelease
ORDER BY r.published_at DESC
```

## Performance Considerations

### Indexing
The service automatically creates indexes on key properties:
- Repository: namespace, id
- Contributor: namespace, login
- Commit: namespace, sha
- PullRequest: namespace, id
- Issue: namespace, number
- Release: namespace, id

### Memory Management
- Each repository maintains its own graph namespace
- Old repository graphs are deleted when refreshing data
- Pagination is used for large datasets (300 commits max per repository)

### Rate Limiting
- Neo4j operations are fallback-safe - the application continues without graph data if Neo4j is unavailable
- All graph operations are logged for debugging

## UI Integration

The graph insights are displayed in the repository dashboard with interactive tabs:

1. **Contributors**: Top contributors by commit count
2. **Files**: Most actively changed files with statistics
3. **Metrics**: Issue resolution and PR merge rates with progress bars
4. **Network**: Collaboration patterns and activity timeline

The UI gracefully handles Neo4j unavailability by showing a fallback message.

## Development Notes

- Graph creation is triggered automatically when a repository is selected
- Each repository refresh creates a new graph (old one is deleted first)
- The service uses a singleton pattern for Neo4j connections
- All Cypher queries include the repository namespace for isolation
- Error handling ensures the main application continues working even if Neo4j fails