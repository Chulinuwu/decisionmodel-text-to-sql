import type { IconProps } from '../../types/props';

export function Icon({ name }: IconProps) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'arrow' && <><path d="M5 12h14M13 6l6 6-6 6" /></>}
    {name === 'database' && <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" /></>}
    {name === 'chart' && <><path d="M4 4v16h16M8 15v-4M12 15V7M16 15V9" /></>}
    {name === 'table' && <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></>}
    {name === 'download' && <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>}
    {name === 'copy' && <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>}
  </svg>;
}
