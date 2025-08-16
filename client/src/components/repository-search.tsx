import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GitHubRepository } from "@shared/schema";

interface RepositorySearchProps {
  onSelect: (repository: GitHubRepository) => void;
  onClose: () => void;
}

export default function RepositorySearch({ onSelect, onClose }: RepositorySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<'stars' | 'updated' | 'forks'>('stars');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: repositories, isLoading, error } = useQuery<GitHubRepository[]>({
    queryKey: ["/api/repositories/search", debouncedSearchTerm, sort],
    enabled: debouncedSearchTerm.length >= 3,
    queryFn: async () => {
      const response = await fetch(`/api/repositories/search?q=${encodeURIComponent(debouncedSearchTerm)}&sort=${sort}`);
      if (!response.ok) {
        throw new Error('Failed to search repositories');
      }
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.length >= 3) {
      setDebouncedSearchTerm(searchTerm);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="modal-repository-search">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-github-surface border-github-border">
        <div className="flex items-center justify-between p-6 border-b border-github-border">
          <h3 className="text-xl font-semibold text-github-text">Search Public Repositories</h3>
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
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-github-muted"></i>
              <Input
                type="text"
                placeholder="Search repositories (e.g., 'react', 'tensorflow', 'microsoft/vscode')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-github-dark border-github-border text-github-text placeholder-github-muted"
                data-testid="input-search-repositories"
              />
            </div>
            <Select value={sort} onValueChange={(value: 'stars' | 'updated' | 'forks') => setSort(value)}>
              <SelectTrigger className="w-48 bg-github-dark border-github-border text-github-text" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-github-dark border-github-border">
                <SelectItem value="stars">Most stars</SelectItem>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="forks">Most forks</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={searchTerm.length < 3}
              className="bg-github-blue hover:bg-blue-600 text-white"
              data-testid="button-search"
            >
              Search
            </Button>
          </form>

          {/* Search Help */}
          {searchTerm.length === 0 && (
            <div className="text-center py-12">
              <i className="fab fa-github text-6xl text-github-muted mb-4"></i>
              <h4 className="text-lg font-medium text-github-text mb-2">Search Public Repositories</h4>
              <p className="text-github-muted mb-6 max-w-2xl mx-auto">
                Search for any public repository on GitHub. You can search by name, description, or use specific repository names like "owner/repo".
              </p>
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
                <div className="p-3 bg-github-dark rounded-lg border border-github-border">
                  <p className="font-medium text-github-text mb-1">By Topic</p>
                  <p className="text-github-muted">react, vue, machine-learning</p>
                </div>
                <div className="p-3 bg-github-dark rounded-lg border border-github-border">
                  <p className="font-medium text-github-text mb-1">By Language</p>
                  <p className="text-github-muted">javascript, python, rust</p>
                </div>
                <div className="p-3 bg-github-dark rounded-lg border border-github-border">
                  <p className="font-medium text-github-text mb-1">Specific Repo</p>
                  <p className="text-github-muted">facebook/react</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Requirements */}
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <div className="text-center py-8">
              <i className="fas fa-keyboard text-4xl text-github-muted mb-4"></i>
              <p className="text-github-muted">Please enter at least 3 characters to search</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-github-dark" />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
              <p className="text-red-400 mb-2">Failed to search repositories</p>
              <p className="text-github-muted text-sm">Please try again with a different search term</p>
            </div>
          )}

          {/* Results */}
          {repositories && repositories.length === 0 && debouncedSearchTerm.length >= 3 && !isLoading && (
            <div className="text-center py-8">
              <i className="fas fa-search text-4xl text-github-muted mb-4"></i>
              <p className="text-github-muted">No repositories found for "{debouncedSearchTerm}"</p>
            </div>
          )}

          {repositories && repositories.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {repositories.map((repo) => (
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
                          <i className="fas fa-star mr-1 text-yellow-400"></i>{repo.stargazers_count.toLocaleString()}
                        </span>
                        <span data-testid={`text-repository-forks-${repo.id}`}>
                          <i className="fas fa-code-branch mr-1"></i>{repo.forks_count.toLocaleString()}
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
                      onClick={() => onSelect(repo)}
                      className="bg-github-blue hover:bg-blue-600 text-white"
                      data-testid={`button-select-repository-${repo.id}`}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}