# CodeInsight 🔍

AI-Powered GitHub Repository Analysis Platform

## Overview

CodeInsight is a sophisticated web application that provides intelligent analysis and insights for GitHub repositories. Built with modern web technologies, it combines repository metadata, commit history, and AI-driven analysis to deliver deep insights about development patterns, contributor activities, and project evolution.

## Features

### 🔍 Repository Analysis
- **Public Repository Access**: Analyze any public GitHub repository without authentication
- **Comprehensive Data Collection**: Fetches commits, pull requests, issues, releases, and contributor information
- **Accurate Metrics**: Uses GitHub Search API for precise issue counts excluding pull requests
- **Real-time Synchronization**: Live data access from GitHub repositories

### 🤖 AI-Powered Insights
- **Conversational Interface**: Chat with a geeky AI assistant about your codebase
- **Technical Context**: Deep technical insights with coding metaphors and developer humor
- **Code Archaeology**: Understand the stories behind commits and development patterns
- **Smart Analysis**: GPT-4 powered analysis of repository evolution and contributor dynamics

### 📊 Visual Analytics
- **Repository Metrics Dashboard**: Stars, forks, issues, and language breakdown
- **Commit Activity Tracking**: Weekly commit analysis and trends
- **Contributor Statistics**: Team dynamics and contribution patterns
- **Interactive Charts**: Visual representation of repository health and activity

### 💬 Intelligent Chat
- **Natural Language Queries**: Ask questions about your repository in plain English
- **Follow-up Suggestions**: AI-generated relevant questions to continue exploration
- **Markdown Support**: Rich text responses with proper code formatting
- **Context-Aware**: Maintains conversation history for deeper insights

## Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** with custom GitHub-inspired dark theme
- **Radix UI** and **shadcn/ui** for accessible, consistent components
- **TanStack Query** for efficient server state management
- **Wouter** for lightweight client-side routing
- **React Hook Form** with Zod validation for form handling

### Backend
- **Express.js** with TypeScript in ESM environment
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Octokit** for comprehensive GitHub API integration
- **Anthropic Claude** for AI-powered repository analysis
- **Vite** integration for optimized development experience

### Database
- **PostgreSQL** as the primary data store
- **Drizzle Kit** for schema migrations and management
- **In-memory storage** option for development and testing

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use in-memory storage for development)
- Anthropic API key for AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codeinsight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Required for AI features
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # Optional: For higher GitHub API rate limits
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000` to start analyzing repositories!

## Usage

### Analyzing a Repository

1. **Select a Repository**: Click "Select Repository" and search for any public GitHub repository
2. **Explore Metrics**: View comprehensive statistics in the left sidebar
3. **Ask Questions**: Use the chat interface to ask questions about the codebase
4. **Review Analytics**: Check the right panel for detailed repository analytics

### Example Questions to Ask

- "What are the main development patterns in this repository?"
- "Who are the most active contributors and what do they work on?"
- "How has the codebase evolved over time?"
- "What are the common types of issues reported?"
- "Show me the release patterns and deployment frequency"

## Architecture

### Data Flow
1. **Repository Selection**: User searches and selects a public GitHub repository
2. **Data Fetching**: Backend fetches comprehensive data via GitHub API
3. **AI Analysis**: Repository data is processed by Anthropic Claude for insights
4. **Real-time Chat**: Users interact with AI assistant for deeper exploration
5. **Analytics Display**: Visual representation of repository metrics and trends

### Key Components
- **GitHub Service**: Handles all GitHub API interactions with rate limiting
- **AI Analysis Service**: Processes repository data through Anthropic Claude
- **Storage Layer**: Manages repository data and conversation history
- **Chat Interface**: Real-time conversational UI with markdown support
- **Analytics Dashboard**: Visual metrics and repository health indicators

## API Rate Limits

The application works with GitHub's public API rate limits:
- **Unauthenticated**: 60 requests per hour
- **Authenticated**: 5,000 requests per hour (when GitHub credentials are provided)

For production use, we recommend providing GitHub API credentials for higher rate limits.

## Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage for new features
- Use the existing code style and formatting
- Update documentation for significant changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **GitHub API** for providing comprehensive repository data
- **Anthropic Claude** for powering intelligent code analysis
- **Open Source Community** for the amazing tools and libraries used in this project

---

*Built with ❤️ for developers who love exploring codebases and understanding the stories behind the code.*