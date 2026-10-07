CREATE MATERIALIZED VIEW analytics.orders AS
WITH item_totals AS (
  SELECT order_id, count(*)::int item_count, sum(price::numeric) revenue, sum(freight_value::numeric) freight
  FROM raw.items GROUP BY order_id
), payment_totals AS (
  SELECT order_id, sum(payment_value::numeric) payment_total FROM raw.payments GROUP BY order_id
), review_totals AS (
  SELECT order_id, avg(review_score::numeric) review_score FROM raw.reviews GROUP BY order_id
)
SELECT o.order_id, o.customer_id, o.order_status, o.order_purchase_timestamp::timestamp purchased_at,
  o.order_approved_at::timestamp approved_at, o.order_delivered_carrier_date::timestamp delivered_carrier_at,
  o.order_delivered_customer_date::timestamp delivered_at, o.order_estimated_delivery_date::timestamp estimated_delivery_at,
  c.customer_unique_id, c.customer_state, c.customer_city,
  coalesce(i.item_count, 0) item_count, i.revenue, i.freight, p.payment_total, r.review_score,
  extract(epoch FROM (o.order_delivered_customer_date::timestamp - o.order_purchase_timestamp::timestamp)) / 86400.0 delivery_days
FROM raw.orders o
JOIN raw.customers c USING (customer_id)
LEFT JOIN item_totals i USING (order_id)
LEFT JOIN payment_totals p USING (order_id)
LEFT JOIN review_totals r USING (order_id);

CREATE UNIQUE INDEX orders_id_idx ON analytics.orders(order_id);
CREATE INDEX orders_date_idx ON analytics.orders(purchased_at);
CREATE INDEX orders_state_idx ON analytics.orders(customer_state);

CREATE MATERIALIZED VIEW analytics.items AS
SELECT i.order_id, i.order_item_id::int order_item_id, i.product_id, i.seller_id,
  i.shipping_limit_date::timestamp shipping_limit_at, i.price::numeric price, i.freight_value::numeric freight_value,
  o.purchased_at, o.order_status, o.customer_unique_id, o.customer_state, o.customer_city,
  coalesce(t.product_category_name_english, p.product_category_name, 'unknown') category,
  s.seller_state
FROM raw.items i
JOIN analytics.orders o USING (order_id)
JOIN raw.products p USING (product_id)
JOIN raw.sellers s USING (seller_id)
LEFT JOIN raw.category_translation t USING (product_category_name);

CREATE UNIQUE INDEX items_id_idx ON analytics.items(order_id, order_item_id);
CREATE INDEX items_date_idx ON analytics.items(purchased_at);
CREATE INDEX items_category_idx ON analytics.items(category);
ANALYZE analytics.orders;
ANALYZE analytics.items;

CREATE VIEW analytics.customers AS SELECT customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state FROM raw.customers;
CREATE VIEW analytics.products AS SELECT product_id, product_category_name, product_name_lenght::int product_name_length, product_description_lenght::int product_description_length, product_photos_qty::int product_photos_qty, product_weight_g::numeric product_weight_g, product_length_cm::numeric product_length_cm, product_height_cm::numeric product_height_cm, product_width_cm::numeric product_width_cm FROM raw.products;
CREATE VIEW analytics.sellers AS SELECT seller_id, seller_zip_code_prefix, seller_city, seller_state FROM raw.sellers;
CREATE VIEW analytics.payments AS SELECT order_id, payment_sequential::int payment_sequential, payment_type, payment_installments::int payment_installments, payment_value::numeric payment_value FROM raw.payments;
CREATE VIEW analytics.reviews AS SELECT review_id, order_id, review_score::numeric review_score, review_comment_title, review_comment_message, review_creation_date::timestamp review_created_at, review_answer_timestamp::timestamp review_answered_at FROM raw.reviews;
CREATE VIEW analytics.geolocation AS SELECT geolocation_zip_code_prefix, geolocation_lat::double precision geolocation_lat, geolocation_lng::double precision geolocation_lng, geolocation_city, geolocation_state FROM raw.geolocation;
CREATE VIEW analytics.category_translation AS SELECT product_category_name, product_category_name_english FROM raw.category_translation;

CREATE UNIQUE INDEX customers_key ON raw.customers(customer_id);
CREATE UNIQUE INDEX products_key ON raw.products(product_id);
CREATE UNIQUE INDEX sellers_key ON raw.sellers(seller_id);
CREATE UNIQUE INDEX translations_key ON raw.category_translation(product_category_name);
