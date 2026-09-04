'use client';

import { useEffect, useRef, useState } from 'react';

const WRITE_TOOLS = new Set(['book_room', 'cancel_room_booking', 'register_for_event', 'cancel_event_registration']);

/** The arguments the model actually passed, short enough to sit inside a chip. */
function formatArgs(args) {
  const entries = Object.entries(args || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return entries
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`)
    .join(', ')
    .slice(0, 70);
}

const SUGGESTIONS = [
  'When is my next class?',
  'What have I got due this week?',
  "I'm free until 2 PM — anything on campus?",
  'Which labs have a projector and fit at least 30?',
  'Book Room 7A02 tomorrow from 3 PM to 5 PM',
  'Just book me any room tomorrow afternoon',
  'Register me for the Git & GitHub workshop',
];

export default function Chat({ provider, onDataChanged }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "I'm CampusOS. I read the live campus database every time you ask, so anything edited in the dashboard is something I already know.\n\nAsk about classes, deadlines, rooms, events or notices — or tell me to book a room or sign you up for something.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

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
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: data.error || 'Something went wrong.', error: true }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply, trace: data.trace }]);
        if ((data.trace || []).some((t) => WRITE_TOOLS.has(t.tool))) onDataChanged?.();
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: err.message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="chat">
      <div className="chat-head">
        <h2>Ask CampusOS</h2>
        <p>Every answer is read live from the database — not from a cached copy of the seed files.</p>
      </div>

      {!provider ? (
        <div className="notice">
          No LLM key found. Copy <code>.env.example</code> to <code>.env</code> and set <code>GOOGLE_API_KEY</code>, then restart the dev server.
        </div>
      ) : null}

      <div className="log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="who">{m.role === 'user' ? 'You' : 'CampusOS'}</div>
            <div className="bubble" style={m.error ? { borderColor: '#4A2B22', color: '#FF6B4A' } : undefined}>
              {m.content}
            </div>
            {m.trace?.length ? (
              <div className="trace">
                {m.trace.map((t, j) => (
                  <span
                    className={`tchip${WRITE_TOOLS.has(t.tool) ? ' write' : ''}`}
                    key={j}
                    title={JSON.stringify(t.args, null, 2)}
                  >
                    <b>{t.tool}</b>
                    {formatArgs(t.args) ? <i>({formatArgs(t.args)})</i> : null} → {t.result}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {busy ? (
          <div className="msg assistant">
            <div className="who">CampusOS</div>
            <div className="bubble"><span className="dots"><span /><span /><span /></span></div>
          </div>
        ) : null}
      </div>

      {messages.length <= 1 ? (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      ) : null}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          value={input}
          placeholder="Ask about classes, rooms, events…"
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </aside>
  );
}
