'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from './icons';

const WRITE_TOOLS = new Set(['book_room', 'cancel_room_booking', 'register_for_event', 'cancel_event_registration']);

const SUGGESTIONS = [
  'When is my next class?',
  'What have I got due this week?',
  'Which labs have a projector?',
  'Book Room 7A02 tomorrow, 3 to 5 PM',
];

/** A friendly campus helper waving hello. Monochrome, drawn inline. */
function HelloArt() {
  return (
    <svg width="128" height="104" viewBox="0 0 128 104" fill="none" aria-hidden="true">
      <ellipse cx="64" cy="95" rx="34" ry="5" fill="#111" opacity=".07" />
      {/* body */}
      <path d="M44 92V74a20 20 0 0 1 40 0v18" stroke="#111" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M44 92h40" stroke="#111" strokeWidth="3.2" strokeLinecap="round" />
      {/* head */}
      <circle cx="64" cy="45" r="20" fill="#fff" stroke="#111" strokeWidth="3.2" />
      {/* graduation cap */}
      <path d="M40 33 64 24l24 9-24 9-24-9Z" fill="#111" />
      <path d="M78 38v9" stroke="#111" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="78" cy="49" r="2.6" fill="#111" />
      {/* face */}
      <circle cx="57" cy="45" r="2.4" fill="#111" />
      <circle cx="71" cy="45" r="2.4" fill="#111" />
      <path d="M57 53c2.4 2.6 9.6 2.6 12 0" stroke="#111" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="49" cy="52" r="3.4" fill="#EF6464" opacity=".28" />
      <circle cx="79" cy="52" r="3.4" fill="#EF6464" opacity=".28" />
      {/* waving arm */}
      <g className="wave">
        <path d="M84 78 100 62" stroke="#111" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="103" cy="58" r="5.6" fill="#BFEFD9" stroke="#111" strokeWidth="3" />
      </g>
      <path d="M44 78 30 66" stroke="#111" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="27" cy="63" r="4.6" fill="#fff" stroke="#111" strokeWidth="3" />
    </svg>
  );
}

export default function Chat({ provider, onDataChanged }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes the panel, like any other overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.error || 'Something went wrong.', error: true }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
        // The trace stays out of the conversation, but it still tells us when
        // the agent changed something, so the dashboard can refresh itself.
        if ((data.trace || []).some((t) => WRITE_TOOLS.has(t.tool))) onDataChanged?.();
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: err.message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open ? (
        <section className="chat" role="dialog" aria-label="Ask CampusOS">
          <div className="chat-head">
            <span className="avatar" aria-hidden="true"><Sparkles size={16} /></span>
            <div>
              <h3>Ask CampusOS</h3>
              <p className="chat-sub">{provider ? 'Online' : 'No API key set'}</p>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>

          {!provider ? (
            <div className="notice" style={{ margin: '14px 18px 0' }}>
              No API key found. Copy <code>.env.example</code> to <code>.env</code>, add one key, then restart.
            </div>
          ) : null}

          <div className="log" ref={logRef}>
            {messages.length === 0 ? (
              <div className="hello">
                <HelloArt />
                <h4>Hey, I&apos;m CampusOS</h4>
                <p>Ask me about your classes, deadlines, rooms or events — or just tell me to book something.</p>
              </div>
            ) : null}

            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="who">{m.role === 'user' ? 'You' : 'CampusOS'}</div>
                <div className={`bubble${m.error ? ' err' : ''}`}>{m.content}</div>
              </div>
            ))}

            {busy ? (
              <div className="msg assistant">
                <div className="who">CampusOS</div>
                <div className="bubble"><span className="dots"><span /><span /><span /></span></div>
              </div>
            ) : null}
          </div>

          {messages.length === 0 ? (
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>
              ))}
            </div>
          ) : null}

          <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input
              ref={inputRef}
              value={input}
              placeholder="Ask me anything…"
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              aria-label="Message CampusOS"
            />
            <button className="btn primary" type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
        </section>
      ) : null}

      <button
        className="fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close CampusOS assistant' : 'Ask CampusOS'}
        title="Ask CampusOS"
      >
        <Sparkles size={24} />
        <span className={`fab-dot${provider ? '' : ' off'}`} />
      </button>
    </>
  );
}
