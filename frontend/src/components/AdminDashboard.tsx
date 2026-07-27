import React, { useState, useRef } from 'react';

interface AdminDashboardProps {
    botId: string;
    tenantId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ botId, tenantId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px' }}>Knowledge Base</h2>
                <p style={{ margin: '8px 0 0 0', color: '#94a3b8' }}>Upload PDFs to train your AI assistant.</p>
            </div>

            <div style={{ padding: '32px' }}>
                <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc'
                }}>

                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        id="file-upload"
                    />

                    <label
                        htmlFor="file-upload"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            marginBottom: '16px',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {file ? 'Change File' : 'Select PDF Document'}
                    </label>

                    {file && (
                        <div style={{ margin: '16px 0', fontSize: '14px', color: '#334155' }}>
                            <strong>Selected:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </div>
                    )}

                    <div>
                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            style={{
                                backgroundColor: !file || isUploading ? '#94a3b8' : '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '6px',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: !file || isUploading ? 'not-allowed' : 'pointer',
                                opacity: isUploading ? 0.7 : 1,
                            }}
                        >
                            {isUploading ? 'Processing Vectors...' : 'Train AI'}
                        </button>
                    </div>

                    {/* Status Messages */}
                    {uploadStatus && (
                        <div style={{
                            marginTop: '24px',
                            padding: '12px',
                            borderRadius: '6px',
                            backgroundColor: uploadStatus.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: uploadStatus.type === 'success' ? '#065f46' : '#991b1b',
                            border: `1px solid ${uploadStatus.type === 'success' ? '#34d399' : '#f87171'}`
                        }}>
                            {uploadStatus.type === 'success' ? '✅ ' : '❌ '}
                            {uploadStatus.message}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};