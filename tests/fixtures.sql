CREATE TEMP TABLE customers(customer_id text PRIMARY KEY, customer_unique_id text NOT NULL, customer_state text);
INSERT INTO customers VALUES ('c1', 'buyer1', 'SP'), ('c2', 'buyer1', 'RJ'), ('c3', 'buyer2', 'SP');
CREATE TEMP TABLE orders(order_id text PRIMARY KEY, customer_id text, purchased_at timestamp, delivered_at timestamp, payment_total numeric, revenue numeric, review_score numeric);
INSERT INTO orders VALUES
  ('o1', 'c1', '2017-01-01 12:00', NULL, 25, 25, 3),
  ('o2', 'c2', '2017-01-01 23:59:59', '2017-01-02', 30, 30, 5),
  ('o3', 'c3', '2017-01-02 00:00', NULL, 40, 40, 3);
CREATE TEMP TABLE items(order_id text, order_item_id int, price numeric, freight_value numeric, PRIMARY KEY(order_id, order_item_id));
INSERT INTO items VALUES ('o1', 1, 10, 1), ('o1', 2, 15, 1), ('o2', 1, 30, 2), ('o3', 1, 20, 2), ('o3', 2, 20, 2);
CREATE TEMP TABLE payments(order_id text, payment_sequential int, payment_type text, payment_value numeric, PRIMARY KEY(order_id, payment_sequential));
INSERT INTO payments VALUES ('o1', 1, 'credit_card', 10), ('o1', 2, 'voucher', 15), ('o2', 1, 'credit_card', 30), ('o3', 1, 'boleto', 40);
CREATE TEMP TABLE reviews(order_id text, review_score numeric);
INSERT INTO reviews VALUES ('o1', 1), ('o1', 5), ('o2', 5), ('o3', 3);
