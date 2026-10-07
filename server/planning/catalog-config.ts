import type { RelationName } from '../../shared/query-schema.js';
import type { Analysis, ChangeOrder, ConditionConfig, CountConfig, DateUnit, FieldsConfig, IntentConfig, Label, ListConfig, Operation, OrderChoice, RelativeChoice } from './planning.types.js';

export const entityLabels: Record<RelationName, Label> = {
  orders: { th: 'คำสั่งซื้อ', en: 'orders' }, items: { th: 'รายการสินค้า', en: 'order items' },
  customers: { th: 'ลูกค้า', en: 'customer ids' }, products: { th: 'สินค้า', en: 'products' },
  sellers: { th: 'ผู้ขาย', en: 'sellers' }, payments: { th: 'รายการชำระเงิน', en: 'payment records' },
  reviews: { th: 'รีวิว', en: 'reviews' }, geolocation: { th: 'จุดพิกัด', en: 'geolocation rows' },
  category_translation: { th: 'หมวดหมู่สินค้า', en: 'category translations' },
};

// Keyed by column name because the same semantic column repeats across relations; relation-qualified keys override.
export const fieldLabels: Record<string, Label> = {
  order_id: { th: 'คำสั่งซื้อ', en: 'order id' }, order_item_id: { th: 'ลำดับสินค้าในคำสั่งซื้อ', en: 'item sequence' },
  customer_id: { th: 'รหัสลูกค้าตามคำสั่งซื้อ', en: 'order customer id' }, customer_unique_id: { th: 'ลูกค้า (ไม่ซ้ำ)', en: 'buyer' },
  product_id: { th: 'สินค้า', en: 'product id' }, seller_id: { th: 'ผู้ขาย', en: 'seller id' }, review_id: { th: 'รีวิว', en: 'review id' },
  order_status: { th: 'สถานะคำสั่งซื้อ', en: 'order status' },
  purchased_at: { th: 'วันที่ซื้อ', en: 'purchase date' }, approved_at: { th: 'วันที่อนุมัติชำระเงิน', en: 'payment approval date' },
  delivered_carrier_at: { th: 'วันที่ส่งให้ขนส่ง', en: 'carrier handoff date' }, delivered_at: { th: 'วันที่ลูกค้าได้รับสินค้า', en: 'customer delivery date' },
  estimated_delivery_at: { th: 'วันส่งถึงโดยประมาณ', en: 'estimated delivery date' }, shipping_limit_at: { th: 'กำหนดส่งสินค้า', en: 'shipping deadline' },
  review_created_at: { th: 'วันที่สร้างรีวิว', en: 'review creation date' }, review_answered_at: { th: 'วันที่ตอบรีวิว', en: 'review answer date' },
  customer_state: { th: 'รัฐของลูกค้า', en: 'customer state' }, customer_city: { th: 'เมืองของลูกค้า', en: 'customer city' },
  customer_zip_code_prefix: { th: 'รหัสไปรษณีย์ลูกค้า', en: 'customer zip prefix' },
  seller_state: { th: 'รัฐของผู้ขาย', en: 'seller state' }, seller_city: { th: 'เมืองของผู้ขาย', en: 'seller city' },
  seller_zip_code_prefix: { th: 'รหัสไปรษณีย์ผู้ขาย', en: 'seller zip prefix' },
  item_count: { th: 'จำนวนสินค้าทั้งคำสั่งซื้อ', en: 'number of items in the whole order' }, revenue: { th: 'ยอดขายสินค้ารวมทั้งคำสั่งซื้อ', en: 'total item revenue of the whole order' },
  freight: { th: 'ค่าขนส่งรวมทั้งคำสั่งซื้อ', en: 'total freight of the whole order' }, payment_total: { th: 'ยอดชำระรวมทั้งคำสั่งซื้อ', en: 'total payments of the whole order' },
  'orders.review_score': { th: 'คะแนนรีวิวเฉลี่ยของคำสั่งซื้อ', en: 'mean review score of the whole order' },
  review_score: { th: 'คะแนนรีวิว', en: 'score of each review 1-5' }, delivery_days: { th: 'จำนวนวันจัดส่ง', en: 'delivery days of each order' },
  price: { th: 'ยอดขายสินค้า', en: 'price of each order item' }, freight_value: { th: 'ค่าขนส่งรายสินค้า', en: 'freight of each order item' },
  category: { th: 'หมวดหมู่สินค้า', en: 'category' }, product_category_name_english: { th: 'หมวดหมู่สินค้า', en: 'category' },
  product_category_name: { th: 'หมวดหมู่สินค้า (โปรตุเกส)', en: 'Portuguese category' },
  product_name_length: { th: 'ความยาวชื่อสินค้า', en: 'product name length' }, product_description_length: { th: 'ความยาวคำอธิบายสินค้า', en: 'product description length' },
  product_photos_qty: { th: 'จำนวนรูปสินค้า', en: 'product photo count' }, product_weight_g: { th: 'น้ำหนักสินค้า (กรัม)', en: 'product weight g' },
  product_length_cm: { th: 'ความยาวสินค้า (ซม.)', en: 'product length cm' }, product_height_cm: { th: 'ความสูงสินค้า (ซม.)', en: 'product height cm' },
  product_width_cm: { th: 'ความกว้างสินค้า (ซม.)', en: 'product width cm' },
  payment_sequential: { th: 'ลำดับการชำระเงิน', en: 'payment sequence' }, payment_type: { th: 'ประเภทการชำระเงิน', en: 'payment type' },
  payment_installments: { th: 'จำนวนงวดผ่อน', en: 'installments of each payment' }, payment_value: { th: 'ยอดชำระเงิน', en: 'value of each payment record' },
  review_comment_title: { th: 'หัวข้อรีวิว', en: 'review title' }, review_comment_message: { th: 'ข้อความรีวิว', en: 'review text' },
};

export const countMeasures: CountConfig[] = [
  { id: 'count_orders', th: 'จำนวนคำสั่งซื้อ', en: 'number of orders', realizations: [{ root: 'orders', field: null }, { root: 'items', field: 'items.order_id' }, { root: 'payments', field: 'payments.order_id' }, { root: 'reviews', field: 'reviews.order_id' }] },
  { id: 'count_items', th: 'จำนวนรายการสินค้าที่ขาย', en: 'number of order item rows (units sold), not orders', realizations: [{ root: 'items', field: null }] },
  { id: 'count_buyers', th: 'จำนวนลูกค้าไม่ซ้ำ', en: 'number of distinct buyers', realizations: [{ root: 'orders', field: 'orders.customer_unique_id' }, { root: 'items', field: 'items.customer_unique_id' }, { root: 'payments', field: 'orders.customer_unique_id' }, { root: 'reviews', field: 'orders.customer_unique_id' }] },
  { id: 'count_sellers', th: 'จำนวนผู้ขาย', en: 'number of sellers', realizations: [{ root: 'sellers', field: null }, { root: 'items', field: 'items.seller_id' }] },
  { id: 'count_products', th: 'จำนวนสินค้า (ชนิด)', en: 'number of products', realizations: [{ root: 'products', field: null }, { root: 'items', field: 'items.product_id' }] },
  { id: 'count_payments', th: 'จำนวนรายการชำระเงิน', en: 'number of payment records', realizations: [{ root: 'payments', field: null }] },
  { id: 'count_reviews', th: 'จำนวนรีวิว', en: 'number of reviews', realizations: [{ root: 'reviews', field: null }] },
];

// Realizations are ordered: the first root that reaches every requested dimension and filter wins. Orders summary
// columns that restate a child measure are fallback realizations only, never standalone measures or filter fields.
export const numericMeasures: FieldsConfig[] = [
  { id: 'revenue', th: 'ยอดขายสินค้า', en: 'sales revenue / ยอดขาย: price of order items in BRL, excl. freight', fields: ['items.price', 'orders.revenue'] },
  { id: 'order_value', th: 'ยอดขายสินค้ารวมทั้งคำสั่งซื้อ', en: 'value of the whole order: one total per order, for average/min/max order value', fields: ['orders.revenue'] },
  { id: 'item_freight', th: 'ค่าขนส่งรายสินค้า', en: 'freight of each order item', fields: ['items.freight_value'] },
  { id: 'order_freight', th: 'ค่าขนส่งรวมทั้งคำสั่งซื้อ', en: 'total freight of the whole order: one total per order', fields: ['orders.freight'] },
  { id: 'payment_value', th: 'ยอดชำระเงิน', en: 'payment value BRL of each payment record', fields: ['payments.payment_value', 'orders.payment_total'] },
  { id: 'installments', th: 'จำนวนงวดผ่อน', en: 'installments of each payment', fields: ['payments.payment_installments'] },
  { id: 'review_score', th: 'คะแนนรีวิว', en: 'review score 1-5 of each review', fields: ['reviews.review_score', 'orders.review_score'] },
  { id: 'delivery_days', th: 'จำนวนวันจัดส่ง', en: 'delivery days of each order (purchase to delivery)', fields: ['orders.delivery_days'] },
  { id: 'items_per_order', th: 'จำนวนสินค้าต่อคำสั่งซื้อ', en: 'number of items in each order', fields: ['orders.item_count'] },
  { id: 'product_weight', th: 'น้ำหนักสินค้า (กรัม)', en: 'weight g of each product', fields: ['products.product_weight_g'] },
  { id: 'product_length', th: 'ความยาวสินค้า (ซม.)', en: 'length cm of each product', fields: ['products.product_length_cm'] },
  { id: 'product_height', th: 'ความสูงสินค้า (ซม.)', en: 'height cm of each product', fields: ['products.product_height_cm'] },
  { id: 'product_width', th: 'ความกว้างสินค้า (ซม.)', en: 'width cm of each product', fields: ['products.product_width_cm'] },
];
export const excludedNumericColumns = ['order_item_id', 'payment_sequential'];
export const excludedRelations: RelationName[] = ['geolocation'];

export const listMeasures: ListConfig[] = [
  { id: 'list_orders', th: 'รายการคำสั่งซื้อ', en: 'list individual orders', root: 'orders', keys: ['orders.order_id'] },
  { id: 'list_items', th: 'รายการสินค้าในคำสั่งซื้อ', en: 'list individual order items', root: 'items', keys: ['items.order_id', 'items.order_item_id'] },
  { id: 'list_products', th: 'รายการสินค้า', en: 'list individual products', root: 'products', keys: ['products.product_id'] },
  { id: 'list_sellers', th: 'รายการผู้ขาย', en: 'list individual sellers', root: 'sellers', keys: ['sellers.seller_id'] },
  { id: 'list_payments', th: 'รายการชำระเงิน', en: 'list individual payments', root: 'payments', keys: ['payments.order_id', 'payments.payment_sequential'] },
  { id: 'list_reviews', th: 'รายการรีวิว', en: 'list individual reviews', root: 'reviews', keys: ['reviews.review_id'] },
  { id: 'list_customers', th: 'รายการลูกค้า', en: 'list individual customers', root: 'customers', keys: ['customers.customer_id'] },
];

export const categoricalDimensions: FieldsConfig[] = [
  { id: 'order_status', th: 'สถานะคำสั่งซื้อ', en: 'order status', fields: ['orders.order_status', 'items.order_status'] },
  { id: 'customer_state', th: 'รัฐของลูกค้า', en: 'customer state', fields: ['orders.customer_state', 'items.customer_state', 'customers.customer_state'] },
  { id: 'customer_city', th: 'เมืองของลูกค้า', en: 'customer city', fields: ['orders.customer_city', 'items.customer_city', 'customers.customer_city'] },
  { id: 'seller_state', th: 'รัฐของผู้ขาย', en: 'seller state', fields: ['sellers.seller_state', 'items.seller_state'] },
  { id: 'seller_city', th: 'เมืองของผู้ขาย', en: 'seller city', fields: ['sellers.seller_city'] },
  { id: 'category', th: 'หมวดหมู่สินค้า', en: 'product category', fields: ['items.category', 'category_translation.product_category_name_english'] },
  { id: 'category_pt', th: 'หมวดหมู่สินค้า (โปรตุเกส)', en: 'Portuguese product category', fields: ['products.product_category_name'] },
  { id: 'payment_type', th: 'ประเภทการชำระเงิน', en: 'payment type', fields: ['payments.payment_type'] },
  { id: 'review_score_value', th: 'ระดับคะแนนรีวิว', en: 'review score value 1-5', fields: ['reviews.review_score'] },
];

// Portuguese category names restate the English category; linking both would offer one meaning twice.
export const unlinkedDimensions = ['category_pt'];

// Identity dimensions group by an individual entity; the output column is an identifier, not a name.
export const identityDimensions: FieldsConfig[] = [
  { id: 'seller', th: 'ผู้ขายแต่ละราย (รหัสผู้ขาย)', en: 'individual seller (seller id)', fields: ['items.seller_id', 'sellers.seller_id'] },
  { id: 'product', th: 'สินค้าแต่ละชิ้น (รหัสสินค้า)', en: 'individual product (product id)', fields: ['items.product_id', 'products.product_id'] },
  { id: 'buyer', th: 'ลูกค้าแต่ละคน (รหัสลูกค้า)', en: 'individual buyer (customer unique id)', fields: ['orders.customer_unique_id', 'items.customer_unique_id', 'customers.customer_unique_id'] },
  { id: 'order', th: 'คำสั่งซื้อแต่ละรายการ (รหัสคำสั่งซื้อ)', en: 'individual order (order id)', fields: ['orders.order_id', 'items.order_id', 'payments.order_id', 'reviews.order_id'] },
];

// Declared column comparisons; each is offered in both directions.
export const conditions: ConditionConfig[] = [
  { id: 'late_delivery', field: 'orders.delivered_at', operator: 'gt', other: 'orders.estimated_delivery_at', th: 'ส่งถึงลูกค้าช้ากว่าวันส่งถึงโดยประมาณ', en: 'delivered to the customer after the estimated delivery date (late delivery)', negated: { operator: 'lte', th: 'ส่งถึงลูกค้าภายในวันส่งถึงโดยประมาณ', en: 'delivered on or before the estimated delivery date (on time)' } },
  { id: 'late_handoff', field: 'orders.delivered_carrier_at', operator: 'gt', other: 'items.shipping_limit_at', th: 'ส่งให้ขนส่งหลังกำหนดส่งของผู้ขาย', en: 'handed to the carrier after the seller shipping deadline', negated: { operator: 'lte', th: 'ส่งให้ขนส่งภายในกำหนดส่งของผู้ขาย', en: 'handed to the carrier by the seller shipping deadline' } },
  { id: 'freight_over_price', field: 'items.freight_value', operator: 'gt', other: 'items.price', th: 'ค่าขนส่งสูงกว่าราคาสินค้า', en: 'item freight greater than the item price', negated: { operator: 'lte', th: 'ค่าขนส่งไม่เกินราคาสินค้า', en: 'item freight not greater than the item price' } },
];

export const extraTextTargets: FieldsConfig[] = [
  { id: 'review_title', th: 'หัวข้อรีวิว', en: 'review title', fields: ['reviews.review_comment_title'] },
  { id: 'review_message', th: 'ข้อความรีวิว', en: 'review text', fields: ['reviews.review_comment_message'] },
];

export const anchors: FieldsConfig[] = [
  { id: 'purchase', th: 'วันที่ซื้อ', en: 'purchase date', fields: ['orders.purchased_at', 'items.purchased_at'] },
  { id: 'approval', th: 'วันที่อนุมัติชำระเงิน', en: 'payment approval date', fields: ['orders.approved_at'] },
  { id: 'carrier', th: 'วันที่ส่งให้ขนส่ง', en: 'carrier handoff date', fields: ['orders.delivered_carrier_at'] },
  { id: 'delivery', th: 'วันที่ลูกค้าได้รับสินค้า', en: 'customer delivery date', fields: ['orders.delivered_at'] },
  { id: 'estimated', th: 'วันส่งถึงโดยประมาณ', en: 'estimated delivery date', fields: ['orders.estimated_delivery_at'] },
  { id: 'shipping_limit', th: 'กำหนดส่งสินค้า', en: 'seller shipping deadline', fields: ['items.shipping_limit_at'] },
  { id: 'review_created', th: 'วันที่สร้างรีวิว', en: 'review creation date', fields: ['reviews.review_created_at'] },
];

// Intents the data or grammar cannot answer; offered to Clef like measures so they compete with partial plans.
export const intents: IntentConfig[] = [
  { id: 'un_modify', en: 'change data: delete, update or insert records' },
  { id: 'un_repeat', en: 'repeat purchases, or time between purchases of the same customer' },
  { id: 'un_ratio', en: 'percentage share of a total, or a ratio between two different measures' },
  { id: 'un_cause', en: 'why something happened: causes, reasons or explanations of a result' },
  { id: 'un_net_sales', en: 'net sales after refunds, returns or discounts, or profit' },
  { id: 'un_cohort', en: 'customer cohorts, retention or lifetime value' },
  { id: 'un_other', en: 'another computation or data that is not available' },
];

export const dateUnits: Record<DateUnit, Label> = { day: { th: 'วัน', en: 'day' }, month: { th: 'เดือน', en: 'month' }, year: { th: 'ปี', en: 'year' } };
export const operations: Record<Operation, { fn: 'sum' | 'avg' | 'min' | 'max'; en: string }> = {
  total: { fn: 'sum', en: 'total / sum / ยอดรวม' }, average: { fn: 'avg', en: 'average / mean / เฉลี่ย' },
  minimum: { fn: 'min', en: 'smallest single value / ต่ำสุด' }, maximum: { fn: 'max', en: 'largest single value / สูงสุด' },
};
export const orderChoices: Record<OrderChoice, string> = {
  none: 'no explicit sort', value_desc: 'highest / most / best / top first', value_asc: 'lowest / least / worst first',
  time_asc: 'oldest / chronological first', time_desc: 'latest / newest first',
};
export const numberOperators = { gt: 'more than / over / เกิน / มากกว่า', gte: 'at least / ตั้งแต่', lt: 'less than / under / น้อยกว่า', lte: 'at most / ไม่เกิน', eq: 'exactly / เท่ากับ', ne: 'not equal' };
export const limitWords: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

export const analyses: Record<Analysis, string> = {
  select: 'a value, total, breakdown, ranking or list',
  anomaly: 'find unusual, abnormal or outlier units compared with their peers',
  period_change: 'compare a period with the previous period: change, growth, increase or decrease',
};
export const relativeChoices: Record<RelativeChoice, string> = {
  latest_month: 'this / latest month', previous_month: 'last / previous month', latest_year: 'this / latest year', previous_year: 'last / previous year',
};
export const anomalyDirections = { both: 'unusually high or low', high: 'unusually high, spikes', low: 'unusually low, drops' };
export const changeOrders: Record<ChangeOrder, string> = {
  change_desc: 'largest increase first', change_asc: 'largest decrease first', pct_desc: 'fastest growth in percent first', pct_asc: 'steepest decline in percent first',
};
