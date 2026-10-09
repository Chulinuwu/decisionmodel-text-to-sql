import { QueryDetails } from '../results/QueryDetails';
import type { UnsupportedCardProps } from '../../types/props';

export function UnsupportedCard({ response }: UnsupportedCardProps) {
  return <section className="response-card" aria-live="polite">
    <span className="eyebrow">คำถามนี้อยู่นอกขอบเขต</span>
    <h2>{response.message}</h2>
    <p className="response-message">{response.detail}</p>
    <QueryDetails response={response} />
  </section>;
}
