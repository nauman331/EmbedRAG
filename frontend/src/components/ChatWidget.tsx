import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatWidgetProps {
    botId: string;
    botName?: string;
    primaryColor?: string;
    welcomeMessage?: string;
}

interface Message {
    role: 'user' | 'bot';
    content: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
    botId,
    botName = 'Support Assistant',
    primaryColor = '#0b57d0',
    welcomeMessage = 'Hi there! How can I help you today?'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: welcomeMessage }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'bot') {
            setMessages([{ role: 'bot', content: welcomeMessage }]);
        }
    }, [welcomeMessage]);

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');

        socketRef.current.on('bot_response_chunk', (data: { chunk: string }) => {
            setIsLoading(false);
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];

                if (lastMessage.role === 'bot') {
                    lastMessage.content += data.chunk;
                }
                return newMessages;
            });
        });

        socketRef.current.on('bot_response_done', () => {
            console.log('Bot response completed.');
        });

        socketRef.current.on('bot_error', (data: { error: string }) => {
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'bot' && lastMessage.content === '') {
                    lastMessage.content = `❌ ${data.error}`;
                } else {
                    newMessages.push({ role: 'bot', content: `❌ ${data.error}` });
                }
                return newMessages;
            });
            setIsLoading(false);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !socketRef.current) return;

        const userMessage = inputText.trim();

        setMessages((prev) => [
            ...prev,
            { role: 'user', content: userMessage },
            { role: 'bot', content: '' }
        ]);

        setInputText('');
        setIsLoading(true);

        socketRef.current.emit('chat_message', {
            botId,
            message: userMessage,
            history: messages
        });
    };

    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'sans-serif' }}>

            {isOpen && (
                <div style={{
                    width: '350px',
                    height: '500px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    border: '1px solid #e0e0e0'
                }}>

                    {/* Header */}
                    <div style={{
                        backgroundColor: primaryColor,
                        color: 'white',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.3s ease'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{botName}</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {messages.map((msg, idx) => (
                            // Hide the empty bot message until chunks start arriving (unless loading)
                            (msg.content !== '' || isLoading) ? (
                                <div key={idx} style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: msg.role === 'user' ? primaryColor : '#ffffff',
                                    color: msg.role === 'user' ? 'white' : '#333333',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    maxWidth: '80%',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    transition: 'background-color 0.3s ease',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content === '' ? 'Thinking...' : msg.content}
                                </div>
                            ) : null
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} style={{ padding: '12px', backgroundColor: '#ffffff', borderTop: '1px solid #eee', display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type your message..."
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputText.trim()}
                            style={{
                                backgroundColor: primaryColor,
                                color: 'white',
                                border: 'none',
                                padding: '0 16px',
                                borderRadius: '6px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1,
                                transition: 'background-color 0.3s ease'
                            }}
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: primaryColor,
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    transition: 'all 0.3s ease',
                    transform: isOpen ? 'scale(0)' : 'scale(1)'
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        </div>
    );
};