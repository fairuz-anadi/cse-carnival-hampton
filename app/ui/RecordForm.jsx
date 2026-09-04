'use client';

import { useState } from 'react';
import { SECTIONS } from './config';

export default function RecordForm({ resource, initial, onCancel, onSubmit }) {
  const cfg = SECTIONS[resource];
  const [values, setValues] = useState(() => {
    const base = {};
    for (const f of cfg.fields) {
      const v = initial?.[f.name];
      base[f.name] = f.list ? (Array.isArray(v) ? v.join(', ') : v || '') : (v ?? '');
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {};
    for (const f of cfg.fields) {
      let v = values[f.name];
      if (f.list) v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
      else if (f.type === 'number') v = v === '' ? null : Number(v);
      payload[f.name] = v;
    }
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h3>{initial ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}</h3>
      <div className="grid">
        {cfg.fields.map((f) => (
          <label key={f.name} style={f.full ? { gridColumn: '1 / -1' } : undefined}>
            <span>{f.label}{f.required ? ' *' : ''}</span>
            {f.type === 'textarea' ? (
              <textarea value={values[f.name]} required={f.required}
                onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <select value={values[f.name]} required={f.required} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">—</option>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} value={values[f.name]} required={f.required}
                onChange={(e) => set(f.name, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {error ? <div className="notice" style={{ margin: '14px 0 0' }}>{error}</div> : null}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : `Add ${cfg.singular}`}
        </button>
        <button className="btn" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
