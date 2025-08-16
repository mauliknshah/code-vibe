import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Repository, RepositoryAnalysis, GitHubRepository } from "@shared/schema";

interface RepositorySelectorProps {
  onSelect: (repository: Repository, analysis: RepositoryAnalysis) => void;
  onClose: () => void;
}

export default function RepositorySelector({ onSelect, onClose }: RepositorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repositories, isLoading } = useQuery<GitHubRepository[]>({
    queryKey: ["/api/repositories"],
  });

  const selectRepositoryMutation = useMutation({
    mutationFn: async (githubId: number) => {
      const response = await apiRequest("POST", `/api/repositories/${githubId}/select`);
      return response.json();
    },
    onSuccess: (data) => {
      onSelect(data.repository, data.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to select repository",
        variant: "destructive",
      });
    },
  });

  const filteredRepositories = repositories?.filter(repo => {
    const matchesSearch = repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    if (filter === "private") return repo.private && matchesSearch;
    if (filter === "public") return !repo.private && matchesSearch;
    return matchesSearch;
  }) || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="modal-repository-selector">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-github-surface border-github-border">
        <div className="flex items-center justify-between p-6 border-b border-github-border">
          <h3 className="text-xl font-semibold text-github-text">Select Repository</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-github-muted hover:text-github-text"
            data-testid="button-close-modal"
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>
        
        <CardContent className="p-6">
          {/* Search and Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-github-muted"></i>
              <Input
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-github-dark border-github-border text-github-text placeholder-github-muted"
                data-testid="input-search-repositories"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-github-dark border-github-border text-github-text" data-testid="select-repository-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-github-dark border-github-border">
                <SelectItem value="all">All repositories</SelectItem>
                <SelectItem value="public">Public only</SelectItem>
                <SelectItem value="private">Private only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Repository List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full bg-github-dark" />
                ))}
              </div>
            ) : filteredRepositories.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-search text-4xl text-github-muted mb-4"></i>
                <p className="text-github-muted">No repositories found</p>
              </div>
            ) : (
              filteredRepositories.map((repo) => (
                <div 
                  key={repo.id} 
                  className="p-4 bg-github-dark rounded-lg border border-github-border hover:border-github-blue/50 transition-all"
                  data-testid={`card-repository-${repo.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-github-text" data-testid={`text-repository-name-${repo.id}`}>
                          {repo.full_name}
                        </h4>
                        <span className="px-2 py-1 text-xs bg-github-border text-github-muted rounded">
                          {repo.private ? "Private" : "Public"}
                        </span>
                      </div>
                      <p className="text-sm text-github-muted mb-3" data-testid={`text-repository-description-${repo.id}`}>
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-github-muted">
                        <span data-testid={`text-repository-stars-${repo.id}`}>
                          <i className="fas fa-star mr-1 text-yellow-400"></i>{repo.stargazers_count}
                        </span>
                        <span data-testid={`text-repository-forks-${repo.id}`}>
                          <i className="fas fa-code-branch mr-1"></i>{repo.forks_count}
                        </span>
                        {repo.language && (
                          <span data-testid={`text-repository-language-${repo.id}`}>
                            <i className="fas fa-circle text-yellow-400 mr-1"></i>{repo.language}
                          </span>
                        )}
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => selectRepositoryMutation.mutate(repo.id)}
                      disabled={selectRepositoryMutation.isPending}
                      className="bg-github-blue hover:bg-blue-600 text-white"
                      data-testid={`button-select-repository-${repo.id}`}
                    >
                      {selectRepositoryMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        "Select"
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
