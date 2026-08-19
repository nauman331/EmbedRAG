import React, { useState } from 'react';
import { setAccessToken } from '../utils/api';
import { useApi } from '../hooks/useApi';
import logoUrl from '../assets/logo.png';

interface AuthProps {
    onLoginSuccess: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const fetchApi = useApi();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Client-side validation before hitting the server
        if (!isLogin && companyName.trim().length === 0) {
            return setError('Company name is required.');
        }
        if (password.length < 8) {
            return setError('Password must be at least 8 characters.');
        }

        setIsLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin
            ? { email, password }
            : { email, password, companyName };

        try {
            const res = await fetchApi(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            let data: any = {};
            const text = await res.text();
            
            if (text) {
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.warn('Non-JSON response received:', text);
                }
            }

            if (!res.ok) {
                if (res.status === 502 || res.status === 503) {
                    throw new Error('Server is temporarily starting up or down. Please wait a moment and try again.');
                }
                throw new Error(data.error || `Authentication failed (${res.status})`);
            }

            if (isLogin) {
                setAccessToken(data.accessToken);
                onLoginSuccess(data.user);
            } else {
                setIsLogin(true);
                setError('Registration successful! Please log in.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none animate-float z-0"></div>
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-300/10 rounded-full blur-[80px] pointer-events-none animate-float z-0" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <a href="/">
                        <img src={logoUrl} alt="EmbedAI Logo" className="h-10 md:h-12 w-auto mx-auto mb-6" />
                    </a>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {isLogin ? 'Welcome back' : 'Create your workspace'}
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">
                        {isLogin ? 'Enter your details to access your dashboard.' : 'Start building autonomous agents for your business.'}
                    </p>
                </div>

                {error && (
                    <div className={`p-3 rounded-lg mb-6 text-sm font-medium text-center ${error.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name</label>
                            <input
                                type="text"
                                required
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                                placeholder="Acme Corp"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                            placeholder="you@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 mt-4 disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-500 font-medium">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline"
                    >
                        {isLogin ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};