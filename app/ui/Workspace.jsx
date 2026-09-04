'use client';

import { useCallback, useEffect, useState } from 'react';
import { SECTIONS, ORDER } from './config';
import RecordTable from './RecordTable';
import RecordForm from './RecordForm';
import Chat from './Chat';

const EMPTY = { schedules: [], rooms: [], events: [], announcements: [], assignments: [] };

export default function Workspace() {
  const [data, setData] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState('schedules');
  const [editing, setEditing] = useState(null); // null | 'new' | record
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const loadResource = useCallback(async (resource) => {
    const res = await fetch(`/api/${resource}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${resource}`);
    const rows = await res.json();
    setData((d) => ({ ...d, [resource]: rows }));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all(ORDER.map(loadResource));
      const m = await fetch('/api/meta', { cache: 'no-store' });
      if (m.ok) setMeta(await m.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, [loadResource]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function save(payload) {
    const isNew = editing === 'new';
    const url = isNew ? `/api/${tab}` : `/api/${tab}/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
    setEditing(null);
    await loadResource(tab);
    if (tab === 'events' || tab === 'rooms') await loadResource(tab);
  }

  async function remove(row) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/${tab}/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      await loadResource(tab);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const cfg = SECTIONS[tab];
  const rows = data[tab] || [];

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">Campus<em>OS</em></h1>
        <span className="tag">AUST · Live campus data + agent</span>
        <span className="spacer" />
        {meta ? (
          <>
            <span className="chip">{meta.profile.name} · {meta.profile.student_id}</span>
            <span className="chip">{meta.today}</span>
            <span className={meta.provider ? 'chip live' : 'chip warn'}>
              {meta.provider ? `agent: ${meta.provider}` : 'agent: no API key'}
            </span>
          </>
        ) : null}
      </header>

      <div className="body">
        <main className="dash">
          <nav className="tabs" role="tablist">
            {ORDER.map((key) => (
              <button
                key={key}
                role="tab"
                className="tab"
                aria-selected={tab === key}
                onClick={() => { setTab(key); setEditing(null); }}
              >
                {SECTIONS[key].label}
                <span className="count">{(data[key] || []).length}</span>
              </button>
            ))}
          </nav>

          <section className="pane">
            <div className="pane-head">
              <div>
                <h2>{cfg.label}</h2>
                <p>{cfg.blurb}</p>
              </div>
              <span className="spacer" />
              <button className="btn primary" onClick={() => setEditing('new')}>+ Add {cfg.singular}</button>
              <button className="btn" onClick={loadAll}>Refresh</button>
            </div>

            {error ? <div className="notice" style={{ margin: '0 0 16px' }}>{error}</div> : null}

            {editing ? (
              <RecordForm
                key={editing === 'new' ? `new-${tab}` : editing.id}
                resource={tab}
                initial={editing === 'new' ? null : editing}
                onCancel={() => setEditing(null)}
                onSubmit={save}
              />
            ) : null}

            {loaded ? (
              <RecordTable resource={tab} rows={rows} busyId={busyId}
                onEdit={(row) => setEditing(row)} onDelete={remove} />
            ) : (
              <div className="table-wrap"><div className="empty">Loading campus data…</div></div>
            )}
          </section>
        </main>

        <Chat provider={meta?.provider} onDataChanged={loadAll} />
      </div>
    </div>
  );
}
