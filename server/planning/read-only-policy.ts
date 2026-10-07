// Security policy, not an accuracy heuristic: the service is read-only, so any request phrased as a data
// modification is refused before planning, whatever the decision model would make of it.
const modificationVerbs = [
  /\b(?:delete|truncate|insert|update|upsert|alter|grant|revoke|overwrite)\b/i,
  /\bdrop\s+(?:table|schema|database|view|column)\b/i,
  /(?:ลบ(?:ข้อมูล|ออเดอร์|คำสั่งซื้อ|รายการ|ลูกค้า|สินค้า|รีวิว|ทิ้ง|ออก|ทั้งหมด)|แก้ไขข้อมูล|อัปเดต|อัพเดต|อัพเดท|เพิ่มข้อมูล|แทรกข้อมูล|เปลี่ยนสถานะ)/u,
];

export function violatesReadOnlyPolicy(question: string) {
  return modificationVerbs.some(pattern => pattern.test(question));
}
