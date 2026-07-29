import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface AdminDashboardProps {
    botId: string;
    tenantId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ botId, tenantId }) => {
    const [activeTab, setActiveTab] = useState<'knowledge' | 'settings'>('knowledge');

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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
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
        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Header & Tabs */}
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px' }}>Bot Dashboard</h2>
                <p style={{ margin: '8px 0 0 0', color: '#94a3b8' }}>Manage your custom AI assistant and knowledge base.</p>

                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        style={{
                            background: 'none', border: 'none', color: activeTab === 'knowledge' ? '#60a5fa' : 'white',
                            cursor: 'pointer', fontSize: '16px', fontWeight: activeTab === 'knowledge' ? 600 : 400,
                            padding: '8px 0', borderBottom: activeTab === 'knowledge' ? '2px solid #60a5fa' : '2px solid transparent',
                            transition: 'all 0.2s ease'
                        }}>
                        Knowledge Base
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        style={{
                            background: 'none', border: 'none', color: activeTab === 'settings' ? '#60a5fa' : 'white',
                            cursor: 'pointer', fontSize: '16px', fontWeight: activeTab === 'settings' ? 600 : 400,
                            padding: '8px 0', borderBottom: activeTab === 'settings' ? '2px solid #60a5fa' : '2px solid transparent',
                            transition: 'all 0.2s ease'
                        }}>
                        Bot Settings
                    </button>
                </div>
            </div>

            <div style={{ padding: '32px' }}>

                {/* KNOWLEDGE TAB */}
                {activeTab === 'knowledge' && (
                    <div style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '40px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc'
                    }}>
                        <input type="file" accept="application/pdf" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} id="file-upload" />
                        <label htmlFor="file-upload" style={{ display: 'inline-block', backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginBottom: '16px', transition: 'background-color 0.2s' }}>
                            {file ? 'Change File' : 'Select PDF Document'}
                        </label>

                        {file && (
                            <div style={{ margin: '16px 0', fontSize: '14px', color: '#334155' }}>
                                <strong>Selected:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}

                        <div>
                            <button onClick={handleUpload} disabled={!file || isUploading} style={{ backgroundColor: !file || isUploading ? '#94a3b8' : '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: !file || isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1, transition: 'background-color 0.2s' }}>
                                {isUploading ? 'Processing Vectors...' : 'Train AI'}
                            </button>
                        </div>

                        {uploadStatus && (
                            <div style={{ marginTop: '24px', padding: '12px', borderRadius: '6px', backgroundColor: uploadStatus.type === 'success' ? '#d1fae5' : '#fee2e2', color: uploadStatus.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${uploadStatus.type === 'success' ? '#34d399' : '#f87171'}` }}>
                                {uploadStatus.type === 'success' ? '✅ ' : '❌ '}
                                {uploadStatus.message}
                            </div>
                        )}
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#334155' }}>Bot Name</label>
                            <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box', outlineColor: '#3b82f6' }} />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#334155' }}>Theme Color</label>

                            {/* Color Picker Trigger */}
                            <div
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    width: 'fit-content',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: colorHex,
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
                                }} />
                                <span style={{ fontFamily: 'monospace', color: '#475569', fontWeight: 500, fontSize: '16px' }}>{colorHex.toUpperCase()}</span>
                            </div>

                            {/* Color Picker Popover */}
                            {showColorPicker && (
                                <div ref={colorPickerRef} style={{
                                    position: 'absolute',
                                    zIndex: 10,
                                    marginTop: '8px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #e2e8f0',
                                    padding: '12px'
                                }}>
                                    <HexColorPicker color={colorHex} onChange={setColorHex} />
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#334155' }}>Welcome Message</label>
                            <input type="text" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px', boxSizing: 'border-box', outlineColor: '#3b82f6' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#334155' }}>System Prompt (Personality & Rules)</label>
                            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} placeholder="E.g., You are a helpful customer support agent for Acme Corp..." style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outlineColor: '#3b82f6', resize: 'vertical' }} />
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>This instructs the AI how to behave and answer questions.</p>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <button onClick={handleSaveSettings} disabled={isSaving} style={{ backgroundColor: isSaving ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '6px', fontSize: '16px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 6px -1px rgb(59 130 246 / 0.3)' }}>
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>

                        {saveStatus && (
                            <div style={{ marginTop: '8px', padding: '12px', borderRadius: '6px', backgroundColor: saveStatus.type === 'success' ? '#d1fae5' : '#fee2e2', color: saveStatus.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${saveStatus.type === 'success' ? '#34d399' : '#f87171'}` }}>
                                {saveStatus.type === 'success' ? '✅ ' : '❌ '}
                                {saveStatus.message}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};