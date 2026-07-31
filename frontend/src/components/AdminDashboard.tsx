import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface AdminDashboardProps {
    botId: string;
    tenantId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ botId, tenantId }) => {
    const [activeTab, setActiveTab] = useState<'knowledge' | 'settings' | 'install' | 'inbox'>('knowledge');

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [botName, setBotName] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [colorHex, setColorHex] = useState('#000000');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    const fetchConversations = () => {
        fetch(`http://localhost:5000/api/conversations/${botId}`)
            .then(res => res.json())
            .then(data => setConversations(data))
            .catch(err => console.error("Failed to fetch conversations", err));
    };

    useEffect(() => {
        if (activeTab === 'inbox') {
            fetchConversations();
        }
    }, [activeTab, botId]);

    useEffect(() => {
        const fetchBotConfig = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/bots/${botId}`);
                const data = await response.json();

                if (response.ok) {
                    setBotName(data.name || '');
                    setSystemPrompt(data.systemPrompt || '');
                    setWelcomeMessage(data.welcomeMessage || '');
                    setColorHex(data.colorHex || '#000000');
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
            const response = await fetch(`http://localhost:5000/api/knowledge/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload document');
            }

            setUploadStatus({
                type: 'success',
                message: `Success! Created ${data.chunksCreated} vector chunks from your document.`
            });
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error: any) {
            setUploadStatus({ type: 'error', message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            const response = await fetch(`http://localhost:5000/api/bots/${botId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: botName,
                    systemPrompt,
                    welcomeMessage,
                    colorHex
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

    return (
        <div className="flex flex-col md:flex-row gap-8 mt-4">

            {/* Sidebar Navigation */}
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

                    { }
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
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                { }
                {activeTab === 'knowledge' && (
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
                                        {uploadStatus.type === 'success' ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                        )}
                                        {uploadStatus.message}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${!file || isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Processing...
                                    </>
                                ) : 'Process Document'}
                            </button>
                        </div>
                    </div>
                )}

                { }
                {activeTab === 'settings' && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bot Appearance & Behavior</h2>
                        <p className="text-slate-500 mb-8">Customize how your bot looks and talks to your customers on your website.</p>

                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Bot Name</label>
                                <input
                                    type="text"
                                    value={botName}
                                    onChange={(e) => setBotName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
                                    placeholder="e.g., Acme Support Agent"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Theme Color</label>
                                <div
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="flex items-center gap-3 cursor-pointer p-2 border border-slate-300 rounded-lg w-fit hover:bg-slate-50 transition-colors"
                                >
                                    <div
                                        className="w-8 h-8 rounded-md border border-slate-200 shadow-inner"
                                        style={{ backgroundColor: colorHex }}
                                    />
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
                                <input
                                    type="text"
                                    value={welcomeMessage}
                                    onChange={(e) => setWelcomeMessage(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
                                    placeholder="What should the bot say first?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">System Prompt (Instructions)</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 resize-y"
                                    placeholder="E.g., You are a helpful customer support agent. Be polite, concise, and only use the provided knowledge base."
                                />
                                <p className="text-xs text-slate-500 mt-2">These hidden instructions dictate the AI's personality and boundaries.</p>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    {saveStatus && (
                                        <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg ${saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {saveStatus.type === 'success' ? '✅' : '❌'} {saveStatus.message}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving...' : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                            Save Settings
                                        </>
                                    )}
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
                                <button
                                    onClick={() => navigator.clipboard.writeText(`<script src="http://localhost:5000/api/bots/embed/${botId}"></script>`)}
                                    className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
                                >
                                    Copy Code
                                </button>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <pre className="text-sm font-mono text-emerald-400">
                                    <code>
                                        &lt;script src="http://localhost:5000/api/bots/embed/{botId}"&gt;&lt;/script&gt;
                                    </code>
                                </pre>
                            </div>
                        </div>

                        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4">
                            <div className="mt-1 text-blue-600">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900 mb-1">How it works</h4>
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    This script is a tiny snippet that injects a secure iframe into your website. It completely isolates the bot's styling from your website's CSS, ensuring it always looks perfect and never breaks your existing layout.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* INBOX TAB */}
                {activeTab === 'inbox' && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Left side: List of conversations */}
                        <div className="w-1/3 border-r border-slate-200 overflow-y-auto bg-slate-50 flex flex-col">
                            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800">Chat History</h3>
                                    <p className="text-xs text-slate-500 mt-1">Live customer conversations</p>
                                </div>
                                <button
                                    onClick={fetchConversations}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Refresh Inbox"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {conversations.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                                        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                        No conversations yet.
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv._id}
                                            onClick={() => setSelectedSessionId(conv.sessionId)}
                                            className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedSessionId === conv.sessionId ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-100 border-l-4 border-l-transparent'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-semibold text-slate-700">Visitor {conv.sessionId.substring(5, 9).toUpperCase()}</span>
                                                <span className="text-xs text-slate-400 font-medium">{new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 truncate mt-1">
                                                {conv.messages[conv.messages.length - 1]?.content || 'Empty chat'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right side: Messages */}
                        <div className="w-2/3 flex flex-col bg-white">
                            {selectedSessionId ? (
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {conversations.find(c => c.sessionId === selectedSessionId)?.messages.map((msg: any, i: number) => (
                                        <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <span className="text-[11px] text-slate-400 mb-1.5 mx-2 font-medium">
                                                {msg.role === 'user' ? 'Visitor' : 'AI Assistant'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm whitespace-pre-wrap'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                    <svg className="w-16 h-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                                    Select a conversation to view the transcript
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};