# CodeInsight - AI-Powered GitHub Repository Analysis

## Overview

CodeInsight is a full-stack web application that provides AI-powered analysis and insights for GitHub repositories. Users can authenticate with their GitHub account, select repositories to analyze, and engage in conversational AI-driven exploration of their codebase. The application combines repository metadata, commit history, and code analysis to deliver intelligent insights about development patterns, contributor activities, and project evolution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, utilizing a modern component-based architecture:

- **UI Framework**: React 18 with TypeScript for type safety and modern development practices
- **Styling**: Tailwind CSS with a custom design system using CSS variables for theming
- **Component Library**: Radix UI primitives with shadcn/ui components for consistent, accessible UI elements
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

The frontend follows a modular structure with organized components, pages, hooks, and utilities. The architecture emphasizes reusability and maintainability with a clear separation of concerns.

### Backend Architecture
The server is built using Express.js with TypeScript in an ESM environment:

- **Web Framework**: Express.js with middleware for request logging, JSON parsing, and error handling
- **Session Management**: Express sessions with configurable storage for OAuth state management
- **API Design**: RESTful API endpoints with consistent error handling and response formatting
- **Development Setup**: Vite integration for hot module replacement and optimized development experience

The backend implements a service-oriented architecture with clear separation between routes, services, and data access layers.

### Data Storage Solutions
The application uses a PostgreSQL database with Drizzle ORM for type-safe database operations:

- **Database**: PostgreSQL as the primary data store
- **ORM**: Drizzle ORM with TypeScript for schema definition and query building
- **Migrations**: Drizzle Kit for database schema migrations and management
- **Schema Design**: Relational schema with tables for users, repositories, conversations, messages, and repository analyses
- **Development Storage**: In-memory storage implementation for development and testing

The schema supports user authentication, repository management, conversational AI interactions, and analytical data storage.

### Authentication and Authorization
GitHub OAuth 2.0 integration provides secure user authentication:

- **OAuth Provider**: GitHub OAuth for user authentication and repository access
- **Session Management**: Server-side sessions with configurable security settings
- **Token Management**: Secure storage and handling of GitHub access tokens
- **Authorization Scopes**: Repository and user email permissions for comprehensive access

The authentication flow includes state validation and secure token exchange with proper error handling.

## External Dependencies

### GitHub Integration
- **GitHub API**: Octokit REST client for comprehensive GitHub API interactions
- **Repository Data**: Fetching repository metadata, commit history, pull requests, issues, and contributor information
- **Real-time Access**: Live data synchronization with GitHub repositories

### AI and Machine Learning
- **OpenAI API**: GPT-4 integration for intelligent code analysis and conversational insights
- **Analysis Engine**: Custom service for processing repository data and generating AI-driven insights
- **Natural Language Processing**: Conversational interface for repository exploration and question answering

### Development and Build Tools
- **Vite**: Modern build tool for fast development and optimized production builds
- **ESBuild**: High-performance bundling for server-side code
- **TypeScript**: Type checking and compilation across the entire stack
- **Tailwind CSS**: Utility-first CSS framework with custom configuration

### UI and Design System
- **Radix UI**: Accessible, unstyled UI primitives for consistent component behavior
- **shadcn/ui**: Pre-built component library with customizable styling
- **Lucide React**: Icon library for consistent iconography
- **CSS Variables**: Dynamic theming system with light/dark mode support

### Database and ORM
- **Neon Database**: Serverless PostgreSQL hosting solution
- **Drizzle ORM**: Type-safe database toolkit with schema validation
- **Drizzle Kit**: Database management and migration tools
- **Zod**: Runtime type validation for database schemas and API inputs