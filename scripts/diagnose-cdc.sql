-- ClickHouse - CDC Data Source Diagnostic Queries
-- ตรวจสอบแหล่งที่มาของข้อมูลใน ClickHouse

-- 1. ตรวจสอบ Tables ทั้งหมดใน database
SHOW TABLES FROM datachangsiam;

-- 2. ดูโครงสร้างตาราง (แทน 'your_table' ด้วยชื่อตารางจริง)
-- DESCRIBE TABLE datachangsiam.your_table;

-- 3. นับจำนวนข้อมูลในแต่ละตาราง
-- SELECT 
--     database,
--     table,
--     formatReadableSize(sum(bytes)) as size,
--     sum(rows) as rows,
--     max(modification_time) as latest_modification
-- FROM system.parts
-- WHERE database = 'datachangsiam'
-- GROUP BY database, table
-- ORDER BY rows DESC;

-- 4. ตรวจสอบว่ามี column ระบุแหล่งที่มาหรือไม่ (เช่น source_db, branch_id, _source)
-- หากมี Kafka engine อาจจะมี metadata columns
-- SELECT * FROM datachangsiam.your_table LIMIT 10;

-- 5. ถ้ามี Kafka Engine Tables
SELECT 
    name,
    engine,
    engine_full,
    create_table_query
FROM system.tables
WHERE database = 'datachangsiam' 
  AND engine LIKE '%Kafka%';

-- 6. ตรวจสอบ Materialized Views (ที่อ่านจาก Kafka)
SELECT 
    database,
    name,
    engine,
    as_select
FROM system.tables
WHERE database = 'datachangsiam' 
  AND engine = 'MaterializedView';

-- 7. ดู metadata ของ Kafka consumers (ถ้ามี)
-- SELECT * FROM system.kafka_consumers;

-- 8. ตรวจสอบข้อมูลล่าสุดที่เข้ามา
-- SELECT 
--     *,
--     _timestamp as kafka_timestamp  -- Kafka metadata column
-- FROM datachangsiam.your_table
-- ORDER BY _timestamp DESC
-- LIMIT 20;

-- ===========================================
-- วิธีตรวจสอบว่าข้อมูลมาจากกี่ฐาน:
-- ===========================================

-- 9. ถ้ามี column ที่บอกฐาน (เช่น branch_code, source_db):
-- SELECT 
--     branch_code,
--     COUNT(*) as record_count,
--     MIN(created_at) as first_record,
--     MAX(created_at) as last_record
-- FROM datachangsiam.your_table
-- GROUP BY branch_code
-- ORDER BY branch_code;

-- 10. ตรวจสอบ Debezium metadata (ถ้ามีการใช้ CDC)
-- Debezium มักจะส่ง metadata มาด้วย เช่น __source_db, __source_table
-- SELECT DISTINCT 
--     __source_db,
--     __source_table,
--     COUNT(*) as records
-- FROM datachangsiam.your_kafka_table
-- GROUP BY __source_db, __source_table;
