import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Components } from "react-markdown";

interface GitHubMarkdownRendererProps {
  content: string;
  repositoryUrl?: string;
}

export default function GitHubMarkdownRenderer({ content, repositoryUrl }: GitHubMarkdownRendererProps) {
  // Function to process text and create clickable GitHub references
  const processGitHubReferences = (text: string) => {
    if (!repositoryUrl) return text;

    // Patterns for GitHub references
    const patterns = [
      {
        // Commit references: commit a1b2c3d or a1b2c3d
        pattern: /\b(?:commit\s+)?([a-f0-9]{7,40})\b/gi,
        replacement: (match: string, commitId: string) => {
          const shortId = commitId.substring(0, 7);
          return `[${match}](${repositoryUrl}/commit/${commitId})`;
        }
      },
      {
        // Pull request references: PR #123 or #123 (when context suggests PR)
        pattern: /\b(?:PR|pull request)\s*#(\d+)\b/gi,
        replacement: (match: string, prNumber: string) => {
          return `[${match}](${repositoryUrl}/pull/${prNumber})`;
        }
      },
      {
        // Issue references: issue #123 or #123 (when context suggests issue)
        pattern: /\b(?:issue)\s*#(\d+)\b/gi,
        replacement: (match: string, issueNumber: string) => {
          return `[${match}](${repositoryUrl}/issues/${issueNumber})`;
        }
      },
      {
        // Release/tag references: release v1.2.3 or tag v1.2.3
        pattern: /\b(?:release|tag)\s+(v?\d+\.\d+\.\d+[^\s]*)\b/gi,
        replacement: (match: string, tag: string) => {
          return `[${match}](${repositoryUrl}/releases/tag/${tag})`;
        }
      },
      {
        // Generic #number references (fallback to issues)
        pattern: /(?<!(?:PR|pull request|issue)\s*)#(\d+)\b/g,
        replacement: (match: string, number: string) => {
          return `[${match}](${repositoryUrl}/issues/${number})`;
        }
      }
    ];

    let processedText = text;
    
    // Apply each pattern
    patterns.forEach(({ pattern, replacement }) => {
      processedText = processedText.replace(pattern, replacement);
    });

    return processedText;
  };

  // Custom components for ReactMarkdown
  const components: Components = {
    // Custom link renderer to handle GitHub links with proper styling
    a: ({ href, children, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-github-blue hover:text-blue-400 underline decoration-github-blue/30 hover:decoration-blue-400/50 transition-colors"
        data-testid="link-github-reference"
        {...props}
      >
        {children}
      </a>
    ),
    
    // Enhanced code blocks
    code: ({ className, children, ...props }) => {
      // Check if it's inline code by examining the className or node context
      const isInline = !className?.includes('language-');
      
      if (isInline) {
        return (
          <code
            className="bg-github-dark px-1.5 py-0.5 rounded text-sm font-mono text-github-text border border-github-border"
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return (
        <pre className="bg-github-dark p-4 rounded-lg border border-github-border overflow-x-auto">
          <code className="text-sm font-mono text-github-text" {...props}>
            {children}
          </code>
        </pre>
      );
    },
    
    // Enhanced blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-github-blue pl-4 py-2 bg-github-blue/5 rounded-r-lg"
        {...props}
      >
        {children}
      </blockquote>
    ),
    
    // Enhanced lists
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside space-y-1 text-github-text" {...props}>
        {children}
      </ul>
    ),
    
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside space-y-1 text-github-text" {...props}>
        {children}
      </ol>
    ),
    
    // Enhanced headings
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold text-github-text mb-4 border-b border-github-border pb-2" {...props}>
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-semibold text-github-text mb-3 border-b border-github-border pb-1" {...props}>
        {children}
      </h2>
    ),
    
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-medium text-github-text mb-2" {...props}>
        {children}
      </h3>
    ),
    
    // Enhanced tables
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-github-border rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),
    
    th: ({ children, ...props }) => (
      <th className="border border-github-border bg-github-surface px-4 py-2 text-left font-medium text-github-text" {...props}>
        {children}
      </th>
    ),
    
    td: ({ children, ...props }) => (
      <td className="border border-github-border px-4 py-2 text-github-text" {...props}>
        {children}
      </td>
    ),
  };

  // Process the content to add GitHub references
  const processedContent = processGitHubReferences(content);

  return (
    <div className="prose prose-sm prose-invert text-github-text max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}