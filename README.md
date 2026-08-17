🚀 EmbedAI: Autonomous Agent SaaS & Live Support Platform

EmbedAI is a multi-tenant, enterprise-grade SaaS platform that allows businesses to upload their knowledge bases, train an AI agent, and deploy a customizable support widget to their website in minutes.

Unlike standard "dumb" API wrappers, EmbedAI is powered by LangGraph for autonomous tool-calling, features Semantic Caching to slash LLM costs, and includes real-time WebSocket Human Handoff for when the AI needs backup.

✨ Enterprise-Grade Features

🧠 Agentic Workflows (LangGraph): The AI doesn't just answer questions; it reasons. It autonomously decides when to query the Vector DB, when to ask clarifying questions, and when to trigger Zod-validated tools (like capturing lead info for frustrated users).

⚡ Semantic Caching Layer: Intercepts repeated customer questions using Vector Similarity Search. If a match is found (>95% similarity), it serves the cached answer instantly with 0 latency and $0.00 API cost.

🤝 Live Human Handoff (WebSockets): Admins can monitor live AI chats in their dashboard. With one click, they can "Pause the AI" and seamlessly take over the conversation in real-time.

🔒 Bank-Grade Session Security: Short-lived JWTs in memory, long-lived HttpOnly refresh cookies, concurrent session limits (max 5 devices), and a dashboard to remotely revoke access from unknown devices.

🏢 True Multi-Tenancy: Secure metadata filtering at the database level ensures that Company A's AI can never hallucinate and leak Company B's uploaded PDFs.

📊 ROI Analytics: Real-time dashboard tracking total queries, cache hits, and calculated dollars saved.

🛠️ Tech Stack

Frontend:

React.js 18 (Vite)

TypeScript

Tailwind CSS

Recharts (Analytics)

React Router DOM & React Helmet Async (SEO)

Backend & AI Engine:

Node.js & Express.js

MongoDB Atlas (Document Storage & Vector Search)

Socket.io (Real-time WebSockets)

LangChain.js & LangGraph (Agent Orchestration)

Google Gemini / OpenAI / Anthropic (Dynamic LLM Routing)

🏗️ System Architecture

graph TD
    User([Website Visitor]) -->|Types Question| Widget(Chat Widget)
    Widget -->|WebSocket Emit| Server(Express Backend)
    
    Server --> CacheCheck{Semantic Cache}
    
    CacheCheck -->|Similarity > 95%| CacheHit[Return Cached Answer]
    CacheHit --> Widget
    
    CacheCheck -->|Cache Miss| LangGraph[LangGraph Agent]
    
    LangGraph <--> Checkpointer[(Thread Memory)]
    LangGraph <--> VectorDB[(MongoDB Vector Search)]
    LangGraph <--> Tools{Zod Tools}
    
    Tools -->|Frustrated User?| LeadDB[(Lead Database)]
    Tools -->|Requires Factual Data?| VectorDB
    
    LangGraph -->|Stream Chunks| Widget
    
    Admin([Company Admin]) -->|Monitors| Dashboard(Admin Inbox)
    Server <-->|Live Sync| Dashboard
    Dashboard -->|Take Over Chat| Server


🚀 Local Development Setup

1. Prerequisites

Node.js (v18+)

MongoDB Atlas Cluster (with a created Vector Search Index)

Google Gemini API Key (or OpenAI/Anthropic)

2. Clone and Install

git clone https://github.com/yourusername/embedai.git
cd embedai

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install


3. Environment Variables

Create a .env file in the /backend directory:

PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/embedai
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# Default AI Models
CHAT_MODEL=gemini-3.6-flash
EMBEDDING_MODEL=text-embedding-004

# Optional: LangSmith Tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=EmbedAI_Local


4. Configure MongoDB Vector Search Index

In your MongoDB Atlas Dashboard, create a new Atlas Vector Search index on the documentchunks collection named vector_index using this JSON:

{
  "fields": [
    {
      "numDimensions": 3072,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "botId",
      "type": "filter"
    }
  ]
}


5. Run the Application

Open two terminal windows:

Terminal 1 (Backend):

cd backend
npm run dev


Terminal 2 (Frontend):

cd frontend
npm run dev


Navigate to http://localhost:5173 to view the landing page and create your first workspace!

🛡️ Security Best Practices Implemented

Rate Limiting: Protects against Brute Force logins, API exhaustion, and malicious bulk document uploads.

Device Fingerprinting: ua-parser-js tracks OS, browser, and IP address for active session management.

Token Rotation: Refresh tokens are rotated upon use, and suspected token theft triggers a nuclear revocation of all active sessions for that user.

Helmet.js: Secures Express apps by setting various HTTP headers.

🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check issues page.

📝 License

This project is MIT licensed.
