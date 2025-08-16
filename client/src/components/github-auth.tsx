import { Button } from "@/components/ui/button";

export default function GitHubAuth() {
  const handleGitHubAuth = () => {
    window.location.href = "/api/auth/github";
  };

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-github-blue to-github-purple rounded-2xl mx-auto mb-6 flex items-center justify-center">
        <i className="fab fa-github text-white text-2xl"></i>
      </div>
      <h3 className="text-2xl font-semibold text-github-text mb-2">Welcome to CodeInsight</h3>
      <p className="text-github-muted mb-8 max-w-sm mx-auto">
        Connect your GitHub account to start analyzing your repositories with AI-powered insights.
      </p>
      <Button 
        onClick={handleGitHubAuth}
        className="bg-github-blue hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        data-testid="button-github-auth"
      >
        <i className="fab fa-github mr-2"></i>
        Connect GitHub Account
      </Button>
    </div>
  );
}
