import React from 'react';
import { ChatWidget } from './components/ChatWidget';

const App: React.FC = () => {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>EmbedAI Admin Dashboard</h1>
      <p>This is where your customers will configure their bots.</p>
      <p>Look in the bottom right corner to see the live chat widget preview!</p>
      <ChatWidget
        botId="6a670f127d5c41275cb01d35"
        botName="Acme Corp Support"
        primaryColor="#146c2e"
      />
    </div>
  );
}

export default App;