import type { QueryErrorProps } from '../../types/props';

export function QueryError({ request, message, disabled, onRetry }: QueryErrorProps) {
  return <div className="status-card error-card" role="alert">
    <h2>ค้นหาข้อมูลไม่สำเร็จ</h2>
    <p>{message}</p>
    <button className="secondary-button" disabled={disabled} onClick={onRetry}>{request.kind === 'execute' ? 'ลองการตีความเดิมอีกครั้ง' : 'ลองคำถามเดิมอีกครั้ง'}</button>
  </div>;
}
