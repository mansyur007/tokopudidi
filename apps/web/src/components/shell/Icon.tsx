// Ikon SVG stroke sederhana — diturunkan dari handoff (paket prototipe).
// Tambah nama baru dengan menambahkan path di PATHS di bawah.
import type { CSSProperties } from 'react';

interface Props {
  name: keyof typeof PATHS;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
}

const PATHS: Record<string, React.ReactNode> = {
  search:        (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  menu:          (<><path d="M3 6h18M3 12h18M3 18h18" /></>),
  cart:          (<><path d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.6h9.2a2 2 0 0 0 2-1.6L23 8H6" /><circle cx="10" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" /></>),
  bell:          (<><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 21a2 2 0 0 0 4 0" /></>),
  chat:          (<><path d="M21 12a8 8 0 0 1-11.6 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z" /></>),
  pin:           (<><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Z" /><circle cx="12" cy="9" r="2.5" /></>),
  star:          (<><path d="M12 3l2.7 5.5 6 .9-4.3 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.3 9.4l6-.9L12 3Z" /></>),
  plus:          (<><path d="M12 5v14M5 12h14" /></>),
  minus:         (<><path d="M5 12h14" /></>),
  check:         (<><path d="m5 12.5 4.5 4.5L19 7.5" /></>),
  truck:         (<><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
  shield:        (<><path d="M12 3 4 6v6c0 4.5 3.2 8.4 8 9 4.8-.6 8-4.5 8-9V6l-8-3Z" /></>),
  'chevron-left':  (<><path d="m15 6-6 6 6 6" /></>),
  'chevron-right': (<><path d="m9 6 6 6-6 6" /></>),
  'chevron-down':  (<><path d="m6 9 6 6 6-6" /></>),
  heart:         (<><path d="M20.8 7.6a5 5 0 0 0-8.8-2.4 5 5 0 0 0-8.8 2.4c0 5.2 8.8 11.6 8.8 11.6s8.8-6.4 8.8-11.6Z" /></>),
  share:         (<><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6 12 2 8 6" /><path d="M12 2v13" /></>),
  dots:          (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
};

export function Icon({ name, size = 18, stroke = 1.8, className, style, filled }: Props) {
  const path = PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {path}
    </svg>
  );
}
