"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRight, CalendarClock, Check, Copy, Download, ExternalLink, Globe2, Link2, LockKeyhole, QrCode, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { translations, type Language } from "@/lib/translations";

type LinkItem = { alias: string; originalUrl: string; path: string; createdAt: string; startsAt: string | null; expiresAt: string | null; protected: boolean; qr?: string };
type Feature = "custom" | "password" | "schedule" | "qr";
const historyKey = "powerlink.history.v1";
const languageKey = "powerlink.language";
function isLink(value: unknown): value is LinkItem {
  if (!value || typeof value !== "object") return false;
  const item = value as LinkItem;
  return typeof item.alias === "string" && /^[a-zA-Z0-9_-]{3,48}$/.test(item.alias)
    && item.path === "/s/" + item.alias && typeof item.originalUrl === "string"
    && /^https?:\/\//.test(item.originalUrl) && typeof item.createdAt === "string"
    && (item.startsAt === null || typeof item.startsAt === "string")
    && (item.expiresAt === null || typeof item.expiresAt === "string")
    && typeof item.protected === "boolean";
}
export default function Home() {
  const [lang, setLang] = useState<Language>("mn");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [results, setResults] = useState<LinkItem[]>([]);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessRequired, setAccessRequired] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const t = translations[lang];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOrigin(window.location.origin);
      setNow(Date.now());
      try {
        const saved = localStorage.getItem(languageKey);
        if (saved === "mn" || saved === "en") { setLang(saved); document.documentElement.lang = saved; }
        const history: unknown = JSON.parse(localStorage.getItem(historyKey) || "[]");
        if (Array.isArray(history)) setResults(history.filter(isLink).slice(0, 50).map(item => ({ ...item, qr: typeof item.qr === "string" && item.qr.startsWith("data:image/png;base64,") ? item.qr : undefined })));
      } catch { /* History is optional when storage is unavailable. */ }
    });
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);

  function changeLanguage() {
    const next = lang === "mn" ? "en" : "mn";
    setLang(next); document.documentElement.lang = next; setError(""); setNotice("");
    try { localStorage.setItem(languageKey, next); } catch { /* Language still changes for this session. */ }
  }
  function save(items: LinkItem[]) {
    setResults(items);
    try { localStorage.setItem(historyKey, JSON.stringify(items)); } catch { setNotice(t.storageError); }
  }
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const date = (key: string) => { const value = data.get(key); return value ? new Date(String(value)).toISOString() : undefined; };
      const response = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}) }, body: JSON.stringify({
        url: data.get("url"), alias: features.includes("custom") ? data.get("alias") : undefined,
        password: features.includes("password") ? data.get("password") : undefined,
        startsAt: features.includes("schedule") ? date("startsAt") : undefined,
        expiresAt: features.includes("schedule") ? date("expiresAt") : undefined,
      }) });
      const payload = await response.json();
      if (!response.ok) { if (response.status === 401) setAccessRequired(true); setError(t[payload.error as keyof typeof t] || t.serverError); return; }
      const item: LinkItem = payload;
      let message = t.created;
      if (features.includes("qr")) {
        try {
          const QRCode = await import("qrcode");
          item.qr = await QRCode.toDataURL(window.location.origin + item.path, { width: 320, margin: 4, errorCorrectionLevel: "M" });
        } catch { message = t.created + " " + t.qrError; }
      }
      setNotice(message);
      save([item, ...results].slice(0, 50));
      setNow(Date.now()); form.reset();
    } catch { setError(t.serverError); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function copy(item: LinkItem) {
    try {
      await navigator.clipboard.writeText(origin + item.path);
      setCopied(item.alias);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(""), 2000);
    } catch { setError(t.copyError); }
  }
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(origin);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">{t.skip}</a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="PowerLink"><span className="brand-icon"><Zap size={23} fill="currentColor" /></span>Power<span>Link</span></Link>
        <nav aria-label={lang === "mn" ? "Үндсэн цэс" : "Main navigation"}>
          <a className="nav-link" href="#links">{t.nav}<ArrowDown size={14} /></a>
          <button type="button" className="language-button" onClick={changeLanguage} aria-label={lang === "mn" ? "Switch to English" : "Монгол хэл сонгох"}><Globe2 size={17} /><span>{lang === "mn" ? "EN" : "MN"}</span></button>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow"><span />{t.badge}</p>
          <h1 id="hero-title">{t.title}<br /><span>{t.accent}</span></h1>
          <p className="hero-description">{t.intro}</p>
        </section>
        <section className="composer panel" aria-labelledby="form-title">
          <div className="section-heading"><div><h2 id="form-title">{t.formTitle}</h2><p>{t.formHint}</p></div><span className="section-icon"><Link2 size={23} /></span></div>
          <form onSubmit={generate}>
            <fieldset disabled={busy}>
              {accessRequired && <div className="access-field"><label htmlFor="accessToken">{t.accessLabel}</label><input id="accessToken" type="password" value={accessToken} onChange={event => setAccessToken(event.target.value)} autoComplete="off" required maxLength={256} aria-describedby="access-hint" /><p id="access-hint" className="field-hint">{t.accessHint}</p></div>}
              <label htmlFor="url">{t.url}</label>
              <div className="url-row"><input id="url" name="url" type="url" placeholder={t.placeholder} required maxLength={4096} autoComplete="url" /><button className="primary-button" type="submit">{busy ? t.loading : t.shorten}<ArrowRight size={18} /></button></div>
              <p className="options-label">{t.options}</p>
              <div className="feature-row">
                {([{ key: "custom", icon: Link2 }, { key: "password", icon: LockKeyhole }, { key: "schedule", icon: CalendarClock }, { key: "qr", icon: QrCode }] as const).map(({ key, icon: Icon }) => (
                  <button key={key} className="feature-button" type="button" aria-pressed={features.includes(key)} onClick={() => setFeatures(current => current.includes(key) ? current.filter(f => f !== key) : [...current, key])}><Icon size={16} />{t[key]}{features.includes(key) && <Check size={14} />}</button>
                ))}
              </div>
              {features.length > 0 && <div className="feature-fields">
                {features.includes("custom") && <div><label htmlFor="alias">{t.alias}</label><div className="alias-input"><span>/s/</span><input id="alias" name="alias" placeholder="my-link" required pattern="[a-zA-Z0-9_\-]{3,48}" minLength={3} maxLength={48} aria-describedby="alias-hint" /></div><p className="field-hint" id="alias-hint">{t.aliasHint}</p></div>}
                {features.includes("password") && <div><label htmlFor="password">{t.passwordLabel}</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="password-hint" /><p className="field-hint" id="password-hint">{t.passwordHint}</p></div>}
                {features.includes("schedule") && <div><div className="date-row"><div><label htmlFor="startsAt">{t.starts}</label><input id="startsAt" name="startsAt" type="datetime-local" aria-describedby="date-hint" /></div><div><label htmlFor="expiresAt">{t.expires}</label><input id="expiresAt" name="expiresAt" type="datetime-local" required aria-describedby="date-hint" /></div></div><p className="field-hint" id="date-hint">{t.dateHint}</p></div>}
                {features.includes("qr") && <p className="field-hint"><QrCode size={15} />{t.download}</p>}
              </div>}
            </fieldset>
          </form>
          <div className="feedback" aria-live="polite">{error && <p className="error-message" role="alert">{error}</p>}{notice && <p className="success-message">{notice}</p>}</div>
          <p className="composer-note"><LockKeyhole size={13} />{t.note}</p>
        </section>
        <section className="history" id="links" aria-labelledby="history-title">
          <div className="section-heading"><div><h2 id="history-title">{t.history}<span className="count">{results.length}</span></h2><p>{t.historyHint}</p></div></div>
          {results.length === 0 ? <div className="empty-state"><span className="empty-icon"><Link2 size={26} /></span><h3>{t.empty}</h3><p>{t.emptyHint}</p></div> : <div className="link-list">{results.map(item => {
            const state = item.expiresAt && Date.parse(item.expiresAt) <= now ? "expired" : item.startsAt && Date.parse(item.startsAt) > now ? "scheduled" : "active";
            return <article className="link-card" key={item.alias}>
              <div className="link-info"><div className="link-top"><a href={item.path} target="_blank" rel="noopener noreferrer">{origin}{item.path}<ExternalLink size={14} /></a><span className={"status " + state}>{t[state]}</span>{item.protected && <span className="protected-badge"><LockKeyhole size={12} />{t.protected}</span>}</div><p className="destination" title={item.originalUrl}>{item.originalUrl}</p>
              <div className="link-actions"><button type="button" onClick={() => copy(item)}>{copied === item.alias ? <Check size={15} /> : <Copy size={15} />}{copied === item.alias ? t.copied : t.copy}</button>{item.qr && <a href={item.qr} download={item.alias + "-qr.png"}><Download size={15} />{t.download}</a>}<button type="button" className="remove-button" aria-label={t.remove + ": " + item.alias} onClick={() => { setNotice(t.removeHint); save(results.filter(link => link.alias !== item.alias)); }}><Trash2 size={15} /><span>{t.remove}</span></button></div></div>
              {/* QR data is generated locally; no destination is sent to an external image service. */}
              {item.qr && <a href={item.qr} download={item.alias + "-qr.png"} aria-label={t.download + ": " + item.alias}><Image unoptimized className="qr-image" src={item.qr} alt={"QR: " + origin + item.path} width={96} height={96} /></a>}
            </article>;
          })}</div>}
          {results.length > 0 && local && <p className="local-note">{t.local}</p>}
        </section>
        <details className="help"><summary>{t.how}</summary><p>{t.help}</p></details>
      </main>
      <footer><span className="footer-brand"><Zap size={15} />PowerLink</span><span>{t.footer}</span><span>© {new Date().getFullYear()}</span></footer>
    </div>
  );
}
