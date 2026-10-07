import type { LiveCase } from './live-eval.types.js';

export const liveCases: LiveCase[] = [
  { question: 'How many orders are there?', gold: 'SELECT count(*) FROM raw.orders' },
  { question: 'List the 5 heaviest products with their ID and weight in grams.', gold: 'SELECT product_id, product_weight_g::numeric FROM raw.products WHERE product_weight_g IS NOT NULL ORDER BY product_weight_g::numeric DESC, product_id LIMIT 5', ordered: true },
  { question: 'How many order items cost more than 100 BRL and have freight less than 20 BRL?', gold: 'SELECT count(*) FROM raw.items WHERE price::numeric > 100 AND freight_value::numeric < 20' },
  { question: 'ยอดขายสินค้าแยกตามเดือนในปี 2017', gold: "SELECT date_trunc('month',order_purchase_timestamp::timestamp)::date, sum(i.price::numeric) FROM raw.orders o JOIN raw.items i USING(order_id) WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2018-01-01' GROUP BY 1 ORDER BY 1" },
  { question: 'Total recorded payment value by payment type, largest first.', gold: 'SELECT payment_type, sum(payment_value::numeric) FROM raw.payments GROUP BY payment_type ORDER BY 2 DESC,1', ordered: true },
  { question: 'Average payment installments for credit_card payments.', gold: "SELECT avg(payment_installments::numeric) FROM raw.payments WHERE payment_type='credit_card'" },
  { question: 'How many distinct customers placed an order in 2017?', gold: "SELECT count(DISTINCT customer_unique_id) FROM raw.orders o JOIN raw.customers c USING(customer_id) WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2018-01-01'" },
  { question: 'Item revenue by seller state, highest first.', gold: 'SELECT seller_state,sum(price::numeric) FROM raw.items i JOIN raw.sellers s USING(seller_id) GROUP BY seller_state ORDER BY 2 DESC,1', ordered: true },
  { question: 'Count orders whose customer state is SP or RJ.', gold: "SELECT count(*) FROM raw.orders o JOIN raw.customers c USING(customer_id) WHERE customer_state='SP' OR customer_state='RJ'" },
  { question: 'Count orders purchased on 2017-01-01.', gold: "SELECT count(*) FROM raw.orders WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2017-01-02'" },
  { question: 'Count items whose shipping deadline was in 2017.', gold: "SELECT count(*) FROM raw.items WHERE shipping_limit_date::timestamp >= timestamp '2017-01-01' AND shipping_limit_date::timestamp < timestamp '2018-01-01'" },
  { question: 'Count orders with no customer delivery timestamp.', gold: 'SELECT count(*) FROM raw.orders WHERE order_delivered_customer_date IS NULL' },
  { question: 'Average review score by order status.', gold: 'SELECT order_status,avg(review_score::numeric) FROM raw.reviews r JOIN raw.orders o USING(order_id) GROUP BY order_status ORDER BY 1' },
  { question: 'ยอดขายสินค้าในปี 2017 ไม่รวมออเดอร์ยกเลิก', gold: "SELECT sum(price::numeric) FROM raw.items i JOIN raw.orders o USING(order_id) WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2018-01-01' AND order_status <> 'canceled'" },
  { question: 'Net sales after refunds and discounts by month', gold: null },
  { question: 'ลูกค้าซื้อซ้ำภายใน 30 วันมีกี่คน', gold: null },
  { question: 'Show year-over-year percentage change in payment total from2017 to2018', gold: null },
  { question: 'Delete all canceled orders and show the remaining count', gold: null },
  { question: 'มีคำสั่งซื้อทั้งหมดกี่รายการ', gold: 'SELECT count(*) FROM raw.orders' },
  { question: 'ยอดขายปี 2017 เดือนไหนขายดีสุดอะ', gold: "SELECT date_trunc('month',order_purchase_timestamp::timestamp)::date, sum(i.price::numeric) FROM raw.orders o JOIN raw.items i USING(order_id) WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2018-01-01' GROUP BY 1 ORDER BY 2 DESC LIMIT 1" },
];
