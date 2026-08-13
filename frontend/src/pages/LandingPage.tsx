import React from 'react';
import { Helmet } from 'react-helmet-async';

export const LandingPage: React.FC = () => {

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">

            { }
            <Helmet>
                <title>EmbedAI | Autonomous AI Agents for Customer Support</title>
                <meta name="description" content="Deploy an autonomous AI agent to your website in under 5 minutes. Reduce support costs with our semantic caching layer." />
                <meta property="og:title" content="EmbedAI | Enterprise Customer Support" />
                <meta property="og:description" content="Automate your customer support securely with EmbedAI." />
                <meta property="og:type" content="website" />
            </Helmet>

            { }
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                <polyline points="2 17 12 22 22 17"></polyline>
                                <polyline points="2 12 12 17 22 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800">EmbedAI</span>
                    </div>
                    <nav className="hidden md:flex gap-8 font-medium text-slate-600 text-sm">
                        <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
                        <a href="#docs" className="hover:text-blue-600 transition-colors">Documentation</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <a href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</a>
                        <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg">
                            Get Started
                        </a>
                    </div>
                </div>
            </header>

            { }
            <main>
                <section className="pt-24 pb-20 px-6 max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                        Automate your support.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                            Delight your customers.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Upload your company PDFs, set your brand colors, and deploy an autonomous AI agent to your website in under 5 minutes. Save thousands on API costs with our built-in Semantic Cache.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <a href="/login" className="bg-slate-900 hover:bg-slate-800 text-white text-lg font-semibold px-8 py-4 rounded-full transition-all shadow-xl hover:shadow-2xl flex items-center gap-2">
                            Start Building for Free
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </a>
                        <a href="#features" className="text-slate-600 hover:text-slate-900 font-semibold px-8 py-4 flex items-center gap-2 transition-colors">
                            View Features
                        </a>
                    </div>
                </section>

                { }
                <section id="features" className="bg-white py-24 border-t border-slate-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Enterprise-grade infrastructure.</h2>
                            <p className="text-slate-500 text-lg">Built for speed, security, and maximum ROI.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">Knowledge Ingestion</h3>
                                <p className="text-slate-600 leading-relaxed">Simply upload your PDFs. We automatically chunk, embed, and store your knowledge in a secure vector database.</p>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">Semantic Caching</h3>
                                <p className="text-slate-600 leading-relaxed">Save up to 80% on LLM API costs. Our cache intercepts repeated questions and serves answers instantly with 0 latency.</p>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">Live Human Handoff</h3>
                                <p className="text-slate-600 leading-relaxed">AI can't solve everything. Jump into the live inbox via websockets and take over the chat manually when a customer needs you.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            { }
            <footer className="bg-slate-900 text-slate-400 py-12 text-center text-sm">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} EmbedAI Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};