'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SECTIONS, ORDER } from './config';
import RecordTable from './RecordTable';
import RecordForm from './RecordForm';
import BookingPanel from './BookingPanel';
import Overview from './Overview';
import Chat from './Chat';
import {
  LayoutDashboard, CalendarDays, DoorOpen, Ticket, Megaphone, ClipboardCheck,
  Search, Bell, Plus, RefreshCw, GraduationCap, Sparkles, Inbox,
} from './icons';

const EMPTY = { schedules: [], rooms: [], events: [], announcements: [], assignments: [] };

const NAV = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard, group: null },
  { key: 'schedules', label: 'Schedule', icon: CalendarDays, group: 'Academics' },
  { key: 'assignments', label: 'Assignments', icon: ClipboardCheck, group: null },
  { key: 'rooms', label: 'Rooms', icon: DoorOpen, group: 'Campus' },
  { key: 'events', label: 'Events', icon: Ticket, group: null },
  { key: 'announcements', label: 'Notices', icon: Megaphone, group: null },
];

const MOBILE_NAV = ['overview', 'schedules', 'assignments', 'rooms', 'events'];

export default function Workspace() {
  const [data, setData] = useState(EMPTY);
  const [meta, setMeta] = useState(null);
  const [view, setView] = useState('overview');
  const [editing, setEditing] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState(null);

  /** Switching actor changes what the API and the agent will allow. */
  async function switchRole(role) {
    const res = await fetch('/api/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) return;
    const next = await res.json();
    setActor(next);
    await loadAll();
    setToast(`Now acting as ${next.label}.`);
  }

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
      const who = await fetch('/api/me', { cache: 'no-store' });
      if (who.ok) setActor(await who.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, [loadResource]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const announce = useCallback(async (message) => {
    await loadAll();
    setToast(message);
  }, [loadAll]);

  const isSection = view !== 'overview';
  const cfg = isSection ? SECTIONS[view] : null;

  async function save(payload) {
    const isNew = editing === 'new';
    const res = await fetch(isNew ? `/api/${view}` : `/api/${view}/${editing.id}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
    setEditing(null);
    await loadAll();
    setToast(isNew ? `${cfg.singular} added.` : 'Changes saved.');
  }

  async function remove(row) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/${view}/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      await loadAll();
      setToast(`${cfg.singular} deleted.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function eventAction(action, row) {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: row.id }),
      });
      const body = await res.json();
      if (body.ok) await announce(body.message);
      else setError(body.message || 'That did not work.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const myId = actor?.profile?.student_id || meta?.profile?.student_id;
  // Managing the five systems is staff work. Students still book rooms and
  // take their own place at events, so those actions stay.
  const canManage = actor?.permissions?.can_manage_records === true;
  const isRegistered = (row) => !!myId && (row.registrations || []).some((r) => r.student_id === myId);

  function extraActions(row) {
    if (view === 'rooms') {
      return [{ label: 'Book', kind: 'act', onClick: () => { setEditing(null); setBooking(row); } }];
    }
    if (view === 'events') {
      if (isRegistered(row)) {
        return [{ label: 'Cancel place', kind: 'danger', onClick: () => eventAction('cancel-registration', row) }];
      }
      const full = row.seats_left <= 0;
      return [{
        label: full ? 'Full' : 'Register',
        kind: 'act',
        disabled: full || row.status === 'cancelled' || row.status === 'completed',
        title: full ? `${row.registered}/${row.capacity} places taken` : undefined,
        onClick: () => eventAction('register-event', row),
      }];
    }
    return [];
  }

  /** Header search filters the rows of whichever section is open. */
  const rows = useMemo(() => {
    const all = isSection ? (data[view] || []) : [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [data, view, query, isSection]);

  function go(key) {
    setView(key);
    setEditing(null);
    setBooking(null);
    setQuery('');
  }

  const initials = (actor?.profile?.name || meta?.profile?.name || 'CO').split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark"><GraduationCap size={15} /></span>
          CampusOS
        </div>

        {NAV.map((item) => (
          <div key={item.key}>
            {item.group ? <div className="nav-group">{item.group}</div> : null}
            <button
              className="nav-item"
              aria-current={view === item.key ? 'page' : undefined}
              onClick={() => go(item.key)}
            >
              <item.icon size={17} />
              {item.label}
              {item.key !== 'overview' ? (
                <span className="count">{(data[item.key] || []).length}</span>
              ) : null}
            </button>
          </div>
        ))}

        <div className="sidebar-foot">
          <div className="who-card">
            <span className="avatar">{initials}</span>
            <div style={{ minWidth: 0 }}>
              <div className="who-name">{actor?.profile?.name || meta?.profile?.name || 'Loading…'}</div>
              <div className="who-sub">{actor?.label || meta?.profile?.student_id || ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <h1>{isSection ? cfg.label : 'Dashboard'}</h1>
          <span className="spacer" />
          <div className="search">
            <Search size={15} />
            <input
              value={query}
              placeholder={isSection ? `Search ${cfg.label.toLowerCase()}…` : 'Search CampusOS…'}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (!isSection) go('schedules'); }}
              aria-label="Search"
            />
          </div>
          <button className="icon-btn" title="Notices" aria-label="Notices" onClick={() => go('announcements')}>
            <Bell size={16} />
          </button>
          <span className="status-chip" title={meta?.provider ? `Agent using ${meta.provider}` : 'No LLM key set'}>
            <span className={`dot${meta?.provider ? '' : ' off'}`} />
            {meta?.provider ? meta.provider : 'no key'}
          </span>
          <div className="role-switch" role="group" aria-label="Acting as">
            {(actor?.available_roles || []).map((r) => (
              <button
                key={r.role}
                aria-pressed={actor?.role === r.role}
                onClick={() => switchRole(r.role)}
                title={`Act as ${r.label}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="status-chip">{meta?.today || '—'}</span>
        </header>

        <div className="content">
          <div className="col">
            {error ? <div className="notice">{error}</div> : null}

            {!isSection ? (
              loaded ? (
                <Overview data={data} meta={meta} onGo={go} />
              ) : (
                <div className="card"><div className="skel skel-row" style={{ width: '40%' }} /><div className="skel skel-row" /><div className="skel skel-row" style={{ width: '70%' }} /></div>
              )
            ) : (
              <>
                <div className="pane-head">
                  <div>
                    <h2>{cfg.label}</h2>
                    <p>{cfg.blurb}</p>
                  </div>
                  <span className="spacer" />
                  {canManage ? (
                    <button className="btn primary" onClick={() => { setBooking(null); setEditing('new'); }}>
                      <Plus size={15} /> Add {cfg.singular}
                    </button>
                  ) : (
                    <span className="staff-note" title="Switch to Department Admin in the header to manage records">
                      Read only — switch to Department Admin to add or edit
                    </span>
                  )}
                  <button className="btn" onClick={loadAll} title="Reload from the database">
                    <RefreshCw size={15} /> Refresh
                  </button>
                </div>

                {editing ? (
                  <RecordForm
                    key={editing === 'new' ? `new-${view}` : editing.id}
                    resource={view}
                    initial={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSubmit={save}
                  />
                ) : null}

                {booking ? (
                  <BookingPanel
                    key={booking.id}
                    room={data.rooms.find((r) => r.id === booking.id) || booking}
                    today={meta?.today}
                    onClose={() => setBooking(null)}
                    onDone={announce}
                  />
                ) : null}

                {loaded ? (
                  <RecordTable resource={view} rows={rows} busyId={busyId}
                    onEdit={(row) => { setBooking(null); setEditing(row); }}
                    onDelete={remove} extraActions={extraActions} query={query}
                    canManage={canManage} />
                ) : (
                  <div className="table-wrap">
                    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skel skel-row" style={{ width: `${90 - i * 9}%` }} />)}
                  </div>
                )}
              </>
            )}
          </div>

          <Chat provider={meta?.provider} onDataChanged={loadAll} />
        </div>
      </div>

      <nav className="tabbar" aria-label="Sections">
        {MOBILE_NAV.map((key) => {
          const item = NAV.find((n) => n.key === key);
          return (
            <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => go(key)}>
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
