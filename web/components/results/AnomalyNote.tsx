import { anomalyThreshold } from '../../../shared/result-config';

export function AnomalyNote() {
  return <p className="anomaly-note" role="status">ไม่พบค่าผิดปกติตามเกณฑ์ modified z-score {anomalyThreshold} ตารางแสดงหน่วยที่ใกล้เกณฑ์ที่สุด เรียงตามขนาดของ score</p>;
}
