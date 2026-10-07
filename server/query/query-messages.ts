export const warningMessages = {
  probability: 'Probability เป็นค่าที่โมเดลรายงาน ไม่ใช่การรับรองความถูกต้อง โปรดตรวจแผนและเงื่อนไขก่อนตีความ',
  grain: (grain: string) => `หน่วยแถว: ${grain}`,
  money: 'เงินเป็น BRL; revenue/price คือราคาสินค้า ไม่รวม freight และไม่ใช่ยอดสุทธิหลังคืนเงินหรือส่วนลด',
  allStatuses: 'รวมทุกสถานะคำสั่งซื้อ รวม canceled; ยังไม่ได้กรอง delivered',
  anomaly: 'ค่าผิดปกติใช้ modified z-score (ค่ามัธยฐานและ MAD) เกณฑ์ |score| >= 3.5 เป็นสัญญาณให้ตรวจสอบ ไม่ใช่การอธิบายสาเหตุ',
  periodChange: 'เปรียบเทียบเฉพาะช่วงที่มีข้อมูลครบ ช่วงก่อนหน้ามีความยาวเท่ากับช่วงปัจจุบัน; pct_change เป็นร้อยละและว่างเมื่อค่าก่อนหน้าเป็น 0',
  distinctGroups: 'จำนวน DISTINCT ของแต่ละกลุ่มอาจบวกกันแล้วมากกว่าจำนวนรวม เพราะตัวตนเดียวอยู่ได้หลายกลุ่ม',
};

export const moneyColumns = ['price', 'revenue', 'freight', 'freight_value', 'payment_total', 'payment_value'];
export const statusScopedRelations = ['orders', 'items'];
