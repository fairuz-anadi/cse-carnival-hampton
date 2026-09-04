'use client';

import { useState } from 'react';
import { SECTIONS } from './config';
import { Inbox, Search } from './icons';

function Cell({ col, row }) {
  const main = col.value ? col.value(row) : row[col.key];
  const sub = col.sub ? col.sub(row) : null;
  return (
    <td className={col.mono ? 'mono' : ''} style={col.wide ? { maxWidth: 380 } : undefined}>
      {col.pill ? <span className={`pill ${col.pill(row)}`}>{col.pill(row)}</span> : (main ?? '—')}
      {sub ? <span className="sub">{col.wide && sub.length > 150 ? `${sub.slice(0, 150)}…` : sub}</span> : null}
    </td>
  );
}

export default function RecordTable({ resource, rows, onEdit, onDelete, busyId, extraActions, query }) {
  const cfg = SECTIONS[resource];
  const [confirming, setConfirming] = useState(null);

  if (!rows.length) {
    return (
      <div className="table-wrap">
        <div className="empty">
          {query ? <Search size={22} /> : <Inbox size={22} />}
          <span className="empty-title">
            {query ? `Nothing matches “${query}”` : `No ${cfg.label.toLowerCase()} yet`}
          </span>
          <span>
            {query ? 'Try a different search term.' : `Add the first ${cfg.singular} to get started.`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cfg.columns.map((c) => <th key={c.key}>{c.header}</th>)}
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {cfg.columns.map((c) => <Cell key={c.key} col={c} row={row} />)}
              <td className="actions">
                {confirming === row.id ? (
                  <>
                    <button className="btn ghost danger" disabled={busyId === row.id}
                      onClick={() => { setConfirming(null); onDelete(row); }}>Confirm</button>
                    <button className="btn ghost" onClick={() => setConfirming(null)}>Keep</button>
                  </>
                ) : (
                  <>
                    {(extraActions?.(row) || []).map((a) => (
                      <button key={a.label} className={`btn ghost ${a.kind || 'act'}`}
                        disabled={a.disabled || busyId === row.id} title={a.title}
                        onClick={a.onClick}>{a.label}</button>
                    ))}
                    <button className="btn ghost" onClick={() => onEdit(row)}>Edit</button>
                    <button className="btn ghost danger" onClick={() => setConfirming(row.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
