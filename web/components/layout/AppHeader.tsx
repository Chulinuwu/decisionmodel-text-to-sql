import type { AppHeaderProps } from '../../types/props';

export function AppHeader({ showDataset, onToggleDataset }: AppHeaderProps) {
  return <header className="app-header">
    <a className="brand" href="/" aria-label="Olist Explorer หน้าหลัก"><span className="brand-mark">o</span><span>olist<span className="brand-divider">/</span><strong>explorer</strong></span></a>
    <div className="header-right">
      <span className="header-label">NATURAL LANGUAGE DATA EXPLORER</span>
      <button className="mobile-data-button" onClick={onToggleDataset} aria-expanded={showDataset} aria-controls="dataset-sidebar">{showDataset ? 'ปิดข้อมูล' : 'ดูข้อมูล'}</button>
      <span className="local-badge">LOCAL WORKSPACE</span>
    </div>
  </header>;
}
