import { Card, CardContent } from "@/components/ui/card";
import type { Repository, RepositoryAnalysis } from "@shared/schema";

interface AnalyticsSidebarProps {
  repository: Repository;
  analysis: RepositoryAnalysis;
}

export default function AnalyticsSidebar({ repository, analysis }: AnalyticsSidebarProps) {
  const metrics = analysis.codeMetrics || {};
  const contributors = (analysis.contributors as any[]) || [];
  const commits = (analysis.commits as any[]) || [];
  const issues = (analysis.issues as any[]) || [];

  // Calculate language breakdown from repository data
  const languages = repository.language ? [
    { name: repository.language, percentage: 100, color: "bg-yellow-400" }
  ] : [];

  // Get recent activity from commits
  const recentActivity = commits.slice(0, 3).map((commit: any) => ({
    type: "commit",
    message: commit.commit?.message?.split('\n')[0] || "No message",
    author: commit.commit?.author?.name || "Unknown",
    date: commit.commit?.author?.date || new Date().toISOString(),
  }));

  // Calculate this week's commits
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekCommits = commits.filter((commit: any) => 
    new Date(commit.commit?.author?.date || 0) > oneWeekAgo
  ).length;

  return (
    <div className="w-80 bg-github-surface border-l border-github-border p-6 overflow-y-auto" data-testid="analytics-sidebar">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-github-text mb-4">Repository Analytics</h3>
          
          {/* Commit Activity */}
          <Card className="bg-github-dark border-github-border mb-4">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-github-text mb-3 flex items-center">
                <i className="fas fa-chart-line text-github-blue mr-2"></i>
                Commit Activity
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-github-muted">This Week</span>
                  <span className="text-sm font-mono text-github-text" data-testid="text-weekly-commits">
                    {thisWeekCommits}
                  </span>
                </div>
                <div className="w-full bg-github-border rounded-full h-2">
                  <div 
                    className="bg-github-blue h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((thisWeekCommits / 50) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card className="bg-github-dark border-github-border mb-4">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-github-text mb-3 flex items-center">
                <i className="fas fa-users text-github-purple mr-2"></i>
                Top Contributors
              </h4>
              <div className="space-y-3">
                {contributors.slice(0, 5).map((contributor: any, index: number) => (
                  <div key={contributor.id || index} className="flex items-center space-x-3" data-testid={`contributor-${index}`}>
                    <img 
                      src={contributor.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face"} 
                      alt={contributor.login || "Contributor"} 
                      className="w-8 h-8 rounded-full" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-github-text truncate" data-testid={`contributor-name-${index}`}>
                        {contributor.login || "Unknown"}
                      </p>
                      <p className="text-xs text-github-muted" data-testid={`contributor-commits-${index}`}>
                        {contributor.contributions || 0} commits
                      </p>
                    </div>
                  </div>
                ))}
                {contributors.length === 0 && (
                  <p className="text-xs text-github-muted text-center py-2">No contributor data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Language Breakdown */}
          <Card className="bg-github-dark border-github-border mb-4">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-github-text mb-3 flex items-center">
                <i className="fas fa-code text-github-green mr-2"></i>
                Languages
              </h4>
              <div className="space-y-2">
                {languages.map((language, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${language.color}`}></div>
                      <span className="text-xs text-github-text" data-testid={`language-name-${index}`}>
                        {language.name}
                      </span>
                    </div>
                    <span className="text-xs text-github-muted" data-testid={`language-percentage-${index}`}>
                      {language.percentage}%
                    </span>
                  </div>
                ))}
                {languages.length === 0 && (
                  <p className="text-xs text-github-muted text-center py-2">No language data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-github-dark border-github-border">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium text-github-text mb-3 flex items-center">
                <i className="fas fa-clock text-github-muted mr-2"></i>
                Recent Activity
              </h4>
              <div className="space-y-3 text-xs">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-2" data-testid={`activity-${index}`}>
                    <i className="fas fa-plus-circle text-github-green mt-0.5"></i>
                    <div>
                      <p className="text-github-text">
                        <span className="font-medium" data-testid={`activity-author-${index}`}>
                          {activity.author}
                        </span> committed
                      </p>
                      <p className="text-github-muted truncate" data-testid={`activity-message-${index}`}>
                        {activity.message}
                      </p>
                      <p className="text-github-muted" data-testid={`activity-date-${index}`}>
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-xs text-github-muted text-center py-2">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
