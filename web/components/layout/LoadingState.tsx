import type { LoadingStateProps } from '../../types/props';

export function LoadingState({ request, onCancel }: LoadingStateProps) {
  const executing = request.kind === 'execute';
  return <section className="loading-state" role="status" aria-live="polite">
    <div className="loading-top">
      <div className="loading-indicator" />
      <div><h2>{executing ? 'กำลังค้นหาข้อมูลตามการตีความที่เลือก' : 'กำลังตีความและค้นหาข้อมูล'}</h2><p>{executing ? request.interpretation.summary : request.question}</p></div>
      <button className="secondary-button" onClick={onCancel}>ยกเลิก</button>
    </div>
    <div className="loading-skeleton"><span /><span /><span /></div>
    <p className="muted small">{executing ? 'ระบบสร้าง SQL จากแผนที่เลือกและรันกับฐานข้อมูล' : 'โมเดลกำลังจัดอันดับการตีความที่เป็นไปได้จากตารางและคอลัมน์ที่มี'}</p>
  </section>;
}
