import { Icon } from '../layout/Icon';
import type { WelcomeProps } from '../../types/props';

export function ChatWelcome({ databaseName }: WelcomeProps) {
  return <section className="intro" aria-labelledby="question-heading">
    <span className="database-chip"><Icon name="database" />{databaseName}</span>
    <h1 id="question-heading">อยากรู้อะไรจากข้อมูลนี้?</h1>
    <p>เริ่มด้วยคำถามของคุณ แล้วดูคำตอบจากข้อมูลจริง พร้อม SQL สำหรับตรวจสอบ</p>
    <p className="experimental-note">ต้นแบบทดลอง การตีความคำถามยังคลาดเคลื่อนได้ โปรดตรวจแผนและเงื่อนไขก่อนใช้ผลลัพธ์</p>
  </section>;
}
