import React, { useState, useEffect } from 'react';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/AdminDashboard';

const App: React.FC = () => {
  const DUMMY_BOT_ID = "6a670f127d5c41275cb01d35";
  const DUMMY_TENANT_ID = "6a670f127d5c41275cb01d34";

  const [botConfig, setBotConfig] = useState({
    name: 'Support Assistant',
    colorHex: '#0b57d0',
    welcomeMessage: 'Hi there! How can I help you today?'
  });

  const fetchConfig = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/bots/${DUMMY_BOT_ID}`);
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
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">EmbedAI</h1>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          Preview Mode Active
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-6">
        <AdminDashboard botId={DUMMY_BOT_ID} tenantId={DUMMY_TENANT_ID} />
      </div>

      {/* Render the floating chat widget with dynamic props */}
      <ChatWidget
        botId={DUMMY_BOT_ID}
        botName={botConfig.name}
        primaryColor={botConfig.colorHex}
        welcomeMessage={botConfig.welcomeMessage}
      />

    </div>
  );
}

export default App;