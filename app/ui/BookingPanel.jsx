'use client';

import { useState } from 'react';

/**
 * Book a room, and cancel bookings already held against it.
 *
 * The brief lists book and cancel as room actions in the data manager, not just
 * things the agent can do. This posts to the same /api/actions endpoints the
 * agent's tools call, so a booking made here and one made in chat are the same
 * operation with the same conflict checks.
 */
export default function BookingPanel({ room, today, onClose, onDone }) {
  const [values, setValues] = useState({
    date: today || '',
    start_time: '',
    end_time: '',
    purpose: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  async function post(action, body) {
    const res = await fetch(`/api/actions/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json() };
  }

  async function book(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConflicts([]);
    const { data } = await post('book-room', { room: room.room_number, ...values });
    setBusy(false);
    if (data.ok) {
      await onDone(`Room ${room.room_number} booked — ${data.booking_id}.`);
      onClose();
    } else {
      setError(data.message || 'Could not book that slot.');
      setConflicts(data.conflicts || []);
    }
  }

  async function cancel(bookingId) {
    setBusy(true);
    setError(null);
    const { data } = await post('cancel-booking', { booking_id: bookingId });
    setBusy(false);
    if (data.ok) await onDone(`Booking ${bookingId} cancelled.`);
    else setError(data.message || 'Could not cancel that booking.');
  }

  const held = room.bookings || [];

  return (
    <form className="form-card" onSubmit={book}>
      <h3>Book room {room.room_number}</h3>
      <p className="form-note">
        {room.type} · seats {room.capacity}
        {room.equipment?.length ? ` · ${room.equipment.join(', ')}` : ''}
      </p>

      <div className="grid">
        <label>
          <span>Date *</span>
          <input type="date" required value={values.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label>
          <span>Start *</span>
          <input type="time" required value={values.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </label>
        <label>
          <span>End *</span>
          <input type="time" required value={values.end_time} onChange={(e) => set('end_time', e.target.value)} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          <span>Purpose</span>
          <input value={values.purpose} placeholder="Study group, lab makeup…"
            onChange={(e) => set('purpose', e.target.value)} />
        </label>
      </div>

      {error ? (
        <div className="notice" style={{ margin: '14px 0 0' }}>
          {error}
          {conflicts.length ? (
            <ul className="conflict-list">
              {conflicts.map((c, i) => <li key={i}>{c.kind}: {c.detail}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Book room'}
        </button>
        <button className="btn" type="button" onClick={onClose}>Close</button>
      </div>

      {held.length ? (
        <div className="held">
          <h4>Bookings held on this room</h4>
          {held.map((b) => (
            <div className="held-row" key={b.booking_id}>
              <span className="mono">{b.date} {b.start_time}–{b.end_time}</span>
              <span className="sub">{b.booked_by} · {b.purpose}</span>
              <span className="spacer" />
              <button className="btn ghost danger" type="button" disabled={busy}
                onClick={() => cancel(b.booking_id)}>Cancel</button>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}
