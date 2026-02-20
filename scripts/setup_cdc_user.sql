-- ⚠️ ต้องรันใน pgAdmin โดยใช้ superuser (postgres) เท่านั้น
-- รันครั้งเดียวที่ Database ไหนก็ได้ (User เป็น global level)

-- 1. ให้สิทธิ์ Replication กับ user 'web_dashboard'
ALTER USER web_dashboard WITH REPLICATION;

-- 2. ตรวจสอบว่าสำเร็จหรือไม่
SELECT usename, usesuper, userepl FROM pg_shadow WHERE usename = 'web_dashboard';

-- หมายเหตุ: ต้องตรวจสอบด้วยว่า user 'web_dashboard' มีสิทธิ์ Login ด้วยรหัสผ่านที่ตั้งไว้
-- ALTER USER web_dashboard WITH PASSWORD 'Web2026!';
