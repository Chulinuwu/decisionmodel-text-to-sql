import { LoadingState } from '../layout/LoadingState';
import { QueryError } from '../layout/QueryError';
import { MeterAnswer } from './MeterAnswer';
import type { MeterTurnItemProps } from '../../types/props';

export function MeterTurnItem({ turn, disabled, onCancel, onRetry }: MeterTurnItemProps) {
  const { request, reply } = turn;
  return <article className="chat-turn" aria-label={request.question}>
    <p className="user-bubble">{request.question}</p>
    <div className="assistant-bubble">
      {reply.status === 'loading' && <LoadingState request={request} onCancel={onCancel} />}
      {reply.status === 'cancelled' && <div className="status-card" role="status"><h2>ยกเลิกการค้นหาแล้ว</h2><p>ถามใหม่หรือแก้คำถามได้จากช่องด้านล่าง</p></div>}
      {reply.status === 'error' && <QueryError request={request} message={reply.message} disabled={disabled} onRetry={() => onRetry(turn)} />}
      {reply.status === 'done' && <MeterAnswer response={reply.response} />}
    </div>
  </article>;
}
