import { browseRowLimits } from '../../../shared/limits';
import { numberLocale } from '../../../shared/result-config';
import { Icon } from '../layout/Icon';
import { TableRowsGrid } from './TableRowsGrid';
import type { TableRowsViewProps } from '../../types/props';

export function TableRowsView({ table, totalRows, state, onBack, onPrevious, onNext, onRetry }: TableRowsViewProps) {
  return <section className="rows-view" aria-labelledby="rows-view-title">
    <div className="rows-view-header">
      <button type="button" className="icon-button" aria-label="กลับไปดูโครงสร้างข้อมูล" onClick={onBack}><Icon name="back" /></button>
      <h3 id="rows-view-title">{table}</h3>
    </div>
    {state.status === 'loading' && <div className="loading-skeleton" role="status" aria-label="กำลังอ่านแถวข้อมูล"><span /><span /><span /></div>}
    {state.status === 'error' && <div className="sidebar-error" role="alert"><p>{state.message}</p><button type="button" className="text-button" onClick={onRetry}>ลองอีกครั้ง</button></div>}
    {state.status === 'ready' && (state.page.rows.length === 0
      ? <p className="muted">{state.page.offset === 0 ? 'ตารางนี้ยังไม่มีข้อมูล' : 'ไม่มีแถวในช่วงนี้แล้ว'}</p>
      : <TableRowsGrid table={table} page={state.page} />)}
    {state.status === 'ready' && <div className="rows-pager">
      {state.page.rows.length > 0 && <span>{`แถว ${(state.page.offset + 1).toLocaleString(numberLocale)}-${(state.page.offset + state.page.rows.length).toLocaleString(numberLocale)}${totalRows === undefined ? '' : ` จาก ${totalRows.toLocaleString(numberLocale)}`}`}</span>}
      <button type="button" className="secondary-button" disabled={state.page.offset === 0} onClick={onPrevious}>ก่อนหน้า</button>
      {/* The server rejects offsets past maxOffset, so paging stops there even when more rows exist. */}
      <button type="button" className="secondary-button" disabled={!state.page.hasMore || state.page.offset + state.page.limit > browseRowLimits.maxOffset} onClick={onNext}>ถัดไป</button>
    </div>}
  </section>;
}
