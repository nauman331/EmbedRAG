# Contributing to EmbedAI

Thank you for your interest in contributing! This guide will get you up and running in minutes.

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js v20+
- Docker & Docker Compose (optional, but recommended)
- MongoDB Atlas account with a Vector Search index created

### Option A — Docker (Recommended)

```bash
git clone https://github.com/yourusername/embedai.git
cd embedai

# Backend secrets
cp backend/.env.example backend/.env
# → Fill in MONGO_URI, JWT secrets, and AI API keys

# Frontend URLs
cp frontend/.env.example frontend/.env.local

# Start everything
docker compose up --build
```

Open http://localhost:80

### Option B — Manual

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env        # fill in values
npm install --legacy-peer-deps
npm run dev

# Terminal 2: Frontend
cd frontend
cp .env.example .env.local  # defaults are fine for local dev
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ✅ | Server port (default: 5000) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | ✅ | Strong random string — `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | ✅ | Different strong random string |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS |
| `ALLOWED_ORIGINS` | ❌ | Comma-separated extra allowed origins |
| `EMBEDDING_MODEL` | ✅ | e.g. `gemini-embedding-001` |
| `GEMINI_MODEL` | ✅ | e.g. `gemini-2.0-flash` |
| `LANGCHAIN_API_KEY` | ❌ | LangSmith tracing (optional) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL |
| `VITE_SOCKET_URL` | ✅ | Socket.io server URL |

---

## 📁 Project Structure

```
embedai/
├── backend/
│   └── src/
│       ├── ai/           # LangGraph agent, semantic caching
│       ├── config/       # DB connection, Winston logger
│       ├── controllers/  # Route handlers (thin layer)
│       ├── middlewares/  # auth, rate limiting, validation
│       ├── models/       # Mongoose schemas
│       ├── routes/       # Express router definitions
│       ├── services/     # Business logic (service layer)
│       ├── sockets/      # Socket.io event handlers
│       └── server.ts     # Entry point
└── frontend/
    └── src/
        ├── components/   # AdminDashboard, ChatWidget, Auth
        ├── pages/        # LandingPage
        └── utils/        # API client (fetchWithAuth)
```

---

## 🔀 Git Workflow

```
main          ← production-ready, protected branch
develop       ← integration branch
feature/xyz   ← your feature branch
fix/abc       ← your bug fix branch
```

1. Fork the repo and create a branch from `develop`
2. Name your branch: `feature/your-feature` or `fix/your-bug`
3. Write clear commit messages: `feat: add Stripe billing integration`
4. Open a PR against `develop` (not `main`)

---

## ✅ PR Checklist

Before submitting a PR, confirm:

- [ ] TypeScript compiles: `cd backend && npm run build`
- [ ] Frontend lints: `cd frontend && npm run lint`  
- [ ] No new `console.log` — use the Winston `logger` from `src/config/logger.ts`
- [ ] No new hardcoded `http://localhost:*` URLs
- [ ] New routes have `requireAuth` + `requireBotOwnership` where applicable
- [ ] Sensitive values come from environment variables, not code

---

## 🧪 Running Tests

```bash
# Backend (once tests are added)
cd backend && npm test

# Frontend lint
cd frontend && npm run lint
```

---

## 📮 Reporting Issues

Please use the [Issues tab](../../issues) and include:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
