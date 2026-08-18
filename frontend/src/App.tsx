import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/AdminDashboard';
import { Auth } from './components/Auth';
import { LandingPage } from './pages/LandingPage';
import { setAccessToken } from './utils/api';
import { useApi, useAuthApi } from './hooks/useApi';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fetchApi = useApi();
  const fetchAuthApi = useAuthApi();

  const [user, setUser] = useState<any>(null);
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasFetchedBots, setHasFetchedBots] = useState(false);

  const [botConfig, setBotConfig] = useState({
    name: 'Support Assistant',
    colorHex: '#0b57d0',
    welcomeMessage: 'Hi there! How can I help you today?'
  });

  const fetchUserBots = async () => {
    try {
      const res = await fetchAuthApi('/api/bots');
      if (res.ok) {
        const bots = await res.json();
        if (bots && bots.length > 0) {
          setActiveBotId(bots[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user bots", err);
    } finally {
      setHasFetchedBots(true);
    }
  };

  useEffect(() => {
    const attemptSilentLogin = async () => {
      try {
        const res = await fetchApi('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);

          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          setUser({ id: payload.userId, tenantId: payload.tenantId });

          await fetchUserBots(); // Load bots after silent login
        }
      } catch (e) {
        console.log("No active session found.");
      } finally {
        setIsInitializing(false);
      }
    };

    attemptSilentLogin();

    const handleAuthExpired = () => setUser(null);
    window.addEventListener('auth_expired', handleAuthExpired);

    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, []);

  const fetchConfig = async () => {
    if (!activeBotId) return;

    try {
      const response = await fetchApi(`/api/bots/${activeBotId}`);
      if (response.ok) {
        const data = await response.json();
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
    try {
      await fetchApi('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setAccessToken(null);
      setUser(null);
      setActiveBotId(null);
      navigate('/login');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const DashboardLayout = () => {
    if (!activeBotId) {
      if (!hasFetchedBots) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
          <div className="p-8 bg-white rounded-xl shadow-sm border border-slate-200 text-center max-w-md">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">No Workspace Found</h2>
            <p className="text-slate-600 mb-6">We couldn't find an active workspace or bot for your account. Please log out and try again, or contact support.</p>
            <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Log Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
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
              Workspace: <span className="font-mono text-slate-600">{user?.tenantId ? user.tenantId.substring(0, 6) : '...'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
            >
              Log Out
            </button>
          </div>
        </nav>

        <div className="flex-1 w-full max-w-7xl mx-auto p-6">
          <AdminDashboard
            botId={activeBotId}
            tenantId={user?.tenantId}
          />
        </div>

        <ChatWidget
          botId={activeBotId}
          botName={botConfig.name}
          primaryColor={botConfig.colorHex}
          welcomeMessage={botConfig.welcomeMessage}
        />
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          user ? <Navigate to="/dashboard" replace /> : <Auth onLoginSuccess={async (loggedInUser) => {
            setUser(loggedInUser);
            await fetchUserBots(); // Load bots after manual login
            navigate('/dashboard');
          }} />
        }
      />

      <Route
        path="/dashboard"
        element={
          user ? <DashboardLayout /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/widget/:botId"
        element={
          <div className="bg-transparent h-screen w-screen overflow-hidden">
            <ChatWidget
              botId={location.pathname.split('/')[2]} // Extract from URL
              botName={botConfig.name}
              primaryColor={botConfig.colorHex}
              welcomeMessage={botConfig.welcomeMessage}
            />
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;