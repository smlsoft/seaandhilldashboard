-- ===============================================================
-- 🛠️ คำสั่งสร้าง "สะพานเชื่อม" ClickHouse <-> Kafka (CDC)
-- ===============================================================
-- ตารางเหล่านี้จะทำหน้าที่ดึงข้อมูลจาก Kafka Topic (ที่ Debezium ส่งมา)
-- แล้วเอาไปใส่ในตารางหลักที่แสดงผลบน Dashboard อัตโนมัติ

-- หมายเหตุ: ชื่อ Topic ใน Kafka จะใช้รูปแบบ: branch_xxx.public.tablename
-- โดย xxx คือรหัสสาขา (000, 001, 002, 003, 004, 005)

-- ---------------------------------------------------------------
-- 📌 1. ตาราง: journal_transaction_detail
-- ---------------------------------------------------------------

-- ก) ตารางรับข้อมูลดิบจาก Kafka (Queue)
CREATE TABLE IF NOT EXISTS datachangsiam.journal_transaction_detail_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092', 
    kafka_topic_list = 'branch_000.public.journal_transaction_detail,branch_001.public.journal_transaction_detail,branch_002.public.journal_transaction_detail,branch_003.public.journal_transaction_detail,branch_004.public.journal_transaction_detail,branch_005.public.journal_transaction_detail',
    kafka_group_name = 'clickhouse_journal_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

-- ข) สร้าง Materialized View เพื่อแปลง JSON และย้ายข้อมูลลงตารางหลัก
CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.journal_transaction_detail_mv
TO datachangsiam.journal_transaction_detail
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'period_number') AS period_number,
    JSONExtractString(raw_data, 'payload', 'after', 'account_year') AS account_year,
    JSONExtractString(raw_data, 'payload', 'after', 'book_code') AS book_code,
    JSONExtractString(raw_data, 'payload', 'after', 'book_name') AS book_name,
    JSONExtractString(raw_data, 'payload', 'after', 'account_code') AS account_code,
    JSONExtractString(raw_data, 'payload', 'after', 'account_name') AS account_name,
    JSONExtractFloat(raw_data, 'payload', 'after', 'debit') AS debit,
    JSONExtractFloat(raw_data, 'payload', 'after', 'credit') AS credit,
    JSONExtractString(raw_data, 'payload', 'after', 'account_type') AS account_type,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync_name') AS branch_sync_name
FROM datachangsiam.journal_transaction_detail_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 2. ตาราง: payment_transaction
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.payment_transaction_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.payment_transaction,branch_001.public.payment_transaction,branch_002.public.payment_transaction,branch_003.public.payment_transaction,branch_004.public.payment_transaction,branch_005.public.payment_transaction',
    kafka_group_name = 'clickhouse_payment_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.payment_transaction_mv
TO datachangsiam.payment_transaction
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'status_cancel') AS status_cancel,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_type') AS doc_type,
    JSONExtractString(raw_data, 'payload', 'after', 'pay_type') AS pay_type,
    JSONExtractString(raw_data, 'payload', 'after', 'debtor_creditor_type') AS debtor_creditor_type,
    JSONExtractString(raw_data, 'payload', 'after', 'debtor_creditor_name') AS debtor_creditor_name,
    JSONExtractFloat(raw_data, 'payload', 'after', 'total_amount') AS total_amount,
    JSONExtractFloat(raw_data, 'payload', 'after', 'total_net_amount') AS total_net_amount,
    JSONExtractFloat(raw_data, 'payload', 'after', 'total_amount_pay') AS total_amount_pay,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.payment_transaction_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 3. ตาราง: purchase_transaction
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.purchase_transaction_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.purchase_transaction,branch_001.public.purchase_transaction,branch_002.public.purchase_transaction,branch_003.public.purchase_transaction,branch_004.public.purchase_transaction,branch_005.public.purchase_transaction',
    kafka_group_name = 'clickhouse_purchase_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.purchase_transaction_mv
TO datachangsiam.purchase_transaction
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'status_cancel') AS status_cancel,
    JSONExtractFloat(raw_data, 'payload', 'after', 'total_amount') AS total_amount,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.purchase_transaction_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 4. ตาราง: purchase_transaction_detail
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.purchase_transaction_detail_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.purchase_transaction_detail,branch_001.public.purchase_transaction_detail,branch_002.public.purchase_transaction_detail,branch_003.public.purchase_transaction_detail,branch_004.public.purchase_transaction_detail,branch_005.public.purchase_transaction_detail',
    kafka_group_name = 'clickhouse_purchase_detail_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.purchase_transaction_detail_mv
TO datachangsiam.purchase_transaction_detail
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'item_code') AS item_code,
    JSONExtractFloat(raw_data, 'payload', 'after', 'qty') AS qty,
    JSONExtractFloat(raw_data, 'payload', 'after', 'sum_amount') AS sum_amount,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.purchase_transaction_detail_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 5. ตาราง: saleinvoice_transaction
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.saleinvoice_transaction_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.saleinvoice_transaction,branch_001.public.saleinvoice_transaction,branch_002.public.saleinvoice_transaction,branch_003.public.saleinvoice_transaction,branch_004.public.saleinvoice_transaction,branch_005.public.saleinvoice_transaction',
    kafka_group_name = 'clickhouse_sale_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.saleinvoice_transaction_mv
TO datachangsiam.saleinvoice_transaction
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'status_cancel') AS status_cancel,
    JSONExtractFloat(raw_data, 'payload', 'after', 'total_amount') AS total_amount,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.saleinvoice_transaction_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 6. ตาราง: saleinvoice_transaction_detail
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.saleinvoice_transaction_detail_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.saleinvoice_transaction_detail,branch_001.public.saleinvoice_transaction_detail,branch_002.public.saleinvoice_transaction_detail,branch_003.public.saleinvoice_transaction_detail,branch_004.public.saleinvoice_transaction_detail,branch_005.public.saleinvoice_transaction_detail',
    kafka_group_name = 'clickhouse_sale_detail_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.saleinvoice_transaction_detail_mv
TO datachangsiam.saleinvoice_transaction_detail
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'item_code') AS item_code,
    JSONExtractFloat(raw_data, 'payload', 'after', 'qty') AS qty,
    JSONExtractFloat(raw_data, 'payload', 'after', 'sum_amount') AS sum_amount,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_code') AS branch_code,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_name') AS branch_name,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.saleinvoice_transaction_detail_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- ---------------------------------------------------------------
-- 📌 7. ตาราง: stock_transaction
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS datachangsiam.stock_transaction_queue
(
    raw_data String
)
ENGINE = Kafka
SETTINGS 
    kafka_broker_list = 'localhost:9092',
    kafka_topic_list = 'branch_000.public.stock_transaction,branch_001.public.stock_transaction,branch_002.public.stock_transaction,branch_003.public.stock_transaction,branch_004.public.stock_transaction,branch_005.public.stock_transaction',
    kafka_group_name = 'clickhouse_stock_sync',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS datachangsiam.stock_transaction_mv
TO datachangsiam.stock_transaction
AS
SELECT 
    JSONExtractDateTime(raw_data, 'payload', 'after', 'doc_datetime') AS doc_datetime,
    JSONExtractString(raw_data, 'payload', 'after', 'doc_no') AS doc_no,
    JSONExtractString(raw_data, 'payload', 'after', 'item_code') AS item_code,
    JSONExtractFloat(raw_data, 'payload', 'after', 'qty') AS qty,
    JSONExtractFloat(raw_data, 'payload', 'after', 'cost') AS cost,
    JSONExtractString(raw_data, 'payload', 'after', 'branch_sync') AS branch_sync
FROM datachangsiam.stock_transaction_queue
WHERE JSONExtractString(raw_data, 'payload', 'op') IN ('c', 'u');


-- 💡 ข้อแนะนำเพิ่มเติม:
-- 1. หากรันใน Docker และใช้ Kafka ในเครือข่ายเดียวกัน ให้เปลี่ยน 'localhost:9092' เป็น 'kafka:29092'
-- 2. เมื่อรัน SQL นี้ครบแล้ว ข้ามไปรันสคริปต์ register_connectors.ps1 เพื่อเริ่มส่งข้อมูลครับ
