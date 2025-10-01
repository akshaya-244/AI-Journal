# AI Journal Logs

A modern journaling application with AI-powered insights, built with Next.js frontend and Cloudflare Workers backend. Features real-time journaling, dream tracking, and intelligent search capabilities using hybrid RAG (Retrieval-Augmented Generation) pipeline.

## 🌟 Features

- **Secure Authentication**: Google OAuth integration via NextAuth.js
- **Real-time Journaling**: Write and save journal entries with automatic timestamping
- **AI-Powered Search**: Hybrid search combining keyword and semantic search using BM25 and embeddings
- **Dream Tracking**: Specialized interface for recording and analyzing dreams
- **User Sessions**: Persistent user sessions using Cloudflare Durable Objects
- **Beautiful UI**: Modern, responsive design with dark theme and smooth animations
- **Database Integration**: SQLite database via Cloudflare D1 for reliable data storage

## 🏗️ Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with App Router
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI components with custom styling
- **Animations**: Framer Motion for smooth transitions

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers with TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Sessions**: Durable Objects for user session management
- **AI**: Cloudflare AI bindings for embeddings and semantic search
- **Search**: Hybrid RAG pipeline with BM25 + semantic search

## 📁 Project Structure

```
journal-logs/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── api/auth/    # NextAuth configuration
│   │   │   ├── session/     # Journal session page
│   │   │   └── query_my_logs/ # Search interface
│   │   ├── components/      # React components
│   │   └── lib/            # Utilities
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts        # Main worker entry point
│   │   ├── UserSession.ts  # Durable Object for sessions
│   │   └── RAGPipeline.ts  # Search and AI pipeline
│   ├── schema.sql          # Database schema
│   ├── wrangler.jsonc      # Worker configuration
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account
- Google OAuth credentials

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Set Up Cloudflare D1 Database

```bash
# Create database
cd backend
npx wrangler d1 create prod-daily-logs

# Run migrations
npx wrangler d1 execute prod-daily-logs --file=./schema.sql
```

### 3. Configure Environment Variables

#### Frontend (.env.local)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:8787
```

#### Backend (wrangler.jsonc)
Update the `database_id` in `wrangler.jsonc` with your created database ID.

### 4. Development

#### Start Frontend
```bash
cd frontend
npm run dev
```

#### Start Backend Worker
```bash
cd backend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔧 Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Cloudflare Configuration

The worker is configured to use:
- **D1 Database**: For persistent storage
- **Durable Objects**: For user session management
- **AI Bindings**: For embeddings and semantic search

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- Google user ID
    email TEXT NOT NULL UNIQUE,    -- Google email
    name TEXT NOT NULL,            -- Display name
    picture TEXT,                  -- Profile picture URL
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Journal Entries Table
```sql
CREATE TABLE journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,         -- References users.id
    entry_text TEXT NOT NULL,      -- Journal content
    timestamp DATETIME NOT NULL,   -- Entry timestamp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔍 API Endpoints

### Authentication
- `POST /auth/login` - Authenticate user and update database

### User Sessions (via Durable Objects)
- `GET /session/:userId/entries` - Get user's journal entries
- `POST /session/:userId/entries` - Create new journal entry
- `PUT /session/:userId/entries/:id` - Update journal entry
- `DELETE /session/:userId/entries/:id` - Delete journal entry

### Debug Endpoints
- `GET /debug/users` - List all users
- `GET /debug/entries` - List all journal entries
- `POST /debug/rag-search` - Test RAG search functionality

## 🧠 AI Features

### Hybrid Search Pipeline
The application uses a sophisticated search system combining:

1. **Keyword Search**: BM25 algorithm for exact term matching
2. **Semantic Search**: Vector embeddings for meaning-based search
3. **Hybrid Scoring**: Combines both approaches for optimal results

### Search Features
- Search across all journal entries
- User-specific filtering
- Relevance scoring with percentages
- Context extraction for AI analysis

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy to Vercel or your preferred platform
```

### Backend (Cloudflare Workers)
```bash
cd backend
npm run deploy
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend linting
cd frontend
npm run lint
```

## 📝 Usage

1. **Sign In**: Use Google OAuth to authenticate
2. **Write Entries**: Navigate to the session page to start journaling
3. **Search**: Use the query interface to find specific entries
4. **AI Insights**: Leverage the hybrid search for pattern discovery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include error logs and reproduction steps

---

Built with ❤️ using Next.js, Cloudflare Workers, and modern web technologies.
