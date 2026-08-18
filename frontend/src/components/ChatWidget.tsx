import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

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
    // --- Standard Chat States ---
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: welcomeMessage }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // --- Voice AI States & Refs ---
    const [isListening, setIsListening] = useState(false);
    const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
    const accumulatedResponseRef = useRef('');

    // We use a ref to track voice mode inside the socket listener without causing reconnects
    const voiceModeRef = useRef(voiceModeEnabled);
    useEffect(() => {
        voiceModeRef.current = voiceModeEnabled;
    }, [voiceModeEnabled]);

    const [sessionId] = useState(() => {
        const storedId = localStorage.getItem('embedai_session_id');
        if (storedId) return storedId;

        // Use cryptographically secure UUID — Math.random() is predictable and guessable
        const newId = crypto.randomUUID();
        localStorage.setItem('embedai_session_id', newId);
        return newId;
    });

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'bot') {
            setMessages([{ role: 'bot', content: welcomeMessage }]);
        }
    }, [welcomeMessage]);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        // NEW: Join the specific room for this session so the Admin can direct-message this widget!
        socketRef.current.emit('join_session', sessionId);

        socketRef.current.on('bot_response_chunk', (data: { chunk: string }) => {
            setIsLoading(false);

            // Track the full response for TTS
            accumulatedResponseRef.current += data.chunk;

            setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                const lastMessage = newMessages[lastIndex];

                if (lastMessage.role === 'bot') {
                    newMessages[lastIndex] = {
                        ...lastMessage,
                        content: lastMessage.content + data.chunk
                    };
                }
                return newMessages;
            });
        });

        socketRef.current.on('bot_response_done', () => {
            console.log('Bot response completed.');

            // Speak the response if voice mode is currently enabled
            if (voiceModeRef.current && accumulatedResponseRef.current) {
                speakText(accumulatedResponseRef.current);
            }
            accumulatedResponseRef.current = ''; // Reset for the next message
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
            accumulatedResponseRef.current = '';
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            window.parent.postMessage('embedai-open', '*');
        } else {
            window.parent.postMessage('embedai-close', '*');
        }
    }, [isOpen]);

    const speakText = (text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); // Stop any ongoing speech

        // Remove markdown, emojis, and formatting for a cleaner voice output
        const cleanText = text
            .replace(/[*#_`~]/g, '')
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
    };

    const toggleListen = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true; // Show text as they speak

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0].transcript)
                .join('');
            setInputText(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);

            // Provide friendly visual feedback to the user
            if (event.error === 'network') {
                setInputText('Network error: Please check your connection or VPN.');
            } else if (event.error === 'not-allowed') {
                setInputText('Microphone access denied.');
            } else {
                setInputText(`Mic error: ${event.error}`);
            }

            // Clear the error message after 3 seconds
            setTimeout(() => setInputText(''), 3000);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

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
            sessionId,
            message: userMessage,
            history: messages
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
            <style>
                {`
                @keyframes chatOpen {
                    from { opacity: 0; transform: scale(0.8) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes messagePop {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>

            {isOpen && (
                <div
                    className="w-[360px] h-[600px] sm:w-[380px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-5 border border-slate-100 origin-bottom-right"
                    style={{ animation: 'chatOpen 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                    {/* Header */}
                    <div
                        className="text-white px-6 py-5 flex justify-between items-center shadow-sm z-10"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex justify-center items-center overflow-hidden backdrop-blur-sm">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                                    <circle cx="12" cy="5" r="2"></circle>
                                    <path d="M12 7v4"></path>
                                    <line x1="8" y1="16" x2="8" y2="16"></line>
                                    <line x1="16" y1="16" x2="16" y2="16"></line>
                                </svg>
                            </div>
                            <h3 className="m-0 text-base font-semibold tracking-wide">{botName}</h3>
                        </div>

                        <div className="flex gap-2 items-center">
                            {/* Toggle Voice Output Button */}
                            <button
                                onClick={() => {
                                    setVoiceModeEnabled(!voiceModeEnabled);
                                    if (voiceModeEnabled) window.speechSynthesis.cancel();
                                }}
                                className={`text-white/80 hover:text-white p-2 rounded-full transition-colors flex items-center justify-center ${voiceModeEnabled ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                title={voiceModeEnabled ? "Disable Voice Output" : "Enable Voice Output"}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    {voiceModeEnabled ? (
                                        <>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                        </>
                                    ) : (
                                        <>
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                            <line x1="23" y1="9" x2="17" y2="15"></line>
                                            <line x1="17" y1="9" x2="23" y2="15"></line>
                                        </>
                                    )}
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors flex items-center justify-center"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-5 overflow-y-auto bg-slate-50 flex flex-col gap-4 scroll-smooth">
                        {messages.map((msg, idx) => (
                            (msg.content !== '' || isLoading) ? (
                                <div
                                    key={idx}
                                    className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
                                    style={{ animation: 'messagePop 0.3s ease-out forwards' }}
                                >
                                    {msg.role === 'bot' && idx === 0 && (
                                        <span className="text-xs text-slate-500 mb-1 ml-3 font-medium">Assistant</span>
                                    )}
                                    <div
                                        className={`px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-sm
                                            ${msg.role === 'user'
                                                ? 'rounded-[20px] rounded-br-sm text-white'
                                                : 'rounded-[20px] rounded-bl-sm bg-white text-slate-700 border border-slate-100'
                                            }
                                        `}
                                        style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {msg.content === '' ? (
                                            <span className="flex gap-1.5 items-center h-5 px-1">
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                            </span>
                                        ) : msg.content}
                                    </div>
                                </div>
                            ) : null
                        ))}
                        <div ref={messagesEndRef} className="h-px" />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={isListening ? "Listening..." : "Type a message..."}
                            className="flex-1 px-5 py-3.5 rounded-full border outline-none text-[15px] transition-all duration-200"
                            style={{
                                backgroundColor: isFocused || isListening ? '#ffffff' : '#f8fafc',
                                borderColor: isFocused || isListening ? primaryColor : '#e2e8f0',
                                boxShadow: isFocused || isListening ? `0 0 0 3px ${primaryColor}20` : 'none'
                            }}
                        />
                        <button
                            type={inputText.trim() ? "submit" : "button"}
                            onClick={!inputText.trim() ? toggleListen : undefined}
                            disabled={isLoading}
                            className="w-12 h-12 rounded-full flex justify-center items-center transition-all duration-200 disabled:cursor-default shrink-0"
                            style={{
                                backgroundColor: inputText.trim() || isListening ? primaryColor : '#f1f5f9',
                                color: inputText.trim() || isListening ? 'white' : '#94a3b8',
                                boxShadow: inputText.trim() || isListening ? `0 4px 12px ${primaryColor}40` : 'none',
                                transform: (inputText.trim() || isListening) && !isLoading ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            {isListening ? (
                                <span className="w-3.5 h-3.5 bg-white rounded-full animate-ping"></span>
                            ) : inputText.trim() ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[2px]">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    <line x1="12" y1="19" x2="12" y2="23"></line>
                                    <line x1="8" y1="23" x2="16" y2="23"></line>
                                </svg>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute bottom-0 right-0 w-16 h-16 rounded-full text-white flex justify-center items-center transition-all duration-300 hover:-translate-y-1 hover:scale-105 group
                    ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}
                `}
                style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 8px 24px ${primaryColor}50`
                }}
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-12">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        </div>
    );
};