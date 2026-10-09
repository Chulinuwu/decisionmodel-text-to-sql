export function ChatWelcome() {
  return <section aria-labelledby="question-heading">
    <div className="intro"><span className="eyebrow">YOUR DATA, IN PLAIN LANGUAGE</span><h1 id="question-heading">อยากรู้อะไรจากข้อมูลนี้?</h1><p>เริ่มด้วยคำถามของคุณ แล้วดูคำตอบจากข้อมูลจริง</p></div>
    <div className="welcome-note"><span className="welcome-line" /><div><h2>เริ่มจากคำถามหนึ่งข้อ</h2><p>ดูข้อมูลที่มีจากแถบด้านซ้าย หรือเลือกตัวอย่างแล้วแก้ไขตามที่ต้องการ<br />ทุกคำตอบมีผลลัพธ์จากฐานข้อมูล พร้อม SQL สำหรับตรวจสอบ</p></div></div>
    <p className="scope-note">ดูแถว สรุปจำนวน ผลรวม ค่าเฉลี่ย และจัดกลุ่มจากคอลัมน์ที่มี เลือกช่วงเวลาและเรียงลำดับได้ สูงสุด 100 แถวต่อคำถาม แต่ละคำถามตอบแยกกัน ยังไม่ต่อจากคำถามก่อนหน้า</p>
    <p className="experimental-note">ต้นแบบทดลอง การตีความคำถามยังคลาดเคลื่อนได้ โปรดตรวจแผนและเงื่อนไขก่อนใช้ผลลัพธ์</p>
  </section>;
}
