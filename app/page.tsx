'use client';

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { ArrowRight, Zap, QrCode, Lock, Calendar, Link as LinkIcon, Globe2, Sparkles, Globe, Check, ChevronDown, Copy, CheckCheck, X, Mail, User } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English', short: 'EN', flag: 'US' },
  { code: 'mn', label: 'Монгол', short: 'MN', flag: 'MN' },
  { code: 'es', label: 'Español', short: 'ES', flag: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR', flag: 'FR' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: 'DE' },
  { code: 'zh', label: '中文', short: 'ZH', flag: 'CN' },
  { code: 'ja', label: '日本語', short: 'JA', flag: 'JP' },
  { code: 'ko', label: '한국어', short: 'KO', flag: 'KR' },
  { code: 'ru', label: 'Русский', short: 'RU', flag: 'RU' },
  { code: 'pt', label: 'Português', short: 'PT', flag: 'BR' },
];

const translations: Record<string, Record<string, string>> = {
  en: {
    platform: "Platform",
    solutions: "Solutions",
    pricing: "Pricing",
    developer: "Developer API",
    signIn: "Sign In",
    getStarted: "Get Started",
    badge: "Neon Cyber URL Infrastructure",
    title1: "Empower your",
    title2: "digital touchpoints globally.",
    desc: "Stop losing audience trust to messy, broken URLs. Securely brand, schedule, and convert every single click with high-performance redirection architecture.",
    uptime: "99.9% Uptime",
    routing: "Global Edge Routing",
    placeholderUrl: "Paste your long destination URL...",
    customAlias: "my-custom-link",
    passPlaceholder: "Enter password to protect the link",
    shortenBtn: "Shorten Now",
    securityText: "Secure processing with neon encrypted protocols.",
    btnCustom: "Custom Link",
    btnPassword: "Password Protection",
    btnExpiration: "Set Expiration",
    btnQR: "Generate QR Code",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
    allRights: "All rights reserved.",
    copyBtn: "Copy",
    copied: "Copied!",
    // Auth Modal text
    welcomeBack: "Welcome Back",
    createAccount: "Create Account",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Enter your password",
    namePlaceholder: "Enter your full name",
    loginBtn: "Sign In",
    signupBtn: "Sign Up",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    switchSignUp: "Sign Up",
    switchSignIn: "Sign In"
  },
  mn: {
    platform: "Платформ",
    solutions: "Шийдэл",
    pricing: "Үнэ",
    developer: "Хөгжүүлэгч API",
    signIn: "Нэвтрэх",
    getStarted: "Эхлэх",
    badge: "Неон Кибер Линк Дэд Бүтэц",
    title1: "Дижитал холбоосоо",
    title2: "дэхий даяар хүчирхэгжүүл.",
    desc: "Эмх замбараагүй линкүүдээс болж хэрэглэгчийн итгэлийг алдахаа зогсоо. Өндөр хурдны чиглүүлэлтээр линкээ хамгаалж, хяна.",
    uptime: "99.9% Ажиллах хугацаа",
    routing: "Дэлхийн сүлжээний чиглүүлэлт",
    placeholderUrl: "Урт линкээ энд хуулж тавина уу...",
    customAlias: "my-custom-link",
    passPlaceholder: "Нууц үгээ оруулна уу",
    shortenBtn: "Богиносох",
    securityText: "Неон шифрлэгдсэн протоколоор найдвартай хамгаалагдсан.",
    btnCustom: "Custom Link",
    btnPassword: "Password Protection",
    btnExpiration: "Set Expiration",
    btnQR: "Generate QR Code",
    privacy: "Нууцлалын бодлого",
    terms: "Үйлчилгээний нөхцөл",
    contact: "Холбоо барих",
    allRights: "Бүх эрх хуулиар хамгаалагдсан.",
    copyBtn: "Хуулах",
    copied: "Хууллаа!",
    // Auth Modal text
    welcomeBack: "Тавтай морилно уу",
    createAccount: "Бүртгүүлэх",
    emailPlaceholder: "Имэйл хаягаа оруулна уу",
    passwordPlaceholder: "Нууц үгээ оруулна уу",
    namePlaceholder: "Бүтэн нэрээ оруулна уу",
    loginBtn: "Нэвтрэх",
    signupBtn: "Бүртгүүлэх",
    noAccount: "Бүртгэлгүй байна уу?",
    hasAccount: "Аль хэдийн бүртгэлтэй юу?",
    switchSignUp: "Бүртгүүлэх",
    switchSignIn: "Нэвтрэх"
  }
};

interface LinkItem {
  id: string;
  shortUrl: string;
  originalUrl: string;
  hasQr: boolean;
}

export default function PowerLinkHomePage() {
  const [url, setUrl] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  const [lang, setLang] = useState('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null);

  const [results, setResults] = useState<LinkItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentLangObj = languages.find(l => l.code === lang) || languages[0];
  const t = translations[lang] || translations.en;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFeature = (feature: string) => {
    if (selectedFeatures.includes(feature)) {
      setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
    } else {
      setSelectedFeatures([...selectedFeatures, feature]);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const alias = (selectedFeatures.includes('custom') && customAlias) 
      ? customAlias 
      : Math.random().toString(36).substring(2, 8);
      
    const short = `https://shoutenlink.com/${alias}`;

    const newItem: LinkItem = {
      id: Math.random().toString(36).substring(2, 9),
      shortUrl: short,
      originalUrl: url,
      hasQr: selectedFeatures.includes('qr'),
    };

    setResults([newItem, ...results]);
    setUrl('');
    setCustomAlias('');
    setPassword('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
  };

  const handleCopy = (id: string, shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <Head>
        <title>PowerLink | Neon Cyber Link Management</title>
      </Head>

      <div className="min-h-screen bg-[#070b12] text-neutral-200 font-sans flex flex-col justify-between selection:bg-blue-500 selection:text-white relative">
        
        {/* Navbar */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070b12]/90 border-b border-blue-900/30">
          <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                <Zap size={20} className="text-white" strokeWidth={3}/>
              </div>
              <span className="text-2xl font-bold tracking-tighter text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                Power<span className='text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]'>Link</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative" ref={langDropdownRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-900/40 bg-[#0a111d] text-blue-200 hover:border-blue-500/60 shadow-[0_0_10px_rgba(30,58,138,0.2)] transition"
                >
                  <Globe size={16} className="text-blue-400" />
                  <span className="uppercase font-semibold">{currentLangObj.flag} {currentLangObj.short}</span>
                  <ChevronDown size={14} className={`transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border border-blue-900/50 bg-[#0a111d] py-2 z-50">
                    {languages.map((item) => {
                      const isSelected = item.code === lang;
                      return (
                        <button
                          key={item.code}
                          onClick={() => { setLang(item.code); setIsLangOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition text-left ${
                            isSelected ? 'bg-blue-600/20 text-blue-300 font-semibold shadow-[inset_0_0_10px_rgba(37,99,235,0.2)]' : 'hover:bg-blue-950/40 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-blue-400 w-6">{item.flag}</span>
                            <span>{item.label}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sign In Товч */}
              <button 
                onClick={() => setAuthModalMode('signin')}
                className="text-sm font-medium text-blue-300 hover:text-white transition px-2"
              >
                {t.signIn}
              </button>

              {/* Get Started Товч */}
              <button 
                onClick={() => setAuthModalMode('signup')}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-500 transition shadow-[0_0_15px_rgba(37,99,235,0.5)] cursor-pointer"
              >
                {t.getStarted}
              </button>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center w-full">
          
          <div className="bg-[#0b1322] border border-blue-900/40 p-6 md:p-8 rounded-3xl shadow-[0_0_30px_rgba(14,165,233,0.1)] relative backdrop-blur-xl">
            
            <form onSubmit={handleGenerate} className="space-y-6">
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full">
                    <input 
                      type="url" 
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={t.placeholderUrl}
                      className="w-full bg-[#05080f] border border-blue-900/50 rounded-xl px-4 py-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-400 focus:shadow-[0_0_15px_rgba(96,165,250,0.4)] transition text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                    <button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold px-6 py-4 rounded-xl transition duration-200 shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-center gap-2 cursor-pointer shrink-0">
                      {t.shortenBtn} <ArrowRight size={18} />
                    </button>

                    <div className="flex items-center gap-2 bg-[#05080f] border border-blue-900/40 p-1.5 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.1)]">
                      <button 
                        type="button"
                        onClick={() => toggleFeature('custom')}
                        title={t.btnCustom}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                          selectedFeatures.includes('custom') ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.8)]' : 'bg-[#0a111d] text-blue-400 hover:bg-blue-950/60 border border-blue-900/50'
                        }`}
                      >
                        <LinkIcon size={16} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => toggleFeature('password')}
                        title={t.btnPassword}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                          selectedFeatures.includes('password') ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-[#0a111d] text-emerald-400 hover:bg-emerald-950/60 border border-emerald-900/50'
                        }`}
                      >
                        <Lock size={16} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => toggleFeature('expiration')}
                        title={t.btnExpiration}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                          selectedFeatures.includes('expiration') ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.8)]' : 'bg-[#0a111d] text-purple-400 hover:bg-purple-950/60 border border-purple-900/50'
                        }`}
                      >
                        <Calendar size={16} />
                      </button>

                      <button 
                        type="button"
                        onClick={() => toggleFeature('qr')}
                        title={t.btnQR}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                          selectedFeatures.includes('qr') ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.8)]' : 'bg-[#0a111d] text-amber-400 hover:bg-amber-950/60 border border-amber-900/50'
                        }`}
                      >
                        <QrCode size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {selectedFeatures.includes('custom') && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="flex items-center gap-2 text-xs font-semibold text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.6)]">
                      <LinkIcon size={14} /> Custom Link
                    </label>
                    <div className="bg-[#05080f] border border-blue-900/50 rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-white shadow-[inset_0_0_10px_rgba(14,165,233,0.1)]">
                      <span className="text-neutral-500">shoutenlink.com/</span>
                      <input 
                        type="text"
                        value={customAlias}
                        onChange={(e) => setCustomAlias(e.target.value)}
                        placeholder={t.customAlias}
                        className="bg-transparent focus:outline-none flex-1 text-white placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {selectedFeatures.includes('password') && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="flex items-center gap-2 text-xs font-semibold text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.6)]">
                      <Lock size={14} /> Password:
                    </label>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.passPlaceholder}
                      className="w-full bg-[#05080f] border border-emerald-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(52,211,153,0.3)] text-white placeholder:text-neutral-600"
                    />
                  </div>
                )}

                {selectedFeatures.includes('expiration') && (
                  <>
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.6)]">
                        <Calendar size={14} /> Start date
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#05080f] border border-purple-900/50 rounded-xl px-4 py-3 text-sm text-neutral-300 focus:outline-none focus:border-purple-400" />
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-[#05080f] border border-purple-900/50 rounded-xl px-4 py-3 text-sm text-neutral-300 focus:outline-none focus:border-purple-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="flex items-center gap-2 text-xs font-semibold text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.6)]">
                        <Calendar size={14} /> End date
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#05080f] border border-purple-900/50 rounded-xl px-4 py-3 text-sm text-neutral-300 focus:outline-none focus:border-purple-400" />
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-[#05080f] border border-purple-900/50 rounded-xl px-4 py-3 text-sm text-neutral-300 focus:outline-none focus:border-purple-400" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {results.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-blue-900/30 max-h-80 overflow-y-auto">
                  {results.map((item) => {
                    const isCopied = copiedId === item.id;
                    return (
                      <div key={item.id} className="p-4 rounded-2xl border bg-[#05080f] border-blue-900/50 shadow-[0_0_15px_rgba(14,165,233,0.15)] flex flex-col sm:flex-row items-center gap-4">
                        {item.hasQr && (
                          <div className="bg-white p-2 rounded-xl shadow-inner border border-blue-500/30 shrink-0">
                            <svg width="60" height="60" viewBox="0 0 25 25" className="fill-current text-neutral-900">
                              <path d="M0 0h7v7H0zM2 2v3h3V2H2zM9 0h2v2H9zM13 0h4v2h-4zM18 0h7v7h-7zM20 2v3h3V2H20zM0 9h2v2H0zM5 9h4v2H5zM11 9h3v2h-3zM16 9h2v2h-2zM21 9h4v2h-4zM0 13h2v2H0zM4 13h3v2H4zM9 13h5v2H9zM17 13h3v2h-3zM22 13h3v2h-3zM0 18h7v7H0zM2 20v3h3v-3H2zM9 18h2v2H9zM13 18h4v2h-4zM18 18h2v2h-2zM21 18h4v2h-4zM23 21h2v4h-2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 w-full overflow-hidden text-center sm:text-left">
                          <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-300 hover:underline block truncate drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">
                            {item.shortUrl}
                          </a>
                          <span className="text-xs text-neutral-500 truncate block mt-0.5">{item.originalUrl}</span>
                          <button 
                            onClick={() => handleCopy(item.id, item.shortUrl)}
                            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              isCopied ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-950/80 text-blue-200 hover:bg-blue-900/80 border border-blue-900'
                            }`}
                          >
                            {isCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
                            {isCopied ? t.copied : t.copyBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </form>
          </div>
        </main>

        {/* AUTH MODAL (Нэвтрэх болон Бүртгүүлэх цонх) */}
        {authModalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0b1322] border border-blue-900/60 p-8 rounded-3xl shadow-[0_0_40px_rgba(37,99,235,0.3)]">
              
              {/* Хаах товч */}
              <button 
                onClick={() => setAuthModalMode(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-[#05080f] border border-blue-900/40 text-neutral-400 hover:text-white transition"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex p-3 rounded-2xl bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)] mb-3">
                  <Zap size={24} className="text-white" strokeWidth={3}/>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {authModalMode === 'signin' ? t.welcomeBack : t.createAccount}
                </h2>
                <p className="text-xs text-neutral-400 mt-1">PowerLink Cyber Ecosystem</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); alert('Success!'); setAuthModalMode(null); }} className="space-y-4">
                
                {authModalMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-blue-400">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500"><User size={16} /></span>
                      <input 
                        type="text" 
                        required 
                        placeholder={t.namePlaceholder}
                        className="w-full bg-[#05080f] border border-blue-900/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-400">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500"><Mail size={16} /></span>
                    <input 
                      type="email" 
                      required 
                      placeholder={t.emailPlaceholder}
                      className="w-full bg-[#05080f] border border-blue-900/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-400">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-500"><Lock size={16} /></span>
                    <input 
                      type="password" 
                      required 
                      placeholder={t.passwordPlaceholder}
                      className="w-full bg-[#05080f] border border-blue-900/50 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(14,165,233,0.4)] mt-2 cursor-pointer"
                >
                  {authModalMode === 'signin' ? t.loginBtn : t.signupBtn}
                </button>

                <div className="text-center pt-3 text-xs text-neutral-400">
                  {authModalMode === 'signin' ? (
                    <>
                      {t.noAccount}{' '}
                      <button type="button" onClick={() => setAuthModalMode('signup')} className="text-blue-400 font-semibold hover:underline">
                        {t.switchSignUp}
                      </button>
                    </>
                  ) : (
                    <>
                      {t.hasAccount}{' '}
                      <button type="button" onClick={() => setAuthModalMode('signin')} className="text-blue-400 font-semibold hover:underline">
                        {t.switchSignIn}
                      </button>
                    </>
                  )}
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-blue-900/30 bg-[#05080f]">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-sm text-neutral-500 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-neutral-300 font-semibold">PowerLink</span>
              <span>© {new Date().getFullYear()} {t.allRights}</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-blue-400 transition">{t.privacy}</a>
              <a href="#" className="hover:text-blue-400 transition">{t.terms}</a>
              <a href="#" className="hover:text-blue-400 transition">{t.contact}</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}