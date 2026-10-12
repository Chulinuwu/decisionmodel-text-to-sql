import { meterExamples } from '../meter/examples';
import type { ChatDatabase, DatabaseEntry } from '../types/database';

const brazilianEcommerce: ChatDatabase = {
  id: 'brazilian-ecommerce',
  name: 'Brazilian E-Commerce',
  description: 'คำสั่งซื้อจากร้านค้าออนไลน์ในบราซิล ปี 2016-2018',
  about: 'ข้อมูลสาธารณะจาก Kaggle ของร้านค้าออนไลน์ในบราซิล ครอบคลุมคำสั่งซื้อ ลูกค้า ผู้ขาย สินค้า การชำระเงิน การจัดส่ง และรีวิว เหมาะกับคำถามที่นับจำนวน หาผลรวมหรือค่าเฉลี่ย จัดกลุ่มตามรัฐ หมวดสินค้า หรือช่วงเวลา จัดอันดับ และเทียบช่วงเวลา แต่ละคำถามตอบแยกกัน ยังไม่ต่อจากคำถามก่อนหน้า',
  examples: [
    'จำนวนคำสั่งซื้อแยกตามรัฐของลูกค้าในปี 2017',
    'หมวดสินค้าไหนมียอดขายรวมสูงสุด 10 อันดับ',
    'คะแนนรีวิวเฉลี่ยแยกตามเดือนในปี 2018',
    'วิธีชำระเงินแบบไหนถูกใช้มากที่สุด',
  ],
  placeholder: 'เช่น จำนวนคำสั่งซื้อแยกตามรัฐของลูกค้าในปี 2017',
  engine: 'chat',
  endpoints: { detail: '/api/dataset', query: '/api/query', execute: '/api/execute', tables: '/api/databases/brazilian-ecommerce/tables' },
};

export const databases: readonly DatabaseEntry[] = [
  brazilianEcommerce,
  {
    id: 'synthetic-meters',
    name: 'Synthetic meters',
    description: 'มิเตอร์จำลองการใช้น้ำและสารเคมีในอาคาร',
    about: 'ข้อมูลจำลองจากมิเตอร์ในหลายอาคารและหลายชั้น ไม่ได้เชื่อมกับโรงงานจริง ถามปริมาณการใช้ อันดับมิเตอร์ เทียบกับช่วงก่อนหน้า หาค่าผิดปกติ หรือมิเตอร์ที่ไม่ส่งข้อมูลได้ ถามต่อจากคำถามก่อนหน้าในแชทเดียวกันได้ คำตอบอธิบายค่าที่บันทึกไว้ ไม่ได้ยืนยันสาเหตุ ถามเป็นภาษาไทยหรืออังกฤษก็ได้',
    examples: meterExamples.slice(0, 4),
    placeholder: `เช่น ${meterExamples[0]}`,
    engine: 'meter',
    endpoints: { detail: '/api/meter/dataset', query: '/api/meter/query', tables: '/api/databases/synthetic-meters/tables' },
    tables: ['meters', 'readings'],
  },
];

export const defaultDatabase: DatabaseEntry = brazilianEcommerce;
export const findDatabase = (id: string | null) => databases.find(database => database.id === id);
