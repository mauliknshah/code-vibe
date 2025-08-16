import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GitHubMarkdownRenderer from "@/components/github-markdown-renderer";
import type { Repository, RepositoryAnalysis, Conversation, Message } from "@shared/schema";

interface ChatInterfaceProps {
  repository: Repository | null;
  repositoryAnalysis: RepositoryAnalysis | null;
}

export default function ChatInterface({ repository, repositoryAnalysis }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get conversation with messages
  const { data: conversation, isLoading: conversationLoading } = useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", currentConversation],
    enabled: !!currentConversation,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { repositoryId: string; title: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversation(conversation.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, {
        content: data.content,
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      setCharacterCount(0);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversation] });
      scrollToBottom();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !repository) return;

    if (!currentConversation) {
      // Create new conversation
      createConversationMutation.mutate({
        repositoryId: repository.id,
        title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
      });
    } else {
      // Send message to existing conversation
      sendMessageMutation.mutate({
        conversationId: currentConversation,
        content: message,
      });
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    setCharacterCount(value.length);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
    setCharacterCount(question.length);
  };

  const handleFollowUpQuestion = (question: string) => {
    setMessage(question);
    setCharacterCount(question.length);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // Wait for conversation creation
  useEffect(() => {
    if (createConversationMutation.isSuccess && createConversationMutation.data && message.trim()) {
      sendMessageMutation.mutate({
        conversationId: createConversationMutation.data.id,
        content: message,
      });
    }
  }, [createConversationMutation.isSuccess, createConversationMutation.data]);

  if (!repository) {
    return (
      <div className="flex-1 flex items-center justify-center bg-github-dark">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-github-blue to-github-purple rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <i className="fas fa-code text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-semibold text-github-text mb-2">Select a Repository</h3>
          <p className="text-github-muted">Choose a repository to start analyzing your codebase with AI-powered insights.</p>
        </div>
      </div>
    );
  }

  const isLoading = createConversationMutation.isPending || sendMessageMutation.isPending;

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-interface">
      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-github-blue to-github-purple rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <i className="fas fa-robot text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-semibold text-github-text mb-2">Welcome to CodeInsight</h3>
              <p className="text-github-muted mb-8 max-w-2xl mx-auto">
                I'm here to help you understand your codebase better. Ask me questions about feature evolution, contributor analysis, or any insights about your repository.
              </p>
              
              {/* Suggested Questions */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Button
                  variant="outline"
                  className="p-4 bg-github-surface border-github-border hover:border-github-blue/50 hover:bg-github-blue/5 transition-all text-left h-auto"
                  onClick={() => handleSuggestedQuestion("How did the main features evolve in this repository?")}
                  data-testid="button-suggested-question-evolution"
                >
                  <div className="flex items-start space-x-3">
                    <i className="fas fa-history text-github-blue mt-1"></i>
                    <div>
                      <h4 className="text-sm font-medium text-github-text">Feature Evolution</h4>
                      <p className="text-xs text-github-muted mt-1">How did the main features evolve?</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="p-4 bg-github-surface border-github-border hover:border-github-blue/50 hover:bg-github-blue/5 transition-all text-left h-auto"
                  onClick={() => handleSuggestedQuestion("Who contributed the most bugs to this repository?")}
                  data-testid="button-suggested-question-contributors"
                >
                  <div className="flex items-start space-x-3">
                    <i className="fas fa-users text-github-purple mt-1"></i>
                    <div>
                      <h4 className="text-sm font-medium text-github-text">Contributor Analysis</h4>
                      <p className="text-xs text-github-muted mt-1">Who contributed the most bugs?</p>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="p-4 bg-github-surface border-github-border hover:border-github-blue/50 hover:bg-github-blue/5 transition-all text-left h-auto"
                  onClick={() => handleSuggestedQuestion("What are the most active files in this repository?")}
                  data-testid="button-suggested-question-activity"
                >
                  <div className="flex items-start space-x-3">
                    <i className="fas fa-code-branch text-github-green mt-1"></i>
                    <div>
                      <h4 className="text-sm font-medium text-github-text">Code Quality</h4>
                      <p className="text-xs text-github-muted mt-1">What are the most active files?</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {conversation.messages.map((msg, index) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end mb-4">
                    <div className="bg-github-blue text-white px-6 py-4 rounded-2xl rounded-br-lg max-w-2xl">
                      <p className="text-sm" data-testid={`message-user-${index}`}>{msg.content}</p>
                      <span className="text-xs opacity-70 mt-2 block">
                        {new Date(msg.createdAt!).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-github-blue to-github-purple rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-white text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <Card className="bg-github-surface border-github-border rounded-2xl rounded-tl-lg">
                        <CardContent className="p-6">
                          <div data-testid={`message-assistant-${index}`}>
                            <GitHubMarkdownRenderer
                              content={msg.content}
                              repositoryUrl={repository?.url}
                            />
                          </div>
                          
                          {/* Message Actions */}
                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-github-border">
                            <div className="flex items-center space-x-3">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-xs text-github-muted hover:text-github-text"
                                data-testid={`button-helpful-${index}`}
                              >
                                <i className="fas fa-thumbs-up mr-1"></i>
                                Helpful
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-xs text-github-muted hover:text-github-text"
                                data-testid={`button-copy-${index}`}
                              >
                                <i className="fas fa-copy mr-1"></i>
                                Copy
                              </Button>
                            </div>
                            <span className="text-xs text-github-muted">
                              {(msg.metadata as any)?.confidence && 
                                `Confidence: ${((msg.metadata as any).confidence * 100).toFixed(0)}%`
                              }
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Follow-up questions */}
                      {(msg.metadata as any)?.followUpQuestions && (msg.metadata as any).followUpQuestions.length > 0 && (
                        <div className="ml-0 mt-4">
                          <p className="text-sm text-github-muted mb-3">Follow-up questions:</p>
                          <div className="space-y-2">
                            {(msg.metadata as any).followUpQuestions.map((question: string, qIndex: number) => (
                              <Button
                                key={qIndex}
                                variant="outline"
                                size="sm"
                                className="block w-full text-left px-4 py-2 text-sm bg-github-dark border-github-border hover:border-github-blue/50 hover:bg-github-blue/5 transition-all"
                                onClick={() => handleFollowUpQuestion(question)}
                                data-testid={`button-followup-${index}-${qIndex}`}
                              >
                                {question}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-github-blue to-github-purple rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="flex-1">
                  <Card className="bg-github-surface border-github-border rounded-2xl rounded-tl-lg">
                    <CardContent className="p-6">
                      <div className="text-github-muted">Analyzing your question...</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-github-border bg-github-surface">
        <div className="max-w-4xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end space-x-4">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about feature evolution, contributors, code quality, or any repository insights..."
                  className="w-full bg-github-dark border-github-border rounded-xl px-4 py-3 pr-12 text-sm text-github-text placeholder-github-muted resize-none focus:outline-none focus:ring-2 focus:ring-github-blue/50 focus:border-transparent min-h-[48px] max-h-32"
                  rows={1}
                  data-testid="textarea-message-input"
                />
                <Button
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-6 h-6 bg-github-blue hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-send-message"
                >
                  {isLoading ? (
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <i className="fas fa-paper-plane text-white text-xs"></i>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-github-muted">
                <span data-testid="text-character-count">{characterCount}</span>/2000 characters
              </div>
              <div className="text-xs text-github-muted">
                Press <kbd className="bg-github-dark px-1.5 py-0.5 rounded border border-github-border">↵</kbd> to send, 
                <kbd className="bg-github-dark px-1.5 py-0.5 rounded border border-github-border ml-1">Shift</kbd> + 
                <kbd className="bg-github-dark px-1.5 py-0.5 rounded border border-github-border">↵</kbd> for new line
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
