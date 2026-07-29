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

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#0f172a' }}>EmbedAI Admin Dashboard</h1>
        <p style={{ color: '#64748b' }}>Manage your custom AI assistant and knowledge base.</p>
        <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>Look in the bottom right corner to see the live chat widget preview!</p>
      </div>

      {/* Render the Admin Panel */}
      <AdminDashboard botId={DUMMY_BOT_ID} tenantId={DUMMY_TENANT_ID} />

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