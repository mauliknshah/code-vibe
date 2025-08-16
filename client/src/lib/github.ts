export const GITHUB_OAUTH_URL = "/api/auth/github";

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  email?: string;
  name?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  updated_at: string;
}

export const formatRepositorySize = (size: number): string => {
  if (size < 1024) return `${size} KB`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} MB`;
  return `${(size / (1024 * 1024)).toFixed(1)} GB`;
};

export const formatCommitCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
};

export const getLanguageColor = (language: string): string => {
  const colors: Record<string, string> = {
    JavaScript: "bg-yellow-400",
    TypeScript: "bg-blue-400",
    Python: "bg-blue-600",
    Java: "bg-red-600",
    "C++": "bg-pink-600",
    C: "bg-gray-600",
    "C#": "bg-green-600",
    Ruby: "bg-red-500",
    Go: "bg-cyan-400",
    Rust: "bg-orange-600",
    PHP: "bg-purple-500",
    Swift: "bg-orange-500",
    Kotlin: "bg-purple-400",
    Dart: "bg-blue-500",
    HTML: "bg-orange-400",
    CSS: "bg-blue-300",
    Shell: "bg-green-400",
  };
  
  return colors[language] || "bg-gray-400";
};
