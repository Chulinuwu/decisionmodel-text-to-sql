import { relationNames, type Column, type DatabaseSchema } from '../shared/query-schema.js';
import { columnDescriptions, joinEdges, relationDescriptions } from '../server/schema-config.js';

const states = ['MG', 'PR', 'RJ', 'RS', 'SC', 'SP'];
const values: Record<string, string[]> = {
  'orders.order_status': ['canceled', 'created', 'delivered', 'shipped'], 'items.order_status': ['canceled', 'delivered', 'shipped'],
  'orders.customer_state': states, 'items.customer_state': states, 'customers.customer_state': states,
  'items.seller_state': states, 'sellers.seller_state': states, 'payments.payment_type': ['boleto', 'credit_card', 'voucher'],
  'items.category': ['health_beauty', 'watches_gifts'], 'category_translation.product_category_name_english': ['health_beauty', 'watches_gifts'],
  'products.product_category_name': ['beleza_saude', 'relogios_presentes'],
};
// Mirrors the introspected analytics views (name:type), so planner tests exercise the real semantic catalog.
const columns: Record<string, string> = {
  orders: 'order_id:text customer_id:text order_status:text purchased_at:timestamp approved_at:timestamp delivered_carrier_at:timestamp delivered_at:timestamp estimated_delivery_at:timestamp customer_unique_id:text customer_state:text customer_city:text item_count:number revenue:number freight:number payment_total:number review_score:number delivery_days:number',
  items: 'order_id:text order_item_id:number product_id:text seller_id:text shipping_limit_at:timestamp price:number freight_value:number purchased_at:timestamp order_status:text customer_unique_id:text customer_state:text customer_city:text category:text seller_state:text',
  customers: 'customer_id:text customer_unique_id:text customer_zip_code_prefix:text customer_city:text customer_state:text',
  products: 'product_id:text product_category_name:text product_name_length:number product_description_length:number product_photos_qty:number product_weight_g:number product_length_cm:number product_height_cm:number product_width_cm:number',
  sellers: 'seller_id:text seller_zip_code_prefix:text seller_city:text seller_state:text',
  payments: 'order_id:text payment_sequential:number payment_type:text payment_installments:number payment_value:number',
  reviews: 'review_id:text order_id:text review_score:number review_comment_title:text review_comment_message:text review_created_at:timestamp review_answered_at:timestamp',
  geolocation: 'geolocation_zip_code_prefix:text geolocation_lat:number geolocation_lng:number geolocation_city:text geolocation_state:text',
  category_translation: 'product_category_name:text product_category_name_english:text',
};
const columnType = (type: string | undefined): Column['type'] => type === 'number' || type === 'timestamp' || type === 'date' ? type : 'text';

export const fixtureSchema: DatabaseSchema = {
  edges: joinEdges,
  coverage: { start: '2017-01-01', end: '2018-09-01' },
  relations: relationNames.map(name => ({
    name, ...relationDescriptions[name],
    columns: (columns[name] ?? '').split(' ').map(entry => {
      const [column = '', type] = entry.split(':');
      return { name: column, type: columnType(type), nullable: true, description: columnDescriptions[`${name}.${column}`] ?? column.replaceAll('_', ' '), values: values[`${name}.${column}`] ?? [] };
    }),
  })),
};
