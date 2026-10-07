import type { JoinEdge, RelationName } from '../shared/query-schema.js';

export const relationDescriptions: Record<RelationName, { description: string; grain: string }> = {
  orders: { description: 'คำสั่งซื้อ / ออเดอร์. Orders with safely preaggregated item revenue/freight, payments, mean reviews, delivery days; revenue excludes freight. All statuses.', grain: 'One row per order' },
  items: { description: 'รายการสินค้าในคำสั่งซื้อ. Sold line items with item price/freight, purchase timestamp, customer geography, category and seller state. Count DISTINCT order_id for order counts.', grain: 'One row per order item' },
  customers: { description: 'ลูกค้า. Customer identity and address. customer_unique_id identifies repeat customers; customer_id is an order-linked identity.', grain: 'One row per customer_id' },
  products: { description: 'สินค้า. Products with category, weight in grams and physical dimensions in cm.', grain: 'One row per product_id' },
  sellers: { description: 'Seller identity, city, state and postal-code prefix.', grain: 'One row per seller_id' },
  payments: { description: 'Payment records, type, installments and value in BRL. Multiple payments per order possible.', grain: 'One row per payment record' },
  reviews: { description: 'Reviews with score1-5, comment title/text and timestamps. Multiple reviews per order possible.', grain: 'One row per review record' },
  geolocation: { description: 'Brazil geographic coordinates and city/state. Zip prefixes repeat; no safe join declared.', grain: 'One row per geolocation observation' },
  category_translation: { description: 'Portuguese to English product-category translation.', grain: 'One row per Portuguese category' },
};
export const joinEdges: JoinEdge[] = [
  { id: 'items_orders', from: 'items', to: 'orders', fromColumn: 'order_id', toColumn: 'order_id', cardinality: 'many-to-one' },
  { id: 'items_products', from: 'items', to: 'products', fromColumn: 'product_id', toColumn: 'product_id', cardinality: 'many-to-one' },
  { id: 'items_sellers', from: 'items', to: 'sellers', fromColumn: 'seller_id', toColumn: 'seller_id', cardinality: 'many-to-one' },
  { id: 'orders_customers', from: 'orders', to: 'customers', fromColumn: 'customer_id', toColumn: 'customer_id', cardinality: 'many-to-one' },
  { id: 'payments_orders', from: 'payments', to: 'orders', fromColumn: 'order_id', toColumn: 'order_id', cardinality: 'many-to-one' },
  { id: 'reviews_orders', from: 'reviews', to: 'orders', fromColumn: 'order_id', toColumn: 'order_id', cardinality: 'many-to-one' },
  { id: 'products_translation', from: 'products', to: 'category_translation', fromColumn: 'product_category_name', toColumn: 'product_category_name', cardinality: 'many-to-one' },
];
export const columnDescriptions: Record<string, string> = {
  'orders.revenue': 'ยอดขายสินค้า: item-price sum per order in BRL, excluding freight; NULL if no items',
  'orders.freight': 'Item freight sum per order in BRL',
  'items.freight_value': 'Freight of this individual order item in BRL / ค่าขนส่งของสินค้าแต่ละรายการ',
  'orders.payment_total': 'Sum of all recorded payment values per order in BRL',
  'orders.review_score': 'Mean review score per order,1-5',
  'orders.delivery_days': 'Purchase-to-delivered timestamp elapsed days; NULL if undelivered',
  'orders.item_count': 'Number of item rows in this order',
  'orders.purchased_at': 'purchase time / วันที่ซื้อคำสั่งซื้อ',
  'orders.approved_at': 'payment approval time',
  'orders.delivered_at': 'customer delivery time',
  'orders.delivered_carrier_at': 'carrier delivery handoff time',
  'orders.estimated_delivery_at': 'estimated customer delivery time',
  'items.purchased_at': 'purchase time / วันที่ซื้อ',
  'items.shipping_limit_at': 'shipping deadline / กำหนดส่งสินค้า',
  'items.price': 'ราคาสินค้า: item sale price in BRL excluding freight; SUM for item/category/seller sales',
  'items.category': 'English category; unknown when no category',
  'customers.customer_unique_id': 'Stable buyer identity for distinct customer counts',
};
export const enumColumns: Record<string, string[]> = {
  orders: ['order_status', 'customer_state'], items: ['order_status', 'customer_state', 'seller_state', 'category'],
  customers: ['customer_state'], products: ['product_category_name'], sellers: ['seller_state'],
  payments: ['payment_type'], reviews: [], geolocation: ['geolocation_state'], category_translation: ['product_category_name_english'],
};
