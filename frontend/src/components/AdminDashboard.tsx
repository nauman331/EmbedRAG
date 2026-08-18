import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchWithAuth, API_URL } from '../utils/api';

interface AdminDashboardProps {
    botId: string;
    tenantId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ botId, tenantId }) => {
    const [activeTab, setActiveTab] = useState<'knowledge' | 'settings' | 'install' | 'inbox' | 'analytics' | 'leads' | 'security'>('settings');

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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

    useEffect(() => {
        if (activeTab === 'inbox' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversations, selectedSessionId, activeTab]);

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
        formData.append('tenantId', tenantId);
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
        <div className="w-full max-w-6xl mx-auto flex gap-6 h-[calc(100vh-8rem)]">
            {!apiKeys.gemini && (
                <div className="fixed top-16 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 text-center shadow-md">
                    <p className="text-sm font-medium">
                        ⚠️ <strong>Action Required:</strong> You must configure your Google Gemini API Key in the <button onClick={() => setActiveTab('settings')} className="underline font-bold hover:text-red-100">Settings</button> tab before your chatbot can answer questions.
                    </p>
                </div>
            )}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'knowledge' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                        Knowledge Base
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Bot Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('install')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'install' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        Install to Website
                    </button>
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'inbox' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><polyline points="21 3 15 3 15 7 9 7 9 3 3 3 3 21 21 21 21 3z"></polyline><path d="M21 3L3 3M15 3L9 3"></path></svg>
                        Inbox
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'leads' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Captured Leads
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Security & Sessions
                    </button>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                {activeTab === 'knowledge' && (
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Train your AI</h2>
                            <p className="text-slate-500 mb-8">Upload documents to expand your bot's knowledge base. It will use this context to answer customer queries.</p>

                            <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all hover:bg-slate-100 hover:border-blue-300">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-1">Upload PDF Document</h3>
                                <p className="text-sm text-slate-500 mb-6 max-w-sm">Drag and drop your file here, or click the button below to browse your computer.</p>
                                <input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="file-upload" />
                                <label htmlFor="file-upload" className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-medium cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                    {file ? 'Change File' : 'Browse Files'}
                                </label>

                                {file && (
                                    <div className="mt-6 flex items-center gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm w-full max-w-md">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                                <div>
                                    {uploadStatus && (
                                        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                            {uploadStatus.type === 'success' ? '✅' : '❌'} {uploadStatus.message}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || isUploading}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${!file || isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                                >
                                    {isUploading ? 'Processing...' : 'Process Document'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
                            <div className="p-6 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800">Active Knowledge Sources</h3>
                                <p className="text-sm text-slate-500">Manage the files your AI currently has access to.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">File Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Data Chunks</th>
                                            <th className="px-6 py-4">Date Uploaded</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoadingSources ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading documents...</td></tr>
                                        ) : knowledgeSources.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No knowledge sources uploaded yet.</td></tr>
                                        ) : (
                                            knowledgeSources.map(source => (
                                                <tr key={source._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                                                        {source.sourceName}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">{source.status}</span>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs">{source.chunkCount} vectors</td>
                                                    <td className="px-6 py-4">{new Date(source.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => handleDeleteSource(source._id)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50" title="Delete file and vector data">
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bot Appearance & Behavior</h2>
                            <p className="text-slate-500 mb-8">Customize how your bot looks and talks to your customers on your website.</p>
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Bot Name</label>
                                    <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800" placeholder="e.g., Acme Support Agent" />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Theme Color</label>
                                    <div onClick={() => setShowColorPicker(!showColorPicker)} className="flex items-center gap-3 cursor-pointer p-2 border border-slate-300 rounded-lg w-fit hover:bg-slate-50 transition-colors">
                                        <div className="w-8 h-8 rounded-md border border-slate-200 shadow-inner" style={{ backgroundColor: colorHex }} />
                                        <span className="font-mono text-sm font-medium text-slate-600 pr-2">{colorHex.toUpperCase()}</span>
                                    </div>
                                    {showColorPicker && (
                                        <div ref={colorPickerRef} className="absolute z-10 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-3">
                                            <HexColorPicker color={colorHex} onChange={setColorHex} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Welcome Message</label>
                                    <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800" placeholder="What should the bot say first?" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">System Prompt (Instructions)</label>
                                    <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 resize-y" placeholder="E.g., You are a helpful customer support agent..." />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-slate-800">AI Configuration</h2>
                                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">Advanced</span>
                            </div>
                            <p className="text-slate-500 mb-8">Select the language model that powers your agent and provide the necessary API keys.</p>
                            <div className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">LLM Provider</label>
                                        <select value={llmProvider} onChange={handleProviderChange} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 bg-white">
                                            <option value="GEMINI">Google Gemini</option>
                                            <option value="OPENAI">OpenAI</option>
                                            <option value="ANTHROPIC">Anthropic Claude</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Model Version</label>
                                        <select value={llmModel} onChange={(e) => setLlmModel(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 bg-white">
                                            {getAvailableModels().map(model => (
                                                <option key={model} value={model}>{model}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            {llmProvider === 'GEMINI' ? 'Google AI Studio Key (Required)' : llmProvider === 'OPENAI' ? 'OpenAI API Key (Optional)' : 'Anthropic API Key (Optional)'}
                                        </label>
                                        {llmProvider === 'GEMINI' && (
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                Get your key here <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            </a>
                                        )}
                                    </div>
                                    <input type="password" value={llmProvider === 'GEMINI' ? apiKeys.gemini : llmProvider === 'OPENAI' ? apiKeys.openai : apiKeys.anthropic} onChange={(e) => setApiKeys({ ...apiKeys, [llmProvider.toLowerCase()]: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 font-mono text-sm" placeholder="sk-..." />
                                </div>
                            </div>
                            <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    {saveStatus && (
                                        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleSaveSettings} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'install' && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Install Your Bot</h2>
                        <p className="text-slate-500 mb-8">Copy and paste this code snippet into the <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">&lt;body&gt;</code> of your website to add the chat widget.</p>
                        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <button onClick={() => navigator.clipboard.writeText(`<script src="${API_URL}/api/bots/embed/${botId}"></script>`)} className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors">
                                    Copy Code
                                </button>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono text-emerald-400"><code>&lt;script src="${API_URL}/api/bots/embed/{botId}"&gt;&lt;/script&gt;</code></pre>
                            </div>
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'inbox' && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="w-1/3 border-r border-slate-200 overflow-y-auto bg-slate-50 flex flex-col">
                            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800">Chat History</h3>
                                    <p className="text-xs text-slate-500 mt-1">Live customer conversations</p>
                                </div>
                                <button onClick={fetchConversations} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {conversations.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                                        No conversations yet.
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div key={conv._id} onClick={() => setSelectedSessionId(conv.sessionId)} className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedSessionId === conv.sessionId ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-100 border-l-4 border-l-transparent'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-semibold text-slate-700">Visitor {conv.sessionId.substring(5, 9).toUpperCase()}</span>
                                                {conv.isHumanHandoff && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Human</span>}
                                            </div>
                                            <div className="text-xs text-slate-600 truncate mt-1">
                                                {conv.messages[conv.messages.length - 1]?.content || 'Empty chat'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="w-2/3 flex flex-col bg-white">
                            {selectedSessionId ? (() => {
                                const selectedConvo = conversations.find(c => c.sessionId === selectedSessionId);
                                return (
                                    <>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                            {selectedConvo?.messages.map((msg: any, i: number) => (
                                                <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                                                    <span className="text-[11px] text-slate-400 mb-1.5 mx-2 font-medium">
                                                        {msg.role === 'user' ? 'Visitor' : msg.role === 'admin' ? 'You (Admin)' : 'AI Assistant'}
                                                    </span>
                                                    <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : msg.role === 'admin' ? 'bg-amber-500 text-white rounded-bl-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm whitespace-pre-wrap'}`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Handoff UI */}
                                        {selectedConvo && !selectedConvo.isHumanHandoff && (
                                            <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50">
                                                <button onClick={() => handleTakeOver(selectedConvo.sessionId)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                                    Take Over Chat (Pause AI)
                                                </button>
                                            </div>
                                        )}
                                        {selectedConvo && selectedConvo.isHumanHandoff && (
                                            <div className="p-4 border-t border-slate-100 bg-amber-50 flex gap-3">
                                                <input
                                                    type="text"
                                                    value={adminMessage}
                                                    onChange={(e) => setAdminMessage(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAdminReply()}
                                                    className="flex-1 px-4 py-2.5 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                                    placeholder="Type a message to the customer..."
                                                />
                                                <button onClick={handleAdminReply} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
                                                    Send Reply
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })() : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                                    Select a conversation to view the transcript
                                </div>
                            )}
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'analytics' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Performance & ROI</h2>
                            <p className="text-slate-500">Monitor your agent's usage and see how much the semantic cache is saving you.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    </div>
                                    <h3 className="text-slate-600 font-semibold">Total Sessions</h3>
                                </div>
                                <span className="text-3xl font-bold text-slate-800">{analyticsData?.totalConversations || 0}</span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                    </div>
                                    <h3 className="text-slate-600 font-semibold">Cache Hits</h3>
                                </div>
                                <span className="text-3xl font-bold text-slate-800">{analyticsData?.cacheHits || 0}</span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="w-10 h-10 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                    </div>
                                    <h3 className="text-slate-600 font-semibold">API Costs Saved</h3>
                                </div>
                                <span className="text-3xl font-bold text-emerald-600 relative z-10">${analyticsData?.savedCost || "0.00"}</span>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Traffic vs Cache Efficiency</h3>
                            </div>
                            <div className="h-[350px] w-full">
                                {analyticsData?.chartData ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 600 }} />
                                            <Area type="monotone" name="Total Queries" dataKey="queries" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
                                            <Area type="monotone" name="Cache Hits" dataKey="cacheHits" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCache)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm">Loading chart data...</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'leads' && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Captured Leads</h3>
                                <p className="text-sm text-slate-500 mt-1">Contacts collected automatically by your AI agent.</p>
                            </div>
                            <button
                                onClick={exportLeadsToCSV}
                                disabled={leads.length === 0}
                                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-white text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Date Captured</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                                    <p className="font-medium">No leads captured yet.</p>
                                                    <p className="text-xs mt-1">When a user asks to speak to a human, the AI will collect their info here.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        leads.map((lead) => (
                                            <tr key={lead._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-800">{lead.name}</td>
                                                <td className="px-6 py-4">
                                                    <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
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
    );
};