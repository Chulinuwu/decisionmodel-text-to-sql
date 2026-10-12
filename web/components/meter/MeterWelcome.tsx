import { Icon } from '../layout/Icon';
import type { WelcomeProps } from '../../types/props';

export function MeterWelcome({ databaseName }: WelcomeProps) {
  return <section className="intro" aria-labelledby="meter-heading">
    <span className="database-chip"><Icon name="database" />{databaseName}</span>
    <h1 id="meter-heading">อยากรู้อะไรจากข้อมูลมิเตอร์?</h1>
    <p>ถามปริมาณการใช้ อันดับ ค่าผิดปกติ หรือมิเตอร์ที่ไม่ส่งข้อมูล แล้วถามต่อในแชทเดียวกันได้</p>
    <p className="experimental-note">ข้อมูลจำลองสำหรับสาธิต คำตอบอธิบายค่าที่บันทึกไว้ ไม่ได้ยืนยันสาเหตุ</p>
  </section>;
}
