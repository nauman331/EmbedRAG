import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';

/* ------------------------------------------------------------------ */
/*  Icons — kept as inline SVG to match the existing file, no new dep  */
/* ------------------------------------------------------------------ */
const Icon = {
    stack: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>),
    bolt: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>),
    handoff: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>),
    building: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path></svg>),
    lock: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>),
    chart: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>),
    check: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>),
    arrow: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>),
    chevron: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>),
    menu: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line></svg>),
    close: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>),
    dot: (<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>),
};

/* ------------------------------------------------------------------ */
/*  Motion-safety + reveal-on-scroll                                   */
/* ------------------------------------------------------------------ */
const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const handler = () => setReduced(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return reduced;
};

const FadeIn: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const reduced = usePrefersReducedMotion();

    useEffect(() => {
        if (reduced) { setVisible(true); return; }
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [reduced]);

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
            style={{ transitionDelay: reduced ? '0ms' : `${delay}ms` }}
        >
            {children}
        </div>
    );
};

/* Animates a number up to `target` once its container scrolls into view */
const useCountUp = (target: number, decimals = 0, durationMs = 1200) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState(0);
    const reduced = usePrefersReducedMotion();

    useEffect(() => {
        if (reduced) { setValue(target); return; }
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                const start = performance.now();
                const tick = (now: number) => {
                    const progress = Math.min((now - start) / durationMs, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setValue(Number((target * eased).toFixed(decimals)));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [target, decimals, durationMs, reduced]);

    return { ref, value };
};

/* ------------------------------------------------------------------ */
/*  Signature section — the cache ledger demo                          */
/* ------------------------------------------------------------------ */
type LedgerRow = { id: number; q: string; status: 'pending' | 'miss' | 'hit'; latency: number; cost: number };

const SCRIPT: Omit<LedgerRow, 'status'>[] = [
    { id: 1, q: "What's your refund policy?", latency: 1240, cost: 0.0021 },
    { id: 2, q: "What's your refund policy?", latency: 0, cost: 0 },
    { id: 3, q: 'Do you support annual billing?', latency: 980, cost: 0.0018 },
    { id: 4, q: 'Can I pay yearly instead?', latency: 0, cost: 0 },
];
const RESULT: Record<number, 'miss' | 'hit'> = { 1: 'miss', 2: 'hit', 3: 'miss', 4: 'hit' };

const CacheLedgerDemo: React.FC = () => {
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [playing, setPlaying] = useState(false);
    const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    const saved = rows.filter((r) => r.status === 'hit').reduce((sum, r, i, arr) => {
        const priorMiss = SCRIPT.find((s) => s.q === arr[i].q && RESULT[s.id] === 'miss');
        return sum + (priorMiss ? priorMiss.cost : 0);
    }, 0);
    const hitRate = rows.length ? Math.round((rows.filter((r) => r.status === 'hit').length / rows.length) * 100) : 0;

    const play = useCallback(() => {
        timeouts.current.forEach(clearTimeout);
        timeouts.current = [];
        setRows([]);
        setPlaying(true);

        SCRIPT.forEach((item, idx) => {
            const delayBase = idx * 1500;
            const t1 = setTimeout(() => {
                setRows((prev) => [...prev, { ...item, status: 'pending' }]);
            }, delayBase);
            const t2 = setTimeout(() => {
                setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: RESULT[item.id] } : r)));
                if (idx === SCRIPT.length - 1) setPlaying(false);
            }, delayBase + (RESULT[item.id] === 'hit' ? 350 : 1100));
            timeouts.current.push(t1, t2);
        });
    }, []);

    useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

    return (
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-8 md:p-10 max-w-3xl mx-auto shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between mb-6">
                <span className="text-slate-400 text-xs sm:text-sm font-mono">cache-ledger.log</span>
                <span className="flex gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
                </span>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 text-[11px] font-mono uppercase tracking-wide text-slate-400">
                    <span>Query</span>
                    <span className="text-right pr-1">Latency</span>
                    <span className="text-right w-16">Result</span>
                </div>
                <div className="min-h-[220px] px-4 sm:px-5 divide-y divide-slate-50">
                    {rows.length === 0 && !playing && (
                        <div className="py-16 text-center text-sm text-slate-400 font-mono">run the demo to replay a live conversation</div>
                    )}
                    {rows.map((row) => (
                        <div key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-2 py-3 items-center animate-[fadeIn_0.3s_ease-out]">
                            <span className="text-sm text-slate-700 truncate pr-2">{row.q}</span>
                            <span className="text-xs font-mono text-slate-400 text-right pr-1">
                                {row.status === 'pending' ? '···' : row.status === 'hit' ? '0ms' : `${row.latency}ms`}
                            </span>
                            <span className="text-right w-16">
                                {row.status === 'pending' && (
                                    <span className="text-[11px] font-mono text-slate-400">reasoning</span>
                                )}
                                {row.status === 'miss' && (
                                    <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-500">MISS</span>
                                )}
                                {row.status === 'hit' && (
                                    <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">HIT</span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-slate-50 border-t border-slate-100">
                    <div>
                        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Cache hit rate</p>
                        <p className="text-lg font-bold text-slate-800 font-mono">{hitRate}%</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-mono uppercase tracking-wide text-slate-400">Saved this session</p>
                        <p className="text-lg font-bold text-emerald-600 font-mono">${saved.toFixed(4)}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-6">
                <button
                    onClick={play}
                    disabled={playing}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                    {playing ? 'Replaying conversation…' : rows.length ? 'Run it again' : 'Run the demo'}
                </button>
                <p className="text-xs text-slate-400 max-w-xs">
                    Row 4 rephrases row 3 entirely &mdash; it still hits, because the cache matches on meaning, not exact text.
                </p>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Static content                                                     */
/* ------------------------------------------------------------------ */
const featureCards = [
    { icon: Icon.stack, tone: 'neutral', title: 'Knowledge ingestion', text: 'Upload your PDFs. We chunk, embed, and store them in a secure, metadata-filtered vector database.' },
    { icon: Icon.bolt, tone: 'accent', title: 'Semantic caching', text: 'Repeated questions above 95% similarity are answered instantly, at zero latency and zero API cost.' },
    { icon: Icon.handoff, tone: 'brand', title: 'Live human handoff', text: 'Watch conversations in real time over WebSockets, and take over any chat with one click.' },
    { icon: Icon.building, tone: 'neutral', title: 'True multi-tenancy', text: "Database-level metadata filtering keeps every company's knowledge base sealed off from every other." },
    { icon: Icon.lock, tone: 'neutral', title: 'Bank-grade sessions', text: 'Short-lived JWTs, HttpOnly refresh cookies, and a dashboard to revoke access from any device.' },
    { icon: Icon.chart, tone: 'accent', title: 'ROI analytics', text: 'A live dashboard tracking total queries, cache hit rate, and the dollars your cache has saved.' },
];
const toneClasses: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    accent: 'bg-emerald-100 text-emerald-600',
    brand: 'bg-blue-100 text-blue-600',
};

const steps = [
    { title: 'Visitor asks a question', text: "Your widget sends the message over a WebSocket the moment it's typed." },
    { title: 'Cache checks for a match', text: 'A vector similarity search looks for a question your agent has already answered.' },
    { title: 'Agent reasons and retrieves', text: 'On a cache miss, the LangGraph agent decides whether to query your knowledge base, ask a clarifying question, or call a tool.' },
    { title: 'Answer streams back', text: "The response streams to the widget token by token — or an admin takes over live if it's needed." },
];

const personas = [
    { title: 'Support leads', text: "See exactly which questions the AI handles alone, and step into the ones it can't — without losing context." },
    { title: 'Platform engineers', text: 'Bring your own LLM, self-host the vector index, and keep every tenant\u2019s data provably separate.' },
    { title: 'Founders', text: 'Ship support coverage on day one, then watch the ROI dashboard show exactly what the cache is saving you.' },
];

const stats = [
    { value: 40, suffix: '%', label: 'avg. cost reduction from caching' },
    { value: 5, suffix: ' min', label: 'to deploy your first widget' },
    { value: 95, suffix: '%', label: 'similarity threshold for a cache hit' },
];

const faqs = [
    { q: 'How is a cache hit different from a normal LLM answer?', a: 'A cache hit is served from a prior answer whose question matched the new one above a 95% vector similarity threshold — no model call happens, so it returns in milliseconds at no API cost. A miss goes through the full LangGraph agent.' },
    { q: 'Which LLMs can I use?', a: 'EmbedAI routes between Google Gemini, OpenAI, and Anthropic models per workspace, so you can pick a provider per bot or fail over between them.' },
    { q: "Can one tenant's AI see another tenant's documents?", a: "No. Every document chunk is filtered by workspace at the database level, so a bot can only retrieve knowledge that belongs to its own tenant." },
    { q: 'What happens when I take over a chat?', a: 'Clicking "pause the AI" in the admin inbox stops the agent from responding and hands the WebSocket connection to you in real time, with the full conversation history already loaded.' },
    { q: 'Is this open source?', a: 'Yes — the project is MIT licensed. You can self-host the full stack against your own MongoDB Atlas cluster and LLM API keys.' },
];

const plans = [
    { name: 'Starter', monthly: 0, annual: 0, blurb: 'For testing the widget on one site.', features: ['1 workspace', '500 queries / mo', 'Community support', 'Semantic cache included'], cta: 'Start for free', featured: false },
    { name: 'Growth', monthly: 79, annual: 63, blurb: 'For teams shipping AI support to production.', features: ['5 workspaces', '20,000 queries / mo', 'Live human handoff', 'ROI analytics dashboard', 'Email support'], cta: 'Start free trial', featured: true },
    { name: 'Enterprise', monthly: null, annual: null, blurb: 'For multi-tenant deployments at scale.', features: ['Unlimited workspaces', 'Dedicated vector index', 'SSO & audit logs', 'Uptime SLA', 'Dedicated support'], cta: 'Talk to sales', featured: false },
];

const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#security', label: 'Security' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

/* ------------------------------------------------------------------ */
/*  Small interactive pieces                                           */
/* ------------------------------------------------------------------ */
const StatBlock: React.FC<{ value: number; suffix: string; label: string }> = ({ value, suffix, label }) => {
    const { ref, value: current } = useCountUp(value, 0);
    return (
        <div className="text-center">
            <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono">
                <span ref={ref}>{current}</span>{suffix}
            </p>
            <p className="text-slate-500 mt-2 max-w-[16ch] mx-auto">{label}</p>
        </div>
    );
};

const AccordionItem: React.FC<{ q: string; a: string; open: boolean; onToggle: () => void; id: string }> = ({ q, a, open, onToggle, id }) => (
    <div className="border-b border-slate-200">
        <h3>
            <button
                id={`${id}-btn`}
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-4 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 rounded-sm"
            >
                <span className="text-base sm:text-lg font-semibold text-slate-800">{q}</span>
                <span className={`shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    {Icon.chevron}
                </span>
            </button>
        </h3>
        <div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-btn`}
            className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
            <div className="overflow-hidden">
                <p className="text-slate-600 leading-relaxed pb-5 pr-8">{a}</p>
            </div>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export const LandingPage: React.FC = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [annual, setAnnual] = useState(true);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <Helmet>
                <title>EmbedAI | Autonomous AI Agents for Customer Support</title>
                <meta name="description" content="Deploy an autonomous AI agent to your website in under 5 minutes. Reduce support costs with our semantic caching layer." />
                <meta property="og:title" content="EmbedAI | Enterprise Customer Support" />
                <meta property="og:description" content="Automate your customer support securely with EmbedAI." />
                <meta property="og:type" content="website" />
            </Helmet>

            {/* ---------------- Header ---------------- */}
            <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                <polyline points="2 17 12 22 22 17"></polyline>
                                <polyline points="2 12 12 17 22 12"></polyline>
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800">EmbedAI</span>
                    </a>

                    <nav aria-label="Primary" className="hidden md:flex gap-8 font-medium text-slate-600 text-sm">
                        {navLinks.map((l) => (
                            <a key={l.href} href={l.href} className="hover:text-blue-600 transition-colors">{l.label}</a>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <a href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</a>
                        <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg">
                            Get Started
                        </a>
                    </div>

                    <button
                        className="md:hidden text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-md p-1"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        onClick={() => setMobileOpen((v) => !v)}
                    >
                        {mobileOpen ? Icon.close : Icon.menu}
                    </button>
                </div>

                <div
                    id="mobile-nav"
                    className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-out border-t border-slate-100 ${mobileOpen ? 'max-h-96' : 'max-h-0'}`}
                >
                    <nav aria-label="Mobile" className="flex flex-col px-6 py-4 gap-1">
                        {navLinks.map((l) => (
                            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="py-2.5 text-slate-700 font-medium">
                                {l.label}
                            </a>
                        ))}
                        <a href="/login" onClick={() => setMobileOpen(false)} className="mt-3 text-center bg-blue-600 text-white font-semibold px-5 py-3 rounded-full">
                            Get Started
                        </a>
                    </nav>
                </div>
            </header>

            <main>
                {/* ---------------- Hero ---------------- */}
                <section className="pt-20 sm:pt-28 pb-16 px-6 max-w-7xl mx-auto text-center">
                    <FadeIn>
                        <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full mb-6">
                            {Icon.dot} MIT licensed &middot; self-hostable
                        </span>
                    </FadeIn>
                    <FadeIn delay={80}>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                            Automate your support.<br />
                            Answer it{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10">instantly</span>
                                <span className="absolute left-0 right-0 bottom-1 h-3 sm:h-4 bg-emerald-300/60 -rotate-1 -z-0" aria-hidden="true"></span>
                            </span>{' '}
                            the second time.
                        </h1>
                    </FadeIn>
                    <FadeIn delay={160}>
                        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Upload your company PDFs, set your brand colors, and deploy an autonomous AI agent to your website in under 5 minutes. A built-in semantic cache means you never pay to answer the same question twice.
                        </p>
                    </FadeIn>
                    <FadeIn delay={240}>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a href="/login" className="bg-slate-900 hover:bg-slate-800 text-white text-lg font-semibold px-8 py-4 rounded-full transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900">
                                Start Building for Free
                                {Icon.arrow}
                            </a>
                            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 font-semibold px-8 py-4 flex items-center gap-2 transition-colors">
                                See how it works
                            </a>
                        </div>
                    </FadeIn>
                    <FadeIn delay={320}>
                        <p className="text-xs font-mono text-slate-400 mt-10 tracking-wide">
                            LANGGRAPH AGENTS &middot; MONGODB VECTOR SEARCH &middot; GEMINI / OPENAI / ANTHROPIC
                        </p>
                    </FadeIn>
                </section>

                {/* ---------------- Stats bar ---------------- */}
                <section className="border-y border-slate-200 bg-white py-14">
                    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-10">
                        {stats.map((s) => (
                            <StatBlock key={s.label} {...s} />
                        ))}
                    </div>
                </section>

                {/* ---------------- Cache ledger demo ---------------- */}
                <section className="px-6 py-24">
                    <FadeIn className="max-w-3xl mx-auto text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Watch the cache pay for itself.</h2>
                        <p className="text-slate-500 text-lg">A miss reasons over your knowledge base. A hit — even worded differently — costs nothing.</p>
                    </FadeIn>
                    <FadeIn delay={100}>
                        <CacheLedgerDemo />
                    </FadeIn>
                </section>

                {/* ---------------- How it works ---------------- */}
                <section id="how-it-works" className="bg-white py-24 border-t border-slate-200">
                    <div className="max-w-5xl mx-auto px-6">
                        <FadeIn className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">One message, four decisions.</h2>
                            <p className="text-slate-500 text-lg">What happens between a visitor's question and your agent's answer.</p>
                        </FadeIn>
                        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                            <div className="hidden md:block absolute left-1/2 top-5 bottom-5 w-px bg-slate-200 -translate-x-1/2" aria-hidden="true"></div>
                            {steps.map((step, i) => (
                                <FadeIn key={step.title} delay={i * 90} className="flex gap-5 relative">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-sm font-semibold z-10">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1.5">{step.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{step.text}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- Features ---------------- */}
                <section id="features" className="py-24 border-t border-slate-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <FadeIn className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Enterprise-grade infrastructure.</h2>
                            <p className="text-slate-500 text-lg">Built for speed, security, and maximum ROI.</p>
                        </FadeIn>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {featureCards.map((f, i) => (
                                <FadeIn key={f.title} delay={i * 70}>
                                    <div className="group bg-slate-50 hover:bg-white p-8 rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 h-full">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${toneClasses[f.tone]}`}>
                                            {f.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-3">{f.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{f.text}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- Security ---------------- */}
                <section id="security" className="bg-slate-900 py-24">
                    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <FadeIn>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Security your compliance team will actually sign off on.</h2>
                            <p className="text-slate-400 text-lg leading-relaxed mb-8">
                                Every workspace is isolated at the database level, every session is short-lived, and every device can be revoked in one click.
                            </p>
                            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                                <p className="text-xs font-mono uppercase tracking-wide text-slate-400 mb-3">Active devices</p>
                                <div className="flex items-center justify-between py-2 border-b border-slate-700/60">
                                    <span className="text-sm text-slate-200">Chrome &middot; San Francisco</span>
                                    <span className="text-[11px] font-mono text-emerald-400">this device</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm text-slate-200">Safari &middot; Unknown location</span>
                                    <button className="text-[11px] font-mono text-red-400 hover:text-red-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 rounded-sm">
                                        revoke
                                    </button>
                                </div>
                            </div>
                        </FadeIn>
                        <FadeIn delay={100}>
                            <ul className="space-y-4">
                                {[
                                    'Short-lived JWTs in memory, HttpOnly refresh cookies',
                                    'Concurrent session limits — max 5 devices, remotely revocable',
                                    'Device fingerprinting across OS, browser, and IP',
                                    'Refresh tokens rotate on use; theft triggers full revocation',
                                    'Rate limiting on logins, uploads, and API calls',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-slate-200">
                                        <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            {Icon.check}
                                        </span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </FadeIn>
                    </div>
                </section>

                {/* ---------------- Who it's for ---------------- */}
                <section className="py-24 border-t border-slate-200">
                    <div className="max-w-6xl mx-auto px-6">
                        <FadeIn className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Built for the whole team.</h2>
                            <p className="text-slate-500 text-lg">Different people, same dashboard.</p>
                        </FadeIn>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {personas.map((p, i) => (
                                <FadeIn key={p.title} delay={i * 90}>
                                    <div className="border border-slate-200 rounded-3xl p-8 h-full">
                                        <h3 className="text-xl font-bold text-slate-800 mb-3">{p.title}</h3>
                                        <p className="text-slate-600 leading-relaxed">{p.text}</p>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- Pricing ---------------- */}
                <section id="pricing" className="py-24 border-t border-slate-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <FadeIn className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Pricing that scales with your queries.</h2>
                            <p className="text-slate-500 text-lg">Cache hits are always free — you only pay for what the agent actually has to think about.</p>
                        </FadeIn>

                        <FadeIn delay={80} className="flex items-center justify-center gap-3 mb-14">
                            <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
                            <button
                                role="switch"
                                aria-checked={annual}
                                aria-label="Toggle annual pricing"
                                onClick={() => setAnnual((v) => !v)}
                                className="relative w-12 h-7 rounded-full bg-slate-900 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                            >
                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${annual ? 'translate-x-5' : 'translate-x-0'}`}></span>
                            </button>
                            <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-400'}`}>
                                Annual <span className="text-emerald-600">(save 20%)</span>
                            </span>
                        </FadeIn>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            {plans.map((plan, i) => {
                                const price = plan.monthly === null ? 'Custom' : `$${annual ? plan.annual : plan.monthly}`;
                                return (
                                    <FadeIn key={plan.name} delay={i * 90}>
                                        <div className={`rounded-3xl p-8 flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 ${plan.featured ? 'bg-slate-900 text-white shadow-2xl md:-translate-y-4' : 'bg-slate-50 border border-slate-100 text-slate-900'}`}>
                                            {plan.featured && (
                                                <span className="self-start bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                                                    MOST POPULAR
                                                </span>
                                            )}
                                            <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                            <p className={`text-sm mb-6 ${plan.featured ? 'text-slate-400' : 'text-slate-500'}`}>{plan.blurb}</p>
                                            <div className="mb-6 flex items-baseline gap-1">
                                                <span className="text-4xl font-extrabold">{price}</span>
                                                {plan.monthly !== null && <span className={plan.featured ? 'text-slate-400' : 'text-slate-500'}>/mo</span>}
                                            </div>
                                            <ul className="space-y-3 mb-8 flex-1">
                                                {plan.features.map((f) => (
                                                    <li key={f} className="flex items-start gap-2.5 text-sm">
                                                        <span className={`mt-0.5 shrink-0 ${plan.featured ? 'text-emerald-400' : 'text-emerald-600'}`}>{Icon.check}</span>
                                                        <span className={plan.featured ? 'text-slate-200' : 'text-slate-600'}>{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <a
                                                href="/login"
                                                className={`text-center text-sm font-semibold px-5 py-3 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${plan.featured ? 'bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline-white' : 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900'}`}
                                            >
                                                {plan.cta}
                                            </a>
                                        </div>
                                    </FadeIn>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ---------------- FAQ ---------------- */}
                <section id="faq" className="py-24 border-t border-slate-200">
                    <div className="max-w-3xl mx-auto px-6">
                        <FadeIn className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently asked questions.</h2>
                        </FadeIn>
                        <FadeIn delay={80}>
                            <div>
                                {faqs.map((f, i) => (
                                    <AccordionItem
                                        key={f.q}
                                        id={`faq-${i}`}
                                        q={f.q}
                                        a={f.a}
                                        open={openFaq === i}
                                        onToggle={() => setOpenFaq((v) => (v === i ? null : i))}
                                    />
                                ))}
                            </div>
                        </FadeIn>
                    </div>
                </section>

                {/* ---------------- Final CTA ---------------- */}
                <section className="px-6 py-20">
                    <FadeIn className="max-w-4xl mx-auto bg-slate-900 rounded-3xl px-10 py-16 text-center relative overflow-hidden">
                        <span className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full" aria-hidden="true"></span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative">Your first workspace takes five minutes.</h2>
                        <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto relative">Upload a PDF, pick your brand color, and drop one script tag on your site.</p>
                        <a href="/login" className="relative inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-semibold px-8 py-4 rounded-full transition-all shadow-xl hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">
                            Start Building for Free
                            {Icon.arrow}
                        </a>
                    </FadeIn>
                </section>
            </main>

            {/* ---------------- Footer ---------------- */}
            <footer className="bg-slate-900 text-slate-400 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                        <polyline points="2 17 12 22 22 17"></polyline>
                                        <polyline points="2 12 12 17 22 12"></polyline>
                                    </svg>
                                </div>
                                <span className="text-lg font-bold text-white">EmbedAI</span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs">Autonomous support agents, deployed to your site in minutes.</p>
                        </div>
                        <div>
                            <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white text-sm font-semibold mb-4">Resources</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                                <li><a href="https://github.com/yourusername/embedai" className="hover:text-white transition-colors">GitHub</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
                            <ul className="space-y-3 text-sm">
                                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <p className="text-sm text-center pt-8">&copy; {new Date().getFullYear()} EmbedAI Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};