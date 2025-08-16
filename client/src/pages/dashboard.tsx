import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import RepositorySearch from "@/components/repository-search";
import ChatInterface from "@/components/chat-interface";
import AnalyticsSidebar from "@/components/analytics-sidebar";
import { GraphInsights } from "@/components/graph-insights";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Repository, RepositoryAnalysis, GitHubRepository } from "@shared/schema";

export default function Dashboard() {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [repositoryAnalysis, setRepositoryAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const { toast } = useToast();

  const selectRepositoryMutation = useMutation({
    mutationFn: async (githubRepo: GitHubRepository) => {
      const response = await apiRequest("POST", "/api/repositories/select", {
        fullName: githubRepo.full_name,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedRepository(data.repository);
      setRepositoryAnalysis(data.analysis);
      setShowRepoModal(false);
      toast({
        title: "Repository Selected",
        description: `Successfully loaded ${data.repository.fullName}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to select repository",
        variant: "destructive",
      });
    },
  });

  const handleRepositorySelect = (githubRepo: GitHubRepository) => {
    selectRepositoryMutation.mutate(githubRepo);
  };

  return (
    <div className="min-h-screen flex bg-github-dark text-github-text" data-testid="dashboard">
      {/* Sidebar */}
      <div className="w-72 bg-github-surface border-r border-github-border flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-github-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-github-blue to-github-purple rounded-lg flex items-center justify-center">
              <i className="fas fa-code text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-github-text">CodeInsight</h1>
              <p className="text-sm text-github-muted">Intelligent Analysis</p>
            </div>
          </div>
        </div>

        {/* Repository Selector */}
        <div className="p-4 border-b border-github-border">
          <Button 
            onClick={() => setShowRepoModal(true)}
            className="w-full bg-github-blue hover:bg-blue-600 text-white"
            data-testid="button-select-repository"
          >
            <i className="fab fa-github text-lg mr-2"></i>
            Select Repository
          </Button>
          
          {selectedRepository && (
            <div className="mt-4 p-3 bg-github-dark rounded-lg border border-github-border">
              <div className="flex items-center space-x-2">
                <i className="fab fa-github text-github-muted"></i>
                <div>
                  <p className="text-sm font-medium" data-testid="text-repository-name">
                    {selectedRepository.fullName}
                  </p>
                  <p className="text-xs text-github-muted" data-testid="text-repository-description">
                    {selectedRepository.description || "No description"}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-4 text-xs text-github-muted">
                <span data-testid="text-repository-stars">
                  <i className="fas fa-star mr-1"></i>{selectedRepository.stars}
                </span>
                <span data-testid="text-repository-forks">
                  <i className="fas fa-code-branch mr-1"></i>{selectedRepository.forks}
                </span>
                {selectedRepository.language && (
                  <span data-testid="text-repository-language">
                    <i className="fas fa-circle text-yellow-400 mr-1"></i>{selectedRepository.language}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Insights */}
        {repositoryAnalysis && (() => {
          // Calculate this week's commits
          const commits = (repositoryAnalysis.commits as any[]) || [];
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const thisWeekCommits = commits.filter((commit: any) => 
            new Date(commit.commit?.author?.date || 0) > oneWeekAgo
          ).length;
          
          return (
            <div className="p-4 border-b border-github-border">
              <h3 className="text-sm font-semibold text-github-text mb-3">Quick Insights</h3>
              <div className="space-y-2">
                {/* Commit Activity */}
                <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-github-muted flex items-center">
                      <i className="fas fa-chart-line text-github-blue mr-2"></i>
                      This Week
                    </span>
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
                
                <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-github-muted flex items-center">
                      <i className="fas fa-star text-yellow-400 mr-2"></i>
                      Stars
                    </span>
                    <span className="text-sm font-mono text-github-text" data-testid="text-repository-stars">
                      {selectedRepository?.stars?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
                <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-github-muted">Open Issues</span>
                    <span className="text-sm font-mono text-github-text" data-testid="text-open-issues">
                      {(repositoryAnalysis.codeMetrics as any)?.openIssues || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-github-blue/10 text-github-blue border border-github-blue/20">
              <i className="fas fa-comments w-4"></i>
              <span className="text-sm font-medium">Ask Questions</span>
            </div>
          </div>
        </nav>

        {/* App Info */}
        <div className="p-4 border-t border-github-border">
          <div className="text-center">
            <p className="text-sm text-github-muted mb-2">CodeInsight</p>
            <p className="text-xs text-github-muted">Analyzing public repositories with AI</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-github-surface border-b border-github-border px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-github-text">Repository Analysis</h2>
              <p className="text-sm text-github-muted">Ask questions about your codebase and get intelligent insights</p>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <ChatInterface 
              repository={selectedRepository} 
              repositoryAnalysis={repositoryAnalysis}
            />
          </div>
          
          {/* Analytics Sidebar */}
          {repositoryAnalysis && (
            <div className="w-80 border-l border-github-border flex flex-col bg-github-surface">
              <AnalyticsSidebar 
                repository={selectedRepository!}
                analysis={repositoryAnalysis}
              />
              
              {/* Graph Insights */}
              <div className="p-4 border-t border-github-border overflow-y-auto">
                <GraphInsights repositoryFullName={selectedRepository!.fullName} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repository Search Modal */}
      {showRepoModal && (
        <RepositorySearch 
          onSelect={handleRepositorySelect}
          onClose={() => setShowRepoModal(false)}
        />
      )}
    </div>
  );
}
