import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface CommitData {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    status: string;
  }>;
}

interface CodeOwnershipChartProps {
  commits: CommitData[];
  className?: string;
}

export default function CodeOwnershipChart({ commits, className = "" }: CodeOwnershipChartProps) {
  const analysisData = useMemo(() => {
    if (!commits || commits.length === 0) {
      return {
        ownershipData: [],
        complexityTrend: [],
        fileTypeDistribution: [],
        topContributors: []
      };
    }

    // Process commits for ownership analysis
    const authorStats = new Map<string, {
      commits: number;
      additions: number;
      deletions: number;
      filesChanged: Set<string>;
      complexity: number;
    }>();

    const monthlyComplexity = new Map<string, {
      month: string;
      totalChanges: number;
      commitCount: number;
      avgComplexity: number;
    }>();

    const fileTypeStats = new Map<string, number>();

    commits.forEach(commit => {
      const author = commit.commit.author.name || 'Unknown';
      const date = new Date(commit.commit.author.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Initialize author stats
      if (!authorStats.has(author)) {
        authorStats.set(author, {
          commits: 0,
          additions: 0,
          deletions: 0,
          filesChanged: new Set(),
          complexity: 0
        });
      }

      const authorStat = authorStats.get(author)!;
      authorStat.commits += 1;
      
      // Process commit stats and files
      if (commit.stats) {
        authorStat.additions += commit.stats.additions;
        authorStat.deletions += commit.stats.deletions;
        authorStat.complexity += commit.stats.total;
      }

      if (commit.files) {
        commit.files.forEach(file => {
          authorStat.filesChanged.add(file.filename);
          
          // Track file types for distribution
          const ext = file.filename.split('.').pop()?.toLowerCase() || 'unknown';
          fileTypeStats.set(ext, (fileTypeStats.get(ext) || 0) + file.changes);
        });
      }

      // Monthly complexity tracking
      const totalChanges = commit.stats?.total || 0;
      if (!monthlyComplexity.has(monthKey)) {
        monthlyComplexity.set(monthKey, {
          month: monthKey,
          totalChanges: 0,
          commitCount: 0,
          avgComplexity: 0
        });
      }
      
      const monthStat = monthlyComplexity.get(monthKey)!;
      monthStat.totalChanges += totalChanges;
      monthStat.commitCount += 1;
      monthStat.avgComplexity = monthStat.totalChanges / monthStat.commitCount;
    });

    // Convert to chart data
    const ownershipData = Array.from(authorStats.entries())
      .map(([author, stats]) => ({
        author: author.length > 15 ? author.substring(0, 15) + '...' : author,
        commits: stats.commits,
        linesChanged: stats.additions + stats.deletions,
        filesOwned: stats.filesChanged.size,
        complexity: Math.round(stats.complexity / stats.commits) || 0
      }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 8);

    const complexityTrend = Array.from(monthlyComplexity.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months
      .map(stat => ({
        month: stat.month,
        avgComplexity: Math.round(stat.avgComplexity),
        commits: stat.commitCount
      }));

    const fileTypeDistribution = Array.from(fileTypeStats.entries())
      .map(([type, changes]) => ({
        type,
        changes,
        percentage: Math.round((changes / Array.from(fileTypeStats.values()).reduce((a, b) => a + b, 0)) * 100)
      }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 6);

    const topContributors = ownershipData.slice(0, 5).map((contributor, index) => ({
      ...contributor,
      rank: index + 1
    }));

    return {
      ownershipData,
      complexityTrend,
      fileTypeDistribution,
      topContributors
    };
  }, [commits]);

  const colors = ['#0366d6', '#28a745', '#ffd33d', '#f66a0a', '#6f42c1', '#d73a49'];

  if (!commits || commits.length === 0) {
    return (
      <Card className={`bg-github-surface border-github-border ${className}`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-github-text flex items-center">
            <i className="fas fa-code-branch text-github-blue mr-2"></i>
            Code Ownership & Complexity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-github-muted">
            <i className="fas fa-chart-bar text-2xl mb-3"></i>
            <p className="text-sm">No commit data available for analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Code Ownership Distribution */}
      <Card className="bg-github-surface border-github-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-github-text flex items-center">
            <i className="fas fa-users text-github-blue mr-2"></i>
            Code Ownership Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysisData.ownershipData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis 
                  dataKey="author" 
                  tick={{ fontSize: 11, fill: '#7d8590' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: '#7d8590' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161b22', 
                    border: '1px solid #30363d',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="commits" fill="#0366d6" name="Commits" />
                <Bar dataKey="filesOwned" fill="#28a745" name="Files Owned" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Complexity Trend */}
      <Card className="bg-github-surface border-github-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-github-text flex items-center">
            <i className="fas fa-chart-line text-github-purple mr-2"></i>
            Complexity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysisData.complexityTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: '#7d8590' }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#7d8590' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161b22', 
                    border: '1px solid #30363d',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgComplexity" 
                  stroke="#6f42c1" 
                  strokeWidth={2}
                  dot={{ fill: '#6f42c1', strokeWidth: 2, r: 3 }}
                  name="Avg Complexity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* File Type Distribution */}
      <Card className="bg-github-surface border-github-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-github-text flex items-center">
            <i className="fas fa-file-code text-github-green mr-2"></i>
            File Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysisData.fileTypeDistribution.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span className="text-github-text">.{item.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-github-muted">{item.changes} changes</span>
                  <span className="text-github-text font-medium">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Contributors Summary */}
      <Card className="bg-github-surface border-github-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-github-text flex items-center">
            <i className="fas fa-trophy text-github-yellow mr-2"></i>
            Top Contributors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysisData.topContributors.map((contributor) => (
              <div key={contributor.author} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center space-x-2">
                  <span className="w-4 h-4 bg-github-blue rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                    {contributor.rank}
                  </span>
                  <span className="text-github-text">{contributor.author}</span>
                </div>
                <div className="flex items-center space-x-3 text-github-muted">
                  <span>{contributor.commits}c</span>
                  <span>{contributor.filesOwned}f</span>
                  <span className="text-github-text">{contributor.linesChanged}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}