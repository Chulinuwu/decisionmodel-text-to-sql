import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { TableRowsView } from './TableRowsView';
import type { TableRowsPage } from '../../../shared/schema';
import type { TableRowsState } from '../../types/database';

const page = (offset: number, hasMore: boolean): TableRowsPage => ({
  columns: ['meter_id', 'cumulative_value'], offset, limit: 50, hasMore,
  rows: [{ meter_id: 'M-01', cumulative_value: '12.5' }, { meter_id: 'M-02', cumulative_value: null }],
});
const render = (state: TableRowsState, totalRows?: number) => renderToStaticMarkup(
  <TableRowsView table="readings" totalRows={totalRows} state={state} onBack={() => {}} onPrevious={() => {}} onNext={() => {}} onRetry={() => {}} />);
const isDisabled = (html: string, label: string) => new RegExp(`<button[^>]*disabled=""[^>]*>${label}</button>`).test(html);

test('the first page shows its rows, a range label with the known total and a disabled previous button', () => {
  const html = render({ status: 'ready', page: page(0, true) }, 120);
  assert.ok(html.includes('<h3 id="rows-view-title">readings</h3>'));
  assert.ok(html.includes('>M-01</td>'));
  assert.ok(html.includes('<td title="12.5" class="numeric">12.5</td>'));
  assert.ok(html.includes('class="null-value">NULL</td>'));
  assert.ok(html.includes('แถว 1-2 จาก 120'));
  assert.ok(isDisabled(html, 'ก่อนหน้า'));
  assert.ok(!isDisabled(html, 'ถัดไป'));
});

test('a later last page numbers rows from its offset and disables next without a known total', () => {
  const html = render({ status: 'ready', page: page(50, false) });
  assert.ok(html.includes('<td class="index-cell">51</td>'));
  assert.ok(html.includes('แถว 51-52<'));
  assert.ok(!isDisabled(html, 'ก่อนหน้า'));
  assert.ok(isDisabled(html, 'ถัดไป'));
});

test('loading, error and empty states render without a grid', () => {
  assert.ok(render({ status: 'loading' }).includes('role="status"'));
  const error = render({ status: 'error', message: 'อ่านแถวข้อมูลไม่สำเร็จค่ะ' });
  assert.ok(error.includes('role="alert"') && error.includes('ลองอีกครั้ง'));
  const empty = render({ status: 'ready', page: { ...page(0, false), rows: [] } });
  assert.ok(empty.includes('ตารางนี้ยังไม่มีข้อมูล') && !empty.includes('<table'));
});
