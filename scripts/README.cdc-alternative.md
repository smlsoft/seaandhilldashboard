# ClickHouse CDC Bridge: Alternative (Node.js)

หากคุณไม่สามารถขอสิทธิ์ `KAFKA` บน ClickHouse ได้ คุณสามารถใช้วิธีสำรองนี้แทนได้ครับ

### 🛠️ วิธีการติดตั้งและรัน

1.  **ติดตั้ง Library**:
    ```bash
    npm install kafkajs
    ```

2.  **รันสคริปต์**:
    ```bash
    node scripts/clickhouse-bridge-service.js
    ```

### 📝 รายละเอียดสคริปต์
สคริปต์นี้จะทำหน้าที่:
1.  **Consume**: อ่านข้อมูลจาก Kafka Topic (`branch_xxx.public.xxx`)
2.  **Transform**: แปลงข้อมูล Debezium Payload
3.  **Insert**: ส่งคำสั่ง SQL `INSERT` ไปที่ ClickHouse โดยตรงผ่านสิทธิ์ของ `changsiam`

### 💡 ข้อดี
- ไม่ต้องใช้สิทธิ์ Admin หรือสิทธิ์ `KAFKA` ใน ClickHouse
- รันผ่านสิทธิ์ User `changsiam` ปกติได้เลย

---
*หมายเหตุ: ควรใช้วิธีนี้เป็นทางเลือกสุดท้าย หากวิธี Native Kafka Engine ไม่สามารถทำได้จริงๆ*
