import { useTableRows } from '../../hooks/useTableRows';
import { TableRowsView } from './TableRowsView';
import type { TableBrowserProps } from '../../types/props';

export function TableBrowser({ tablesUrl, table, totalRows, onBack }: TableBrowserProps) {
  const { state, previous, next, retry } = useTableRows(tablesUrl, table);
  return <TableRowsView table={table} totalRows={totalRows} state={state} onBack={onBack} onPrevious={previous} onNext={next} onRetry={retry} />;
}
