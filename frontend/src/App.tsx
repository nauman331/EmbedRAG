import React, { useState, useEffect } from 'react';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { setAccessToken } from './utils/api';

const App: React.FC = () => {
  const DUMMY_BOT_ID_FOR_NOW = "6a670f127d5c41275cb01d35";

  const [user, setUser] = useState<any>(null);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);

  const [botConfig, setBotConfig] = useState({
    name: 'Support Assistant',
    colorHex: '#0b57d0',
    welcomeMessage: 'Hi there! How can I help you today?'
  });


  useEffect(() => {
    const attemptSilentLogin = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);

          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          setUser({ id: payload.userId, tenantId: payload.tenantId });
        }
      } catch (e) {
        console.log("No active session found.");
      }
    };

    attemptSilentLogin();

    const handleAuthExpired = () => setUser(null);
    window.addEventListener('auth_expired', handleAuthExpired);

    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, []);

  const fetchConfig = async () => {
    const targetBotId = activeBotId || DUMMY_BOT_ID_FOR_NOW;
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${targetBotId}`);
      const data = await response.json();

      if (response.ok) {
        setBotConfig({
          name: data.name || 'Support Assistant',
          colorHex: data.colorHex || '#0b57d0',
          welcomeMessage: data.welcomeMessage || 'Hi there! How can I help you today?'
        });
      }
    } catch (err) {
      console.error("Failed to load widget theme", err);
    }
  };

  useEffect(() => {
    fetchConfig();

    window.addEventListener('bot_settings_updated', fetchConfig);
    return () => window.removeEventListener('bot_settings_updated', fetchConfig);
  }, [activeBotId]);

  const handleLogout = async () => {
    await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setAccessToken(null);
    setUser(null);
    setActiveBotId(null);
  };

  const path = window.location.pathname;

  if (path.startsWith('/widget/')) {
    const pathBotId = path.split('/')[2];
    return (
      <div className="bg-transparent h-screen w-screen overflow-hidden">
        <ChatWidget
          botId={pathBotId}
          botName={botConfig.name}
          primaryColor={botConfig.colorHex}
          welcomeMessage={botConfig.welcomeMessage}
        />
      </div>
    );
  }

  if (!user) {
    return <Auth onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">EmbedAI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Workspace: <span className="font-mono text-slate-600">{user.tenantId ? user.tenantId.substring(0, 6) : '...'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <AdminDashboard
          botId={activeBotId || DUMMY_BOT_ID_FOR_NOW}
          tenantId={user.tenantId}
        />
      </div>

      {/* Render the floating chat widget with dynamic props so the admin can test it */}
      <ChatWidget
        botId={activeBotId || DUMMY_BOT_ID_FOR_NOW}
        botName={botConfig.name}
        primaryColor={botConfig.colorHex}
        welcomeMessage={botConfig.welcomeMessage}
      />
    </div>
  );
}

export default App;