'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardCheck, Ticket, Megaphone, Clock, ChevronRight } from './icons';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLASS_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toMin = (t) => {
  const [h, m] = String(t || '00:00').split(':').map(Number);
  return h * 60 + m;
};
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * A weekly load chart drawn from the real timetable — classes scheduled per
 * teaching day. The spec asks for a line chart here; there is no GPA or
 * attendance anywhere in the campus data, so plotting those would mean
 * inventing numbers. This is the same shape, built from rows that exist.
 */
function WeeklyChart({ schedules, todayName }) {
  const [hover, setHover] = useState(null);
  const data = CLASS_DAYS.map((d) => ({
    day: d,
    n: schedules.filter((s) => s.day === d).length,
  }));
  const max = Math.max(4, ...data.map((d) => d.n));
  const W = 520, H = 170, padX = 34, padY = 18;
  const x = (i) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const y = (v) => H - padY - (v / max) * (H - padY * 2);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.n)}`).join(' ');
  const area = `${path} L${x(data.length - 1)},${H - padY} L${x(0)},${H - padY} Z`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Classes scheduled per teaching day">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={y(max * f)} y2={y(max * f)}
            stroke="var(--border)" strokeWidth="1" />
        ))}
        <path d={area} fill="var(--blue)" opacity="0.28" />
        <path d={path} fill="none" stroke="var(--black)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={d.day}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={x(i)} cy={y(d.n)} r={hover === i ? 5.5 : 4}
              fill="var(--surface)" stroke="var(--black)" strokeWidth="2" />
            <rect x={x(i) - 26} y={0} width="52" height={H} fill="transparent" />
            <text x={x(i)} y={H - 3} textAnchor="middle"
              fill={d.day === todayName ? 'var(--text)' : 'var(--text-muted)'}
              fontSize="11" fontWeight={d.day === todayName ? 600 : 400}>
              {d.day.slice(0, 3)}
            </text>
            {hover === i ? (
              <>
                <rect x={x(i) - 30} y={y(d.n) - 34} width="60" height="24" rx="6" fill="var(--black)" />
                <text x={x(i)} y={y(d.n) - 18} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
                  {d.n} {d.n === 1 ? 'class' : 'classes'}
                </text>
              </>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Kpi({ icon, tint, label, value, foot }) {
  return (
    <div className="kpi">
      <div className="ico" style={{ background: tint }}>{icon}</div>
      <div className="label">{label}</div>
      <div className="num">{value}</div>
      <div className="foot">{foot}</div>
    </div>
  );
}

export default function Overview({ data, meta, onGo }) {
  const today = meta?.today || new Date().toISOString().slice(0, 10);
  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);
  const todayName = DAYS[new Date(`${today}T00:00:00`).getDay()];
  const isTeachingDay = CLASS_DAYS.includes(todayName);

  const todays = (data.schedules || [])
    .filter((s) => s.day === todayName)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const weekEnd = addDays(today, 7);
  const dueSoon = (data.assignments || [])
    .filter((a) => a.deadline >= today && a.deadline <= weekEnd && a.status === 'pending')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const upcoming = (data.events || [])
    .filter((e) => (e.end_date || e.date) >= today && e.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));

  const active = (data.announcements || []).filter((a) => !a.expires || a.expires >= today);
  const highPriority = active.filter((a) => a.priority === 'high');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (meta?.profile?.name || 'there').split(' ')[0];
  const prettyDate = `${todayName}, ${MONTHS[Number(today.slice(5, 7)) - 1]} ${Number(today.slice(8, 10))}`;

  return (
    <>
      <section className="welcome">
        <div style={{ minWidth: 0 }}>
          <h2>{greeting}, {firstName}</h2>
          <p className="meta">{prettyDate} · {meta?.profile?.program || 'CampusOS'}</p>
          <p className="line">
            {isTeachingDay
              ? `${todays.length} ${todays.length === 1 ? 'class' : 'classes'} today`
              : 'No classes today — it is a weekend'}
            {' · '}
            {dueSoon.length} {dueSoon.length === 1 ? 'task' : 'tasks'} due this week
            {highPriority.length ? ` · ${highPriority.length} high-priority notices` : ''}
          </p>
        </div>
        <span className="spacer" />
        <button className="btn primary" onClick={() => onGo('schedules')}>
          View schedule <ChevronRight size={15} />
        </button>
      </section>

      <section className="kpis">
        <Kpi icon={<CalendarDays size={16} />} tint="var(--blue)"
          label="Classes today" value={isTeachingDay ? todays.length : 0}
          foot={isTeachingDay ? `${todayName}` : 'Weekend — Sun to Thu only'} />
        <Kpi icon={<ClipboardCheck size={16} />} tint="var(--yellow)"
          label="Due this week" value={dueSoon.length}
          foot={dueSoon.length ? `Next: ${dueSoon[0].course} on ${dueSoon[0].deadline.slice(5)}` : 'Nothing pending'} />
        <Kpi icon={<Ticket size={16} />} tint="var(--green)"
          label="Upcoming events" value={upcoming.length}
          foot={upcoming.length ? `Next: ${upcoming[0].date.slice(5)}` : 'None scheduled'} />
        <Kpi icon={<Megaphone size={16} />} tint="var(--purple)"
          label="Active notices" value={active.length}
          foot={`${highPriority.length} high priority`} />
      </section>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Weekly class load</h3>
              <p className="sub">Classes scheduled per teaching day</p>
            </div>
            <span className="spacer" />
            <button className="link-btn" onClick={() => onGo('schedules')}>
              Open <ChevronRight size={14} />
            </button>
          </div>
          <WeeklyChart schedules={data.schedules || []} todayName={todayName} />
        </section>

        <section className="card">
          <div className="card-head">
            <div><h3>Today&apos;s schedule</h3></div>
            <span className="spacer" />
            <button className="link-btn" onClick={() => onGo('schedules')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {todays.length ? (
            <div className="tl">
              {todays.map((s) => {
                const now = toMin(s.start_time) <= nowMin && nowMin < toMin(s.end_time);
                return (
                  <div className={`tl-item${now ? ' now' : ''}`} key={s.id}>
                    <div className="tl-time">{s.start_time}</div>
                    <div className="tl-body">
                      <div className="tl-course">{s.course}</div>
                      <div className="tl-meta">{s.title}</div>
                      <div className="tl-meta">Room {s.room} · {s.start_time}–{s.end_time}</div>
                      {now ? <div className="tl-now"><span className="bullet" style={{ background: 'var(--green-strong)' }} /> Happening now</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <Clock size={22} />
              <span className="empty-title">No classes today</span>
              <span>{isTeachingDay ? 'Nothing timetabled.' : 'The teaching week runs Sunday to Thursday.'}</span>
            </div>
          )}
        </section>
      </div>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>Upcoming deadlines</h3>
              <p className="sub">Pending assignments in the next 7 days</p>
            </div>
            <span className="spacer" />
            <button className="link-btn" onClick={() => onGo('assignments')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {dueSoon.length ? (
            <div className="list">
              {dueSoon.map((a) => {
                const days = Math.round((new Date(`${a.deadline}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
                return (
                  <div className="list-row" key={a.id}>
                    <div style={{ minWidth: 0 }}>
                      <div className="title">{a.title}</div>
                      <div className="sub">{a.course} · {a.submission_platform || 'No platform set'}</div>
                    </div>
                    <span className="spacer" />
                    <span className={`pill ${days <= 1 ? 'high' : 'pending'}`}>
                      {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <ClipboardCheck size={22} />
              <span className="empty-title">Nothing due this week</span>
              <span>You are all caught up.</span>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <div><h3>Campus updates</h3></div>
            <span className="spacer" />
            <button className="link-btn" onClick={() => onGo('announcements')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {active.length ? (
            <div className="list">
              {active.slice(0, 4).map((a) => (
                <div className="list-row" key={a.id}>
                  <span className="bullet" style={{
                    background: a.priority === 'high' ? 'var(--red-strong)'
                      : a.priority === 'medium' ? 'var(--blue-strong)' : 'var(--green-strong)',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="title">{a.title}</div>
                    <div className="sub">{a.posted_by} · {a.date}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Megaphone size={22} />
              <span className="empty-title">No active notices</span>
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div><h3>Campus events</h3></div>
          <span className="spacer" />
          <button className="link-btn" onClick={() => onGo('events')}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        {upcoming.length ? (
          <div className="list">
            {upcoming.slice(0, 4).map((e) => (
              <div className="list-row" key={e.id}>
                <div className="datebox">
                  <div className="d">{Number(e.date.slice(8, 10))}</div>
                  <div className="m">{MONTHS[Number(e.date.slice(5, 7)) - 1]}</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="title">{e.name}</div>
                  <div className="sub">{e.start_time} · {e.venue} · {e.organizer}</div>
                </div>
                <span className="spacer" />
                <span className={`pill ${e.seats_left <= 0 ? 'full' : 'available'}`}>
                  {e.seats_left <= 0 ? 'Full' : `${e.seats_left} seats`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Ticket size={22} />
            <span className="empty-title">No upcoming events</span>
          </div>
        )}
      </section>
    </>
  );
}
