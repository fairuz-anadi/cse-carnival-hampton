/**
 * Lucide-style outline icons, drawn inline.
 *
 * Same geometry as Lucide (24x24 grid, 2px stroke, round caps and joins) but
 * hand-rolled rather than pulled from lucide-react — the judges run
 * `npm install` on their own machine, and every dependency we add is another
 * way that can fail. Fifteen icons is not worth the risk.
 */

function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" {...rest}
    >
      {children}
    </svg>
  );
}

export const LayoutDashboard = (p) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Svg>
);
export const CalendarDays = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></Svg>
);
export const DoorOpen = (p) => (
  <Svg {...p}><path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.562v16.157a1 1 0 0 1-1.242.97L5.5 20.125A2 2 0 0 1 4 18.187V5.813a2 2 0 0 1 1.5-1.938l6.258-1.563A1 1 0 0 1 13 3.28Z" /></Svg>
);
export const Ticket = (p) => (
  <Svg {...p}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2M13 17v2M13 11v2" /></Svg>
);
export const Megaphone = (p) => (
  <Svg {...p}><path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" /></Svg>
);
export const ClipboardCheck = (p) => (
  <Svg {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></Svg>
);
export const Sparkles = (p) => (
  <Svg {...p}><path d="M9.9 2.5 12 7l4.5 2.1L12 11.2 9.9 15.7 7.8 11.2 3.3 9.1 7.8 7z" /><path d="M18 14l.9 2.1 2.1.9-2.1.9L18 20l-.9-2.1-2.1-.9 2.1-.9z" /></Svg>
);
export const Search = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const Bell = (p) => (
  <Svg {...p}><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /></Svg>
);
export const Clock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>
);
export const ChevronRight = (p) => (
  <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
);
export const Plus = (p) => (
  <Svg {...p}><path d="M5 12h14M12 5v14" /></Svg>
);
export const RefreshCw = (p) => (
  <Svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></Svg>
);
export const GraduationCap = (p) => (
  <Svg {...p}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></Svg>
);
export const Menu = (p) => (
  <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>
);
export const Inbox = (p) => (
  <Svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>
);
