import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { DatasetPanel } from '../components/layout/DatasetPanel';
import { LoadingState } from '../components/layout/LoadingState';
import { QueryComposer } from '../components/layout/QueryComposer';
import { QueryError } from '../components/layout/QueryError';
import { ResultsPanel } from '../components/results/ResultsPanel';
import { useExplorer } from '../hooks/useExplorer';
import { useQuestionDraft } from '../hooks/useQuestionDraft';

export function App() {
  const { question, setQuestion, inputRef, editQuestion } = useQuestionDraft();
  const [showDataset, setShowDataset] = useState(false);
  const { dataset, query, run, execute, retry, cancel, reloadDataset } = useExplorer();
  const ready = dataset.status === 'ready' && dataset.data.ready;
  return <div className="app-shell">
    <AppHeader showDataset={showDataset} onToggleDataset={() => setShowDataset(value => !value)} />
    <div className="workspace"><div id="dataset-sidebar" className={`sidebar-wrap ${showDataset ? 'mobile-open' : ''}`}><DatasetPanel state={dataset} retry={reloadDataset} /></div><main>
      <QueryComposer question={question} onChange={setQuestion} onEdit={editQuestion} inputRef={inputRef} onSubmit={() => void run(question.trim())} loading={query.status === 'loading'} disabled={!ready} />
      {!ready && dataset.status !== 'loading' && <p className="availability-note" role="status">รอฐานข้อมูลพร้อมใช้งานก่อนถามข้อมูล</p>}
      {query.status === 'idle' && <div className="welcome-note"><span className="welcome-line" /><div><h2>เริ่มจากคำถามหนึ่งข้อ</h2><p>ดูข้อมูลที่มีจากแถบด้านซ้าย หรือเลือกตัวอย่างแล้วแก้ไขตามที่ต้องการ<br />ทุกคำตอบมีผลลัพธ์จากฐานข้อมูล พร้อม SQL สำหรับตรวจสอบ</p></div></div>}
      {query.status === 'loading' && <LoadingState request={query.request} onCancel={cancel} />}
      {query.status === 'cancelled' && <div className="status-card" role="status"><h2>ยกเลิกการค้นหาแล้ว</h2><p>คำถามยังอยู่ด้านบน คุณปรับแก้แล้วถามใหม่ได้</p></div>}
      {query.status === 'error' && <QueryError request={query.request} message={query.message} disabled={!ready} onRetry={request => void retry(request)} />}
      {query.status === 'done' && question.trim() !== query.request.question && <p className="availability-note">คำตอบด้านล่างเป็นของคำถามที่ส่งก่อนแก้ไข กดถามข้อมูลเพื่อค้นหาคำถามใหม่</p>}
      {query.status === 'done' && <ResultsPanel key={query.id} response={query.response} question={query.request.question} dataset={dataset.status === 'ready' ? dataset.data : undefined} onExecute={(offerId, interpretation) => void execute(query.request.question, offerId, interpretation)} />}
      <footer className="workspace-footer"><span>Olist Brazilian E-Commerce · ข้อมูลในอดีต</span><span>Clef Flash / Decision Model</span></footer>
    </main></div>
  </div>;
}
