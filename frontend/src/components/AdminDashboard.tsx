import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchWithAuth, API_URL } from '../utils/api';
import logoUrl from '../assets/logo.png';

interface AdminDashboardProps {
    botId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ botId }) => {
    const [activeTab, setActiveTab] = useState<'knowledge' | 'settings' | 'install' | 'inbox' | 'analytics' | 'leads' | 'security'>('settings');

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [botName, setBotName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [colorHex, setColorHex] = useState('#000000');

    const [llmProvider, setLlmProvider] = useState<'GEMINI' | 'OPENAI' | 'ANTHROPIC'>('GEMINI');
    const [llmModel, setLlmModel] = useState('gemini-3.6-flash');
    const [apiKeys, setApiKeys] = useState({
        openai: '',
        anthropic: '',
        gemini: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [adminMessage, setAdminMessage] = useState('');

    const [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);

    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchConversations = () => {
        fetchWithAuth(`${API_URL}/api/conversations/${botId}`)
            .then(res => res.json())
            .then(data => setConversations(data))
            .catch(err => console.error("Failed to fetch conversations", err));
    };

    useEffect(() => {
        let interval: any;
        if (activeTab === 'inbox') {
            fetchConversations();
            interval = setInterval(fetchConversations, 3000);
        } else if (activeTab === 'analytics') {
            fetchWithAuth(`${API_URL}/api/bots/${botId}/analytics`)
                .then(res => res.json())
                .then(data => setAnalyticsData(data))
                .catch(err => console.error("Failed to fetch analytics", err));
        } else if (activeTab === 'knowledge') {
            fetchKnowledgeSources();
        } else if (activeTab === 'leads') {
            fetchWithAuth(`${API_URL}/api/leads/${botId}`)
                .then(res => res.json())
                .then(data => setLeads(data))
                .catch(err => console.error("Failed to fetch leads", err));
        } else if (activeTab === 'security') {
            fetchSessions();
        }

        return () => { if (interval) clearInterval(interval); }
    }, [activeTab, botId]);

    const fetchSessions = async () => {
        setIsLoadingSessions(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/api/auth/sessions`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        if (!window.confirm("Are you sure you want to log out of that device?")) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/api/auth/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            }
        } catch (err) {
            console.error("Failed to revoke session:", err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    };

    const fetchKnowledgeSources = async () => {
        setIsLoadingSources(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/api/knowledge/${botId}`);
            const data = await res.json();
            if (res.ok) setKnowledgeSources(data);
        } catch (err) {
            console.error("Failed to fetch knowledge sources:", err);
        } finally {
            setIsLoadingSources(false);
        }
    };

    useEffect(() => {
        const fetchBotConfig = async () => {
            try {
                const response = await fetchWithAuth(`${API_URL}/api/bots/${botId}`);
                const data = await response.json();

                if (response.ok) {
                    setBotName(data.name || '');
                    setSystemPrompt(data.systemPrompt || '');
                    setWelcomeMessage(data.welcomeMessage || '');
                    setColorHex(data.colorHex || '#000000');

                    if (data.llmProvider) setLlmProvider(data.llmProvider);
                    if (data.llmModel) setLlmModel(data.llmModel);
                    if (data.apiKeys) setApiKeys(data.apiKeys);
                }
            } catch (error) {
                console.error("Failed to fetch bot config:", error);
            }
        };

        fetchBotConfig();
    }, [botId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setShowColorPicker(false);
            }
        };

        if (showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColorPicker]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('botId', botId);

        try {
            const response = await fetchWithAuth(`${API_URL}/api/knowledge/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to upload document');

            setUploadStatus({ type: 'success', message: `Success! Created ${data.chunksCreated} vector chunks.` });
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            fetchKnowledgeSources();
        } catch (error: any) {
            setUploadStatus({ type: 'error', message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/api/knowledge/${sourceId}`, { method: 'DELETE' });
            if (res.ok) setKnowledgeSources(prev => prev.filter(s => s._id !== sourceId));
        } catch (err) {
            console.error("Failed to delete source:", err);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const response = await fetchWithAuth(`${API_URL}/api/bots/${botId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: botName,
                    systemPrompt,
                    welcomeMessage,
                    colorHex,
                    llmProvider,
                    llmModel,
                    apiKeys
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update settings');

            setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
            window.dispatchEvent(new Event('bot_settings_updated'));
        } catch (error: any) {
            setSaveStatus({ type: 'error', message: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const getAvailableModels = () => {
        switch (llmProvider) {
            case 'GEMINI': return ['gemini-3.6-flash', 'gemini-3.1-pro', 'gemini-1.5-flash'];
            case 'OPENAI': return ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
            case 'ANTHROPIC': return ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
            default: return [];
        }
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
        setLlmProvider(newProvider);
        if (newProvider === 'GEMINI') setLlmModel('gemini-3.6-flash');
        if (newProvider === 'OPENAI') setLlmModel('gpt-4o-mini');
        if (newProvider === 'ANTHROPIC') setLlmModel('claude-3-haiku-20240307');
    };

    const handleTakeOver = async (sessionId: string) => {
        try {
            await fetchWithAuth(`${API_URL}/api/conversations/${sessionId}/takeover`, { method: 'POST' });
            fetchConversations();
        } catch (error) {
            console.error("Failed to take over chat", error);
        }
    };

    const handleAdminReply = async () => {
        if (!adminMessage.trim() || !selectedSessionId) return;
        const msg = adminMessage;
        setAdminMessage('');

        setConversations(prev => prev.map(c =>
            c.sessionId === selectedSessionId
                ? { ...c, messages: [...c.messages, { role: 'admin', content: msg, createdAt: new Date() }] }
                : c
        ));

        try {
            await fetchWithAuth(`${API_URL}/api/conversations/${selectedSessionId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            fetchConversations();
        } catch (error) {
            console.error("Failed to send reply", error);
        }
    };

    const exportLeadsToCSV = () => {
        if (leads.length === 0) return;
        const headers = ['Name', 'Email', 'Status', 'Date Captured'];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => [
                `"${lead.name}"`,
                `"${lead.email}"`,
                lead.status,
                new Date(lead.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'embedai_leads.csv';
        link.click();
    };

    return (
        <div className="w-full min-h-screen bg-[#f8fafc] font-sans flex flex-col">
            {!apiKeys.gemini && (
                <div className="z-50 bg-red-500 text-white px-4 py-3 text-center shadow-md">
                    <p className="text-sm font-medium">
                        ⚠️ <strong>Action Required:</strong> You must configure your Google Gemini API Key in the <button onClick={() => setActiveTab('settings')} className="underline font-bold hover:text-red-100">Settings</button> tab before your chatbot can answer questions.
                    </p>
                </div>
            )}

            {/* Top Navigation */}
            <header className="flex items-center justify-between px-4 lg:px-8 py-4 lg:py-5 bg-transparent">
                <a href="/" className="flex items-center outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
                    <img src={logoUrl} alt="EmbedAI Logo" className="h-8 lg:h-10 w-auto" />
                </a>

                <div className="hidden lg:flex items-center gap-2 bg-white p-1.5 rounded-full shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100">
                    <button onClick={() => setActiveTab('analytics')} className={`text-[15px] font-bold px-6 py-2.5 rounded-full transition-all ${activeTab === 'analytics' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('inbox')} className={`text-[15px] font-bold px-6 py-2.5 rounded-full transition-all ${activeTab === 'inbox' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'}`}>Conversations</button>
                    <button onClick={() => setActiveTab('leads')} className={`text-[15px] font-bold px-6 py-2.5 rounded-full transition-all ${activeTab === 'leads' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'}`}>Leads</button>
                    <button onClick={() => setActiveTab('knowledge')} className={`text-[15px] font-bold px-6 py-2.5 rounded-full transition-all ${activeTab === 'knowledge' ? 'bg-slate-50 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'}`}>Documents</button>
                </div>

                <div className="flex items-center gap-2 lg:gap-4">
                    <button className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                    </button>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm text-sm lg:text-base">
                        AD
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden px-4 lg:px-8 pb-20 lg:pb-8 gap-4 lg:gap-8 max-w-[1600px] mx-auto w-full">
                {/* Floating Icon Sidebar */}
                <aside className="hidden lg:flex relative w-20 flex-shrink-0 flex-col items-center py-6 gap-6 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 z-10 h-[calc(100vh-120px)]">
                    {(() => {
                        const navItems = [
                            { id: 'analytics', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>, label: 'Dashboard' },
                            { id: 'inbox', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><polyline points="21 3 15 3 15 7 9 7 9 3 3 3 3 21 21 21 21 3z"></polyline><path d="M21 3L3 3M15 3L9 3"></path></svg>, label: 'Inbox' },
                            { id: 'leads', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, label: 'Leads' },
                            { id: 'knowledge', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>, label: 'Documents' },
                            { id: 'settings', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>, label: 'Settings' },
                            { id: 'install', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>, label: 'Deploy' },
                            { id: 'security', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>, label: 'Security' }
                        ];
                        const activeIndex = navItems.findIndex(n => n.id === activeTab);

                        return (
                            <>
                                {/* Sliding Indicator */}
                                <div
                                    className="absolute w-12 h-12 bg-emerald-600 rounded-full shadow-lg shadow-emerald-600/30 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-0"
                                    style={{
                                        top: `24px`,
                                        transform: `translateY(${activeIndex * 72}px)`,
                                        opacity: activeIndex >= 0 ? 1 : 0
                                    }}
                                />

                                {navItems.map((btn) => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setActiveTab(btn.id as any)}
                                        className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 z-10 ${activeTab === btn.id ? 'text-white' : 'text-slate-400 hover:text-slate-800'}`}
                                    >
                                        {btn.icon}
                                        <div className="absolute left-16 bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                            {btn.label}
                                        </div>
                                    </button>
                                ))}
                            </>
                        );
                    })()}
                </aside>

                {/* Mobile Bottom Nav */}
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-2 flex justify-between items-center z-50">
                    {[
                        { id: 'analytics', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>, label: 'Dash' },
                        { id: 'inbox', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><polyline points="21 3 15 3 15 7 9 7 9 3 3 3 3 21 21 21 21 3z"></polyline><path d="M21 3L3 3M15 3L9 3"></path></svg>, label: 'Inbox' },
                        { id: 'leads', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, label: 'Leads' },
                        { id: 'knowledge', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>, label: 'Docs' },
                        { id: 'settings', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>, label: 'Settings' },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveTab(btn.id as any)}
                            className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors duration-300 ${activeTab === btn.id ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-50'}`}
                        >
                            {btn.icon}
                        </button>
                    ))}
                </div>

                <main className="flex-1 overflow-y-auto h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)] pb-10 lg:pb-0 pr-1 lg:pr-2 custom-scrollbar">
                    {activeTab === 'knowledge' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Train your AI</h2>
                                <p className="text-slate-500 mb-8">Upload documents to expand your bot's knowledge base. It will use this context to answer customer queries.</p>

                                <div className="border-2 border-dashed border-slate-200 bg-[#f8fafc] rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all hover:bg-emerald-50/50 hover:border-emerald-300">
                                    <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700 mb-1">Upload PDF Document</h3>
                                    <p className="text-sm text-slate-500 mb-6 max-w-sm">Drag and drop your file here, or click the button below to browse your computer.</p>
                                    <input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="file-upload" />
                                    <label htmlFor="file-upload" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20">
                                        {file ? 'Change File' : 'Browse Files'}
                                    </label>

                                    {file && (
                                        <div className="mt-6 flex items-center gap-3 bg-white px-5 py-4 rounded-xl border border-slate-100 shadow-sm w-full max-w-md">
                                            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0 text-emerald-600">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-8">
                                    <div>
                                        {uploadStatus && (
                                            <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {uploadStatus.type === 'success' ? '✅' : '❌'} {uploadStatus.message}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleUpload}
                                        disabled={!file || isUploading}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${!file || isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'}`}
                                    >
                                        {isUploading ? 'Processing...' : 'Process Document'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="p-8 border-b border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-800">Active Knowledge Sources</h3>
                                    <p className="text-sm text-slate-500">Manage the files your AI currently has access to.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-[#f8fafc] text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-8 py-4">File Name</th>
                                                <th className="px-8 py-4">Status</th>
                                                <th className="px-8 py-4">Data Chunks</th>
                                                <th className="px-8 py-4">Date Uploaded</th>
                                                <th className="px-8 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {isLoadingSources ? (
                                                <tr><td colSpan={5} className="px-8 py-8 text-center text-slate-400 font-medium">Loading documents...</td></tr>
                                            ) : knowledgeSources.length === 0 ? (
                                                <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">No knowledge sources uploaded yet.</td></tr>
                                            ) : (
                                                knowledgeSources.map(source => (
                                                    <tr key={source._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-8 py-5 font-bold text-slate-800 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                                            </div>
                                                            {source.sourceName}
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className="bg-emerald-100/50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{source.status}</span>
                                                        </td>
                                                        <td className="px-8 py-5 font-mono text-xs font-medium text-slate-500">{source.chunkCount} vectors</td>
                                                        <td className="px-8 py-5 font-medium text-slate-500">{new Date(source.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-8 py-5 text-right">
                                                            <button onClick={() => handleDeleteSource(source._id)} className="text-slate-400 hover:text-red-600 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center ml-auto transition-colors" title="Delete file">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Bot Appearance & Behavior</h2>
                                <p className="text-slate-500 mb-10">Customize how your bot looks and talks to your customers on your website.</p>
                                <div className="space-y-6 max-w-2xl">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Bot Name</label>
                                        <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium bg-[#f8fafc]" placeholder="e.g., Acme Support Agent" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Theme Color</label>
                                        <div onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center gap-4 cursor-pointer p-2 border border-slate-200 bg-[#f8fafc] rounded-xl w-fit hover:bg-slate-100 transition-colors">
                                            <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: colorHex }} />
                                            <span className="font-mono text-sm font-bold text-slate-700 pr-4">{colorHex.toUpperCase()}</span>
                                        </div>
                                        {showColorPicker && (
                                            <div ref={colorPickerRef} className="absolute z-10 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
                                                <HexColorPicker color={colorHex} onChange={setColorHex} />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Welcome Message</label>
                                        <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium bg-[#f8fafc]" placeholder="What should the bot say first?" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">System Prompt (Instructions)</label>
                                        <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 resize-y font-medium bg-[#f8fafc]" placeholder="E.g., You are a helpful customer support agent..." />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-slate-800">AI Configuration</h2>
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Advanced</span>
                                </div>
                                <p className="text-slate-500 mb-10">Select the language model that powers your agent and provide the necessary API keys.</p>
                                <div className="space-y-6 max-w-2xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">LLM Provider</label>
                                            <select value={llmProvider} onChange={handleProviderChange} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 bg-[#f8fafc] font-medium appearance-none">
                                                <option value="GEMINI">Google Gemini</option>
                                                <option value="OPENAI">OpenAI</option>
                                                <option value="ANTHROPIC">Anthropic Claude</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Model Version</label>
                                            <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 bg-[#f8fafc] font-medium appearance-none">
                                                {getAvailableModels().map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200/60">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-sm font-bold text-slate-700">
                                                {llmProvider === 'GEMINI' ? 'Google AI Studio Key (Required)' : llmProvider === 'OPENAI' ? 'OpenAI API Key (Optional)' : 'Anthropic API Key (Optional)'}
                                            </label>
                                            {llmProvider === 'GEMINI' && (
                                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                                                    Get your key <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                                </a>
                                            )}
                                        </div>
                                        <input type="password" value={llmProvider === 'GEMINI' ? apiKeys.gemini : llmProvider === 'OPENAI' ? apiKeys.openai : apiKeys.anthropic} onChange={(e) => setApiKeys({ ...apiKeys, [llmProvider.toLowerCase()]: e.target.value })} className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-slate-800 font-mono text-sm bg-white" placeholder="sk-..." />
                                    </div>
                                </div>
                                <div className="pt-8 mt-10 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        {saveStatus && (
                                            <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleSaveSettings} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-2">
                                        {isSaving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'install' && (
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Install Your Bot</h2>
                            <p className="text-slate-500 mb-10">Copy and paste this code snippet into the <code className="bg-slate-100 px-2 py-1 rounded font-mono text-slate-600 font-bold">&lt;body&gt;</code> of your website to add the chat widget.</p>
                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                                <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80">
                                    <div className="flex gap-2.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    <button onClick={() => navigator.clipboard.writeText(`<script defer src="${API_URL}/api/bots/embed/${botId}"></script>`)} className="text-xs font-bold text-slate-300 hover:text-emerald-400 bg-slate-700/50 hover:bg-slate-700 px-4 py-2 rounded-lg transition-all">
                                        Copy Code
                                    </button>
                                </div>
                                <div className="p-8 overflow-x-auto">
                                    <pre className="text-sm font-mono text-emerald-400"><code>&lt;script src="${API_URL}/api/bots/embed/{botId}"&gt;&lt;/script&gt;</code></pre>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === 'inbox' && (
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col lg:flex-row h-[calc(100vh-160px)] lg:h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className={`w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto bg-white flex-col ${selectedSessionId ? 'hidden lg:flex' : 'flex'}`}>
                                <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">Inbox</h3>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">Live customer chats</p>
                                    </div>
                                    <button onClick={fetchConversations} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3">
                                    {conversations.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center font-medium">
                                            No conversations yet.
                                        </div>
                                    ) : (
                                        conversations.map((conv) => (
                                            <div key={conv._id} onClick={() => setSelectedSessionId(conv.sessionId)} className={`p-4 mb-2 rounded-2xl cursor-pointer transition-all duration-300 ${selectedSessionId === conv.sessionId ? 'bg-emerald-50 shadow-sm' : 'hover:bg-slate-50'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${selectedSessionId === conv.sessionId ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                        <span className={`text-sm font-bold ${selectedSessionId === conv.sessionId ? 'text-emerald-900' : 'text-slate-700'}`}>Visitor {conv.sessionId.substring(5, 9).toUpperCase()}</span>
                                                    </div>
                                                    {conv.isHumanHandoff && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Human</span>}
                                                </div>
                                                <div className={`text-xs truncate ml-4 ${selectedSessionId === conv.sessionId ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                                    {conv.messages[conv.messages.length - 1]?.content || 'Empty chat'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className={`w-full lg:w-2/3 flex-col bg-[#f8fafc] relative ${!selectedSessionId ? 'hidden lg:flex' : 'flex'}`}>
                                {selectedSessionId && (
                                    <div className="lg:hidden p-4 bg-white border-b border-slate-100 flex items-center gap-3 shadow-sm z-10 shrink-0">
                                        <button onClick={() => setSelectedSessionId(null)} className="p-2 -ml-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                        </button>
                                        <span className="font-bold text-slate-800">Conversation</span>
                                    </div>
                                )}
                                {selectedSessionId ? (() => {
                                    const selectedConvo = conversations.find(c => c.sessionId === selectedSessionId);
                                    return (
                                        <>
                                            <div className="flex-1 overflow-y-auto p-8 space-y-6" onScroll={handleScroll}>
                                                {selectedConvo?.messages.map((msg: any, i: number) => (
                                                    <div key={i} className={`flex flex-col max-w-[80%] animate-message-pop ${msg.role === 'user' ? 'self-end items-end origin-bottom-right' : 'self-start items-start origin-bottom-left'}`}>
                                                        <div className={`px-5 py-3.5 rounded-3xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm' : msg.role === 'admin' ? 'bg-amber-500 text-white rounded-bl-sm' : 'bg-white text-slate-700 rounded-bl-sm whitespace-pre-wrap border border-slate-100'}`}>
                                                            {msg.content}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 mt-2 mx-2 font-semibold tracking-wide uppercase">
                                                            {msg.role === 'user' ? 'Visitor' : msg.role === 'admin' ? 'You' : 'AI Assistant'}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div ref={messagesEndRef} />
                                            </div>

                                            {/* Scroll to bottom button */}
                                            {showScrollButton && (
                                                <button
                                                    onClick={scrollToBottom}
                                                    className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-white text-emerald-600 shadow-[0_5px_15px_rgba(0,0,0,0.1)] border border-slate-100 rounded-full p-2.5 hover:bg-slate-50 hover:scale-105 transition-all z-10 animate-in fade-in zoom-in duration-200"
                                                    title="Scroll to bottom"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                                </button>
                                            )}

                                            {/* Handoff UI */}
                                            {selectedConvo && !selectedConvo.isHumanHandoff && (
                                                <div className="p-6 bg-white border-t border-slate-100 flex justify-center shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)]">
                                                    <button onClick={() => handleTakeOver(selectedConvo.sessionId)} className="bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                                        Take Over Chat
                                                    </button>
                                                </div>
                                            )}
                                            {selectedConvo && selectedConvo.isHumanHandoff && (
                                                <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)]">
                                                    <input
                                                        type="text"
                                                        value={adminMessage}
                                                        onChange={(e) => setAdminMessage(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAdminReply()}
                                                        className="flex-1 px-5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 bg-slate-50 transition-all font-medium text-slate-700"
                                                        placeholder="Type your reply to the visitor..."
                                                    />
                                                    <button onClick={handleAdminReply} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20">
                                                        Send
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })() : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-[#f8fafc]">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        </div>
                                        <p className="font-medium text-sm">Select a conversation to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:h-[400px]">
                                {/* Card 1: Visa Style Main Stat */}
                                <div className="lg:col-span-4 bg-emerald-700 rounded-3xl p-8 text-white flex flex-col justify-between shadow-xl shadow-emerald-700/30 relative overflow-hidden group">
                                    {/* Shimmer overlay */}
                                    <div className="absolute inset-0 z-0 bg-[linear-gradient(110deg,transparent,20%,rgba(255,255,255,0.1),40%,transparent)] bg-[length:200%_100%] animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    {/* Decorative circles */}
                                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-600 rounded-full opacity-50 z-0"></div>
                                    <div className="absolute right-12 top-12 w-16 h-16 bg-emerald-500 rounded-full opacity-20 z-0"></div>

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <p className="text-emerald-100 font-medium text-sm mb-1">Total Conversations</p>
                                                <p className="text-xs text-emerald-200 opacity-80">All-time agent sessions</p>
                                            </div>
                                            <div className="w-10 h-10 bg-emerald-600/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="text-5xl font-bold tracking-tight">{analyticsData?.totalConversations?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-emerald-500/30 px-2 py-1 rounded-md text-xs font-bold text-emerald-50">Active</span>
                                            <span className="text-xs text-emerald-200">total volume</span>
                                        </div>
                                    </div>
                                    <div className="relative z-10 flex items-end justify-between mt-8">
                                        <div className="text-emerald-200 font-mono text-sm tracking-widest">
                                            •••• 9090
                                        </div>
                                        <div className="text-emerald-200 text-xs font-medium uppercase tracking-wider">
                                            EmbedAI
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Main Chart (Engagement Rate) */}
                                <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 flex flex-col">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-slate-800 font-bold">Query Volume</h3>
                                                <p className="text-xs text-slate-400">Traffic vs Cache Efficiency</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                                            <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700">Weekly</button>
                                            <button className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm">Monthly</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-[200px]">
                                        {analyticsData?.chartData ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} />
                                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 600, color: '#0f172a' }} />
                                                    <Area type="monotone" name="Total Queries" dataKey="queries" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorQueries)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 text-sm font-medium">Loading chart data...</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Card 3: Cache Hits */}
                                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                            <p className="text-slate-500 font-medium text-sm">Cache Hits</p>
                                        </div>
                                        <div className="flex items-end gap-4">
                                            <span className="text-4xl font-bold text-slate-800">{analyticsData?.cacheHits?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>
                                    <div className="w-24 h-16 bg-emerald-50 rounded-xl relative overflow-hidden hidden sm:block">
                                        {/* Decorative mini sparkline */}
                                        <svg viewBox="0 0 100 40" className="absolute bottom-0 w-full text-emerald-500 fill-current opacity-20"><path d="M0 40 L0 20 Q10 10 20 20 T40 10 T60 25 T80 5 L100 15 L100 40 Z"></path></svg>
                                        <svg viewBox="0 0 100 40" className="absolute bottom-0 w-full text-emerald-500 stroke-current" fill="none" strokeWidth="3" strokeLinecap="round"><path d="M0 20 Q10 10 20 20 T40 10 T60 25 T80 5 L100 15"></path></svg>
                                    </div>
                                </div>

                                {/* Card 4: Costs Saved */}
                                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                            <p className="text-slate-500 font-medium text-sm">API Costs Saved</p>
                                        </div>
                                        <div className="flex items-end gap-4">
                                            <span className="text-4xl font-bold text-slate-800">${analyticsData?.savedCost || "0.00"}</span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'leads' && (
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Captured Leads</h3>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">Contacts collected automatically by your AI agent.</p>
                                </div>
                                <button
                                    onClick={exportLeadsToCSV}
                                    disabled={leads.length === 0}
                                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Export CSV
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-[#f8fafc] text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5">Name</th>
                                            <th className="px-8 py-5">Email</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5 text-right">Date Captured</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {leads.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-8 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                        </div>
                                                        <p className="font-bold text-slate-500">No leads captured yet.</p>
                                                        <p className="text-xs mt-1 font-medium">When a user asks to speak to a human, the AI will collect their info here.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            leads.map((lead) => (
                                                <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5 font-bold text-slate-800">{lead.name}</td>
                                                    <td className="px-8 py-5">
                                                        <a href={`mailto:${lead.email}`} className="text-emerald-600 hover:text-emerald-700 font-medium">{lead.email}</a>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="bg-emerald-100/50 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                                            {lead.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-500">
                                                        {new Date(lead.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- NEW: SECURITY & SESSIONS TAB --- */}
                    {activeTab === 'security' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-800">Active Sessions</h3>
                                <p className="text-sm text-slate-500 mt-1">Manage the devices that are currently logged into your account. You can remotely log out of unrecognized or old devices.</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-white text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">Device / OS</th>
                                            <th className="px-6 py-4">IP Address</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {isLoadingSessions ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Loading sessions...</td></tr>
                                        ) : sessions.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No active sessions found.</td></tr>
                                        ) : (
                                            sessions.map((session) => (
                                                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                                                        {session.deviceType.toLowerCase().includes('mobile') ? (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                                        ) : (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                                        )}
                                                        {session.deviceType}
                                                        <span className="text-xs font-normal text-slate-400 ml-2">
                                                            Since {new Date(session.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs">{session.ipAddress}</td>
                                                    <td className="px-6 py-4">
                                                        {session.isCurrentDevice ? (
                                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                                                Current Device
                                                            </span>
                                                        ) : (
                                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {!session.isCurrentDevice && (
                                                            <button
                                                                onClick={() => handleRevokeSession(session.id)}
                                                                className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors hover:bg-red-50 px-3 py-1.5 rounded-lg"
                                                                title="Log out from this device"
                                                            >
                                                                Revoke Access
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};