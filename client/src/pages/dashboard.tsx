import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import RepositorySelector from "@/components/repository-selector";
import ChatInterface from "@/components/chat-interface";
import AnalyticsSidebar from "@/components/analytics-sidebar";
import GitHubAuth from "@/components/github-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Repository, RepositoryAnalysis, User } from "@shared/schema";

export default function Dashboard() {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [repositoryAnalysis, setRepositoryAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const { toast } = useToast();

  // Check user authentication
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!user && !userError;

  // Handle repository selection
  const handleRepositorySelect = (repo: Repository, analysis: RepositoryAnalysis) => {
    setSelectedRepository(repo);
    setRepositoryAnalysis(analysis);
    setShowRepoModal(false);
    toast({
      title: "Repository Selected",
      description: `Successfully loaded ${repo.fullName}`,
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-github-dark text-github-text flex items-center justify-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-github-blue to-github-purple rounded-2xl mx-auto flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-github-muted text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-github-dark text-github-text flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-github-surface border-github-border">
          <CardContent className="p-8">
            <GitHubAuth />
          </CardContent>
        </Card>
      </div>
    );
  }

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
        {repositoryAnalysis && (
          <div className="p-4 border-b border-github-border">
            <h3 className="text-sm font-semibold text-github-text mb-3">Quick Insights</h3>
            <div className="space-y-2">
              <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-github-muted">Total Commits</span>
                  <span className="text-sm font-mono text-github-text" data-testid="text-total-commits">
                    {(repositoryAnalysis.codeMetrics as any)?.totalCommits || 0}
                  </span>
                </div>
              </div>
              <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-github-muted">Contributors</span>
                  <span className="text-sm font-mono text-github-text" data-testid="text-total-contributors">
                    {(repositoryAnalysis.codeMetrics as any)?.totalContributors || 0}
                  </span>
                </div>
              </div>
              <div className="bg-github-dark p-3 rounded-lg border border-github-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-github-muted">Open Issues</span>
                  <span className="text-sm font-mono text-github-text" data-testid="text-total-issues">
                    {(repositoryAnalysis.codeMetrics as any)?.totalIssues || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-github-blue/10 text-github-blue border border-github-blue/20">
              <i className="fas fa-comments w-4"></i>
              <span className="text-sm font-medium">Ask Questions</span>
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-github-border">
          <div className="flex items-center space-x-3">
            <img 
              src={user.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face"} 
              alt="User avatar" 
              className="w-10 h-10 rounded-full" 
              data-testid="img-user-avatar"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-github-text truncate" data-testid="text-user-name">
                {user.username}
              </p>
              <p className="text-xs text-github-muted truncate" data-testid="text-user-email">
                {user.email || "No email"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-github-muted hover:text-github-text"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
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
            <AnalyticsSidebar 
              repository={selectedRepository!}
              analysis={repositoryAnalysis}
            />
          )}
        </div>
      </div>

      {/* Repository Modal */}
      {showRepoModal && (
        <RepositorySelector 
          onSelect={handleRepositorySelect}
          onClose={() => setShowRepoModal(false)}
        />
      )}
    </div>
  );
}
