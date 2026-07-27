import React from 'react';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/AdminDashboard';

const App: React.FC = () => {
  const DUMMY_BOT_ID = "6a670f127d5c41275cb01d35";
  const DUMMY_TENANT_ID = "6a670f127d5c41275cb01d34";
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>EmbedAI Admin Dashboard</h1>
      <p>This is where your customers will configure their bots.</p>
      <p style={{ marginBottom: "2rem" }}>Look in the bottom right corner to see the live chat widget preview!</p>
      <AdminDashboard botId={DUMMY_BOT_ID} tenantId={DUMMY_TENANT_ID} />
      <ChatWidget
        botId="6a670f127d5c41275cb01d35"
        botName="Acme Corp Support"
        primaryColor="#146c2e"
      />
    </div>
  );
}

export default App;