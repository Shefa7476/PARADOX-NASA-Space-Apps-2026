import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, BookOpen, Eraser, Lightbulb, LoaderCircle, RefreshCw, Send, ShieldCheck, Sparkles, Square, Volume2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ASK_AI_EVENT, askTutor, getTutorStatus } from "../services/tutorApi";
import { speakAloud, stopSpeaking } from "../audio/sfx";
import MarkdownText from "./MarkdownText";

const WELCOME = {
  en: "Hi, I'm Zippy, your AI Co-Pilot! Ask me anything about space or the question you're working on. 🚀",
  bn: "হ্যালো, আমি জিপি, তোমার এআই কো-পাইলট! মহাকাশ বা এখনকার প্রশ্ন নিয়ে যা খুশি জিজ্ঞেস করো। 🚀",
};
const LABELS = {
  en: { placeholder: "Ask Zippy a question…", more: "Explain more", example: "Give example", bangla: "Explain in Bangla", simpler: "Explain simply", related: "Related questions", clear: "Clear chat", sources: "Sources", privacy: "Don't share personal details. Chats are not saved." },
  bn: { placeholder: "জিপিকে প্রশ্ন করো…", more: "আরও বুঝিয়ে দাও", example: "উদাহরণ দাও", bangla: "বাংলায় বুঝিয়ে দাও", simpler: "সহজ করে বলো", related: "সম্পর্কিত প্রশ্ন", clear: "চ্যাট মুছুন", sources: "উৎস", privacy: "ব্যক্তিগত তথ্য শেয়ার করো না। চ্যাট সংরক্ষণ করা হয় না।" },
};
const MAX_CHARS = 600;
const ACTIONS = [
  { mode: "more", en: "Can you explain more?", bn: "আরও বুঝিয়ে দাও" },
  { mode: "example", en: "Can you give me an example?", bn: "একটা উদাহরণ দাও" },
  { mode: "bangla", en: "Please explain this in Bangla.", bn: "বাংলায় বুঝিয়ে দাও" },
  { mode: "simpler", en: "Can you explain it more simply?", bn: "আরও সহজভাবে বুঝিয়ে দাও" },
  { mode: "related", en: "What related questions could I explore?", bn: "সম্পর্কিত প্রশ্ন কী কী?" },
];

function contextLabel(ctx) {
  return [ctx.planet, ctx.difficulty, ctx.topic].filter(Boolean).join(" · ");
}

export default function AskAIChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({});
  const [messages, setMessages] = useState([]); // {role, content, provider?, notice?, divider?}
  const [suggestions, setSuggestions] = useState(["Why is Mars red?", "What happens if astronauts remove their helmets?", "Why does Jupiter have so many moons?"]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(() => { try { return localStorage.getItem("paradox_ai_lang") || "en"; } catch { return "en"; } });
  const [status, setStatus] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const [lastRequest, setLastRequest] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const L = LABELS[language];

  const send = useCallback(async (text, mode = "chat", ctxOverride) => {
    const content = (text || "").trim().slice(0, MAX_CHARS);
    if (!content || loading) return;
    const ctx = ctxOverride || context;
    const history = [...messagesRef.current.filter((m) => !m.divider && !m.welcome), { role: "user", content }];
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setError("");
    setLoading(true);
    setLastRequest({ text: content, mode, ctx });
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const data = await askTutor({
        messages: history.slice(-12).map(({ role, content: c }) => ({ role, content: c })),
        context: ctx, mode, language, signal: controller.signal,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, provider: data.provider, notice: data.notice, learnMore: data.learn_more, sources: data.sources || [], lang: mode === "bangla" || language === "bn" ? "bn" : "en" }]);
      if (Array.isArray(data.suggestions) && data.suggestions.length) setSuggestions(data.suggestions);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(err.message);
        setMessages((prev) => prev.slice(0, -1)); // let the student resend
      }
    } finally {
      setLoading(false);
    }
  }, [context, language, loading]);

  // Open from anywhere: openAskAI(context, prompt)
  useEffect(() => {
    const onAsk = (event) => {
      const ctx = event.detail?.context || {};
      const prompt = event.detail?.prompt || "";
      setOpen(true);
      setContext(ctx);
      if (contextLabel(ctx)) setMessages((prev) => [...prev, { divider: true, content: contextLabel(ctx) }]);
      if (prompt) window.setTimeout(() => send(prompt, event.detail?.mode || "chat", ctx), 0);
      else window.setTimeout(() => inputRef.current?.focus(), 60);
    };
    window.addEventListener(ASK_AI_EVENT, onAsk);
    return () => window.removeEventListener(ASK_AI_EVENT, onAsk);
  }, [send]);

  useEffect(() => {
    if (!open || status || !user) return;
    getTutorStatus().then(setStatus).catch(() => setStatus({ ai_enabled: false, unreachable: true }));
  }, [open, status, user]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => { abortRef.current?.abort(); stopSpeaking(); }, []);

  if (!user) return null;

  function changeLanguage(next) {
    setLanguage(next);
    try { localStorage.setItem("paradox_ai_lang", next); } catch { /* ignore */ }
  }

  function readAloud(text, index) {
    if (speakingIndex === index) { stopSpeaking(); setSpeakingIndex(-1); return; }
    const ok = speakAloud(text, { lang: language === "bn" ? "bn-BD" : "en-US", onEnd: () => setSpeakingIndex(-1) });
    setSpeakingIndex(ok ? index : -1);
    if (!ok) setError("Read aloud isn't supported in this browser.");
  }

  function clearChat() {
    abortRef.current?.abort();
    stopSpeaking();
    setSpeakingIndex(-1);
    setMessages([]);
    setError("");
    setLoading(false);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const shown = messages.length ? messages : [{ role: "assistant", content: WELCOME[language], welcome: true }];

  return (
    <>
      {!open && (
        <button type="button" className="ask-ai-fab" onClick={() => setOpen(true)} aria-label="Ask AI Co-Pilot Zippy a question">
          <Sparkles size={17} /> <span>Ask AI</span>
        </button>
      )}
      {open && (
        <aside className="ai-chat" role="dialog" aria-modal="false" aria-label="AI Co-Pilot chat">
          <header className="ai-chat-head">
            <span className="ai-avatar" aria-hidden="true"><Bot size={20} /></span>
            <div className="ai-head-copy">
              <b>Zippy · AI Co-Pilot</b>
              <small>
                {status?.ai_enabled ? <><i className="dot ok" /> AI online</> : status ? <><i className="dot off" /> Offline study guide</> : "Connecting…"}
              </small>
            </div>
            <div className="ai-lang" role="group" aria-label="Answer language">
              <button type="button" className={language === "en" ? "on" : ""} aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>EN</button>
              <button type="button" className={language === "bn" ? "on" : ""} aria-pressed={language === "bn"} onClick={() => changeLanguage("bn")}>বাংলা</button>
            </div>
            <button type="button" className="ai-icon" onClick={clearChat} aria-label={L.clear} title={L.clear}><Eraser size={16} /></button>
            <button type="button" className="ai-icon" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
          </header>
          {contextLabel(context) && <div className="ai-context-chip"><Lightbulb size={13} /> Talking about: <b>{contextLabel(context)}</b></div>}
          {status && !status.ai_enabled && (
            <div className="ai-offline-note">{status.unreachable ? "Can't reach the backend right now." : "AI isn't configured on this server yet, so Zippy answers from PARADOX's checked fact sheets. A grown-up can add an AI key in backend/.env."}</div>
          )}

          <div className="ai-messages" ref={listRef} aria-live="polite">
            {shown.map((m, i) => m.divider ? (
              <div key={i} className="ai-divider"><span>{m.content}</span></div>
            ) : (
              <div key={i} className={`ai-msg ${m.role === "user" ? "from-user" : "from-ai"}`}>
                {m.role !== "user" && <span className="ai-msg-avatar" aria-hidden="true">🤖</span>}
                <div className="ai-bubble">
                  {m.role === "assistant" && !m.welcome
                    ? <MarkdownText text={m.content} lang={m.lang} onCite={(n) => document.getElementById(`src-${i}-${n}`)?.focus()} />
                    : <p>{m.content}</p>}
                  {m.sources?.length > 0 && (
                    <ol className="ai-sources" aria-label={L.sources}>
                      {m.sources.map((src) => (
                        <li key={src.n}><a id={`src-${i}-${src.n}`} href={src.url} target="_blank" rel="noopener noreferrer"><b>{src.n}</b> {src.title} <small>· {src.source}</small></a></li>
                      ))}
                    </ol>
                  )}
                  {m.role === "assistant" && !m.welcome && (
                    <div className="ai-msg-tools">
                      <span className={`ai-provider ${m.provider}`}>{m.provider === "ai" ? "AI answer" : m.provider === "safety" ? "Safety tip" : "Offline guide"}</span>
                      <button type="button" onClick={() => readAloud(m.content, i)} aria-label={speakingIndex === i ? "Stop reading" : "Read aloud"}>
                        {speakingIndex === i ? <><Square size={12} /> Stop</> : <><Volume2 size={12} /> Read aloud</>}
                      </button>
                      {m.learnMore?.url && <a href={m.learnMore.url} target="_blank" rel="noopener noreferrer"><BookOpen size={12} /> {m.learnMore.title}</a>}
                    </div>
                  )}
                  {m.notice && (status?.ai_enabled || m.provider !== "offline") && <small className="ai-notice">{m.notice}</small>}
                </div>
              </div>
            ))}
            {loading && <div className="ai-msg from-ai"><span className="ai-msg-avatar" aria-hidden="true">🤖</span><div className="ai-bubble ai-typing" role="status" aria-label="Zippy is thinking"><i /><i /><i /></div></div>}
          </div>

          {error && <div className="ai-error" role="alert">{error} {lastRequest && <button type="button" onClick={() => send(lastRequest.text, lastRequest.mode, lastRequest.ctx)}><RefreshCw size={12} /> Try again</button>}</div>}

          <div className="ai-quick">
            {lastAssistant && ACTIONS.map((a) => (
              <button type="button" key={a.mode} className={`act act-${a.mode}`} disabled={loading} onClick={() => send(language === "bn" ? a.bn : a.en, a.mode)}>{L[a.mode]}</button>
            ))}
            {suggestions.map((s) => <button type="button" key={s} disabled={loading} className="suggest" onClick={() => send(s)}>{s}</button>)}
          </div>

          <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <textarea ref={inputRef} rows={1} value={input} maxLength={MAX_CHARS} placeholder={L.placeholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              aria-label="Your question for Zippy" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send question">{loading ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}</button>
          </form>
          <p className="ai-privacy"><ShieldCheck size={12} /> {L.privacy}</p>
        </aside>
      )}
    </>
  );
}
