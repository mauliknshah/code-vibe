import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Network, GitBranch, Users, Activity, Database, Zap } from "lucide-react";

interface GraphInsightsProps {
  repositoryFullName: string;
}

interface Neo4jInsights {
  available: boolean;
  repository?: string;
  insights?: {
    topContributors: Array<{ contributor: string; commits: number }>;
    mostChangedFiles: Array<{ file: string; changes: number; total_additions: number; total_deletions: number }>;
    releasePattern: Array<{ version: string; date: string; prerelease: boolean }>;
    issueStats: Array<{ state: string; count: number }>;
    prStats: Array<{ state: string; merged: boolean; count: number }>;
    collaborationNetwork: Array<{ author: string; pr_opener: string; collaborations: number }>;
  };
}

export function GraphInsights({ repositoryFullName }: GraphInsightsProps) {
  const [activeTab, setActiveTab] = useState("contributors");

  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['graph-insights', repositoryFullName],
    queryFn: async (): Promise<Neo4jInsights> => {
      const response = await fetch(`/api/repositories/${encodeURIComponent(repositoryFullName)}/graph-insights`);
      if (!response.ok) {
        throw new Error('Failed to fetch graph insights');
      }
      return response.json();
    },
    enabled: !!repositoryFullName
  });

  const { data: collaborationData } = useQuery({
    queryKey: ['collaboration-network', repositoryFullName],
    queryFn: async () => {
      const response = await fetch(`/api/repositories/${encodeURIComponent(repositoryFullName)}/collaboration-network`);
      if (!response.ok) {
        throw new Error('Failed to fetch collaboration network');
      }
      return response.json();
    },
    enabled: !!repositoryFullName && graphData?.available
  });

  const { data: timelineData } = useQuery({
    queryKey: ['evolution-timeline', repositoryFullName],
    queryFn: async () => {
      const response = await fetch(`/api/repositories/${encodeURIComponent(repositoryFullName)}/evolution-timeline`);
      if (!response.ok) {
        throw new Error('Failed to fetch evolution timeline');
      }
      return response.json();
    },
    enabled: !!repositoryFullName && graphData?.available
  });

  if (isLoading) {
    return (
      <Card className="w-full" data-testid="graph-insights-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Graph Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !graphData?.available) {
    return (
      <Card className="w-full" data-testid="graph-insights-unavailable">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            Graph Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Neo4j graph database not available</p>
            <p className="text-xs mt-2">
              Graph insights require a Neo4j connection for advanced relationship analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = graphData.insights!;

  // Calculate some derived metrics
  const totalIssues = insights.issueStats.reduce((sum, stat) => sum + stat.count, 0);
  const closedIssues = insights.issueStats.find(s => s.state === 'closed')?.count || 0;
  const issueResolutionRate = totalIssues > 0 ? Math.round((closedIssues / totalIssues) * 100) : 0;

  const totalPRs = insights.prStats.reduce((sum, stat) => sum + stat.count, 0);
  const mergedPRs = insights.prStats.filter(s => s.merged).reduce((sum, stat) => sum + stat.count, 0);
  const prMergeRate = totalPRs > 0 ? Math.round((mergedPRs / totalPRs) * 100) : 0;

  return (
    <Card className="w-full" data-testid="graph-insights">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-blue-500" />
          Graph Analysis
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            Neo4j
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contributors" data-testid="tab-contributors">
              <Users className="h-4 w-4 mr-1" />
              Contributors
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">
              <GitBranch className="h-4 w-4 mr-1" />
              Files
            </TabsTrigger>
            <TabsTrigger value="metrics" data-testid="tab-metrics">
              <Activity className="h-4 w-4 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="network" data-testid="tab-network">
              <Network className="h-4 w-4 mr-1" />
              Network
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contributors" className="space-y-4" data-testid="contributors-content">
            <div>
              <h4 className="font-medium mb-3">Top Contributors by Commits</h4>
              <div className="space-y-2">
                {insights.topContributors.slice(0, 8).map((contributor, index) => (
                  <div key={contributor.contributor} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium" data-testid={`contributor-${index}`}>
                        {contributor.contributor}
                      </span>
                    </div>
                    <Badge variant="outline" data-testid={`contributor-commits-${index}`}>
                      {contributor.commits} commits
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4" data-testid="files-content">
            <div>
              <h4 className="font-medium mb-3">Most Active Files</h4>
              <div className="space-y-3">
                {insights.mostChangedFiles.slice(0, 6).map((file, index) => (
                  <div key={file.file} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-blue-600 truncate" data-testid={`file-path-${index}`}>
                        {file.file.split('/').pop()}
                      </span>
                      <Badge variant="outline" data-testid={`file-changes-${index}`}>
                        {file.changes} changes
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="text-green-600" data-testid={`file-additions-${index}`}>
                        +{file.total_additions}
                      </span>
                      <span className="text-red-600" data-testid={`file-deletions-${index}`}>
                        -{file.total_deletions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4" data-testid="metrics-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-2">Issue Resolution Rate</h5>
                <div className="space-y-2">
                  <Progress value={issueResolutionRate} className="h-2" data-testid="issue-resolution-progress" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{issueResolutionRate}% resolved</span>
                    <span>{totalIssues} total issues</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium mb-2">PR Merge Rate</h5>
                <div className="space-y-2">
                  <Progress value={prMergeRate} className="h-2" data-testid="pr-merge-progress" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{prMergeRate}% merged</span>
                    <span>{totalPRs} total PRs</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium mb-3">Recent Releases</h5>
              <div className="space-y-2">
                {insights.releasePattern.slice(0, 5).map((release, index) => (
                  <div key={release.version} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono" data-testid={`release-version-${index}`}>
                        {release.version}
                      </span>
                      {release.prerelease && (
                        <Badge variant="secondary">pre-release</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`release-date-${index}`}>
                      {new Date(release.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-4" data-testid="network-content">
            {collaborationData?.available && (
              <div>
                <h4 className="font-medium mb-3">Collaboration Network</h4>
                <div className="space-y-2">
                  {collaborationData.collaborations.slice(0, 6).map((collab: any, index: number) => (
                    <div key={`${collab.contributor1}-${collab.contributor2}`} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" data-testid={`collab-contributor1-${index}`}>
                          {collab.contributor1}
                        </span>
                        <span className="text-xs text-muted-foreground">↔</span>
                        <span className="text-sm" data-testid={`collab-contributor2-${index}`}>
                          {collab.contributor2}
                        </span>
                      </div>
                      <Badge variant="outline" data-testid={`collab-score-${index}`}>
                        {collab.interaction_score} interactions
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {timelineData?.available && (
              <div>
                <Separator className="my-4" />
                <h4 className="font-medium mb-3">Recent Activity Timeline</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {timelineData.timeline.slice(0, 10).map((event: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-2 border rounded text-sm">
                      <div className="flex-shrink-0">
                        {event.event_type === 'commit' && <GitBranch className="h-4 w-4 text-blue-500" />}
                        {event.event_type === 'pull_request' && <Network className="h-4 w-4 text-green-500" />}
                        {event.event_type === 'issue' && <Activity className="h-4 w-4 text-orange-500" />}
                        {event.event_type === 'release' && <Zap className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" data-testid={`timeline-description-${index}`}>
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize" data-testid={`timeline-type-${index}`}>
                            {event.event_type.replace('_', ' ')}
                          </span>
                          {event.actor && (
                            <>
                              <span>•</span>
                              <span data-testid={`timeline-actor-${index}`}>{event.actor}</span>
                            </>
                          )}
                          <span>•</span>
                          <span data-testid={`timeline-date-${index}`}>
                            {new Date(event.commit_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}