export const warningMessages = {
  probability: 'Probability เป็นค่าที่โมเดลรายงาน ไม่ใช่การรับรองความถูกต้อง โปรดตรวจแผนและเงื่อนไขก่อนตีความ',
  grain: (grain: string) => `หน่วยแถว: ${grain}`,
  money: 'เงินเป็น BRL; revenue/price คือราคาสินค้า ไม่รวม freight และไม่ใช่ยอดสุทธิหลังคืนเงินหรือส่วนลด',
  allStatuses: 'รวมทุกสถานะคำสั่งซื้อ รวม canceled; ยังไม่ได้กรอง delivered',
  anomaly: 'ค่าผิดปกติใช้ modified z-score (ค่ามัธยฐานและ MAD) เกณฑ์ |score| >= 3.5 เป็นสัญญาณให้ตรวจสอบ ไม่ใช่การอธิบายสาเหตุ',
  periodChange: 'เปรียบเทียบเฉพาะช่วงที่มีข้อมูลครบ ช่วงก่อนหน้ามีความยาวเท่ากับช่วงปัจจุบัน; pct_change เป็นร้อยละและว่างเมื่อค่าก่อนหน้าเป็น 0',
  distinctGroups: 'จำนวน DISTINCT ของแต่ละกลุ่มอาจบวกกันแล้วมากกว่าจำนวนรวม เพราะตัวตนเดียวอยู่ได้หลายกลุ่ม',
};

export const answerMessages = {
  empty: 'ไม่พบข้อมูลที่ตรงกับคำถามนี้',
  missing: 'ไม่มีค่า',
  rowCount: (rows: number, truncated: boolean, capped: boolean, ranked: boolean) => capped ? `แสดง ${rows} แถวแรก ยังมีแถวอื่นที่ไม่ได้แสดง` : truncated ? `แสดง ${rows} ${ranked ? 'อันดับ' : 'แถว'}ตามที่ขอ` : `พบ ${rows} แถว`,
  firstRow: (ranked: boolean) => ranked ? 'อันดับแรกคือ' : 'แถวแรกคือ',
  noOutlier: (rows: number, threshold: number) => `ไม่พบค่าผิดปกติตามเกณฑ์ modified z-score ${threshold} ใน ${rows} หน่วยที่แสดง`,
  noOutlierShown: (rows: number) => `ไม่พบค่าผิดปกติใน ${rows} หน่วยที่แสดง แต่หน่วยที่ไม่ได้แสดงอาจมีค่าผิดปกติ`,
  outliers: (count: number, atLeast: boolean, unit: string) => `พบ${unit}ที่ผิดปกติ${atLeast ? 'อย่างน้อย' : ''} ${count} รายการ`,
  topOutlier: (unit: string, measure: string, value: string, baseline: string, score: string) => `ผิดปกติมากที่สุดคือ ${unit} (${measure} ${value} เทียบค่ามัธยฐาน ${baseline}, score ${score})`,
  change: (measure: string, current: string, previous: string) => `${measure} ช่วงปัจจุบัน ${current} เทียบกับช่วงก่อนหน้า ${previous}`,
  pct: (pct: string) => `เปลี่ยนแปลง ${pct}`,
  noPct: 'คำนวณร้อยละไม่ได้เพราะช่วงก่อนหน้าไม่มีค่าหรือเป็น 0',
};

export const moneyColumns = ['price', 'revenue', 'freight', 'freight_value', 'payment_total', 'payment_value'];
export const statusScopedRelations = ['orders', 'items'];
