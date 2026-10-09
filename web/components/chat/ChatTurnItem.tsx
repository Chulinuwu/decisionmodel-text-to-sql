import { ChooseCard } from '../interpretation/ChooseCard';
import { UnsupportedCard } from '../interpretation/UnsupportedCard';
import { LoadingState } from '../layout/LoadingState';
import { QueryError } from '../layout/QueryError';
import { AnswerBubble } from './AnswerBubble';
import type { ChatTurnItemProps } from '../../types/props';

export function ChatTurnItem({ turn, dataset, disabled, onExecute, onCancel, onRetry }: ChatTurnItemProps) {
  const { request, reply } = turn;
  const response = reply.status === 'done' ? reply.response : null;
  return <article className="chat-turn" aria-label={request.question}>
    <p className="user-bubble">{request.question}</p>
    <div className="assistant-bubble">
      {reply.status === 'loading' && <LoadingState request={request} onCancel={onCancel} />}
      {reply.status === 'cancelled' && <div className="status-card" role="status"><h2>ยกเลิกการค้นหาแล้ว</h2><p>ถามใหม่หรือแก้คำถามได้จากช่องด้านล่าง</p></div>}
      {reply.status === 'error' && <QueryError request={request} message={reply.message} disabled={disabled} onRetry={() => onRetry(turn)} />}
      {response?.status === 'ok' && <AnswerBubble key={request.kind === 'execute' ? request.interpretation.id : request.kind} response={response} dataset={dataset} disabled={disabled} onExecute={interpretation => { if (response.offerId) onExecute(turn.id, response.offerId, interpretation); }} />}
      {response?.status === 'choose' && <ChooseCard response={response} disabled={disabled} onExecute={interpretation => onExecute(turn.id, response.offerId, interpretation)} />}
      {response?.status === 'unsupported' && <UnsupportedCard response={response} />}
    </div>
  </article>;
}
