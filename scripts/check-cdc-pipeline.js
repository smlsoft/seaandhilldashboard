#!/usr/bin/env node

/**
 * ClickHouse CDC Pipeline Diagnostic Tool
 * ตรวจสอบว่าใช้ท่อ (pipeline) แบบไหนในการส่งข้อมูลจาก PostgreSQL → ClickHouse
 */

const https = require('https');
const http = require('http');

// ดึง config จาก .env.local
const CLICKHOUSE_HOST = 'http://103.13.30.32:9000';
const CLICKHOUSE_USER = 'changsiam';
const CLICKHOUSE_PASSWORD = 'n300sJzuR0ArXpbo';
const CLICKHOUSE_DB = 'datachangsiam';

/**
 * Execute ClickHouse query
 */
async function executeQuery(query) {
    return new Promise((resolve, reject) => {
        const url = new URL(CLICKHOUSE_HOST);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 8123),
            path: `/?database=${CLICKHOUSE_DB}&default_format=JSONCompact`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'X-ClickHouse-User': CLICKHOUSE_USER,
                'X-ClickHouse-Key': CLICKHOUSE_PASSWORD,
            },
        };

        const req = client.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ data: [[data]] });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(query);
        req.end();
    });
}

async function diagnose() {
    console.log('🔍 ตรวจสอบ CDC Pipeline จาก PostgreSQL → ClickHouse\n');
    console.log(`📊 ClickHouse: ${CLICKHOUSE_HOST}`);
    console.log(`📁 Database: ${CLICKHOUSE_DB}\n`);
    console.log('='.repeat(60));

    try {
        // 1. ตรวจสอบ Tables ทั้งหมด
        console.log('\n1️⃣ ตรวจสอบ Tables ทั้งหมดใน database...\n');
        const tables = await executeQuery(`SHOW TABLES FROM ${CLICKHOUSE_DB}`);

        if (tables.data && tables.data.length > 0) {
            console.log(`   พบ ${tables.data.length} ตาราง:`);
            tables.data.forEach((row, idx) => {
                console.log(`   ${idx + 1}. ${row[0]}`);
            });
        } else {
            console.log('   ⚠️ ไม่พบตารางใด ๆ');
        }

        // 2. ตรวจสอบ Kafka Engine Tables
        console.log('\n2️⃣ ตรวจสอบ Kafka Engine Tables...\n');
        const kafkaTables = await executeQuery(`
      SELECT name, engine, engine_full
      FROM system.tables
      WHERE database = '${CLICKHOUSE_DB}' 
        AND engine LIKE '%Kafka%'
      FORMAT JSONCompact
    `);

        if (kafkaTables.data && kafkaTables.data.length > 0) {
            console.log('   ✅ พบ Kafka Tables (CDC แบบ Real-time):');
            kafkaTables.data.forEach((row) => {
                console.log(`      - ${row[0]} (${row[1]})`);
            });
        } else {
            console.log('   ❌ ไม่พบ Kafka Tables');
        }

        // 3. ตรวจสอบ Materialized Views
        console.log('\n3️⃣ ตรวจสอบ Materialized Views (ที่อ่านจาก Kafka)...\n');
        const mvs = await executeQuery(`
      SELECT name, engine, as_select
      FROM system.tables
      WHERE database = '${CLICKHOUSE_DB}' 
        AND engine = 'MaterializedView'
      FORMAT JSONCompact
    `);

        if (mvs.data && mvs.data.length > 0) {
            console.log('   ✅ พบ Materialized Views:');
            mvs.data.forEach((row) => {
                console.log(`      - ${row[0]}`);
            });
        } else {
            console.log('   ❌ ไม่พบ Materialized Views');
        }

        // 4. ตรวจสอบ PostgreSQL Engine Tables
        console.log('\n4️⃣ ตรวจสอบ PostgreSQL Engine Tables (Direct Query)...\n');
        const pgTables = await executeQuery(`
      SELECT name, engine, engine_full
      FROM system.tables
      WHERE database = '${CLICKHOUSE_DB}' 
        AND (engine LIKE '%PostgreSQL%' OR engine LIKE '%JDBC%')
      FORMAT JSONCompact
    `);

        if (pgTables.data && pgTables.data.length > 0) {
            console.log('   ✅ พบ PostgreSQL Tables (Direct Connection):');
            pgTables.data.forEach((row) => {
                console.log(`      - ${row[0]} (${row[1]})`);
            });
        } else {
            console.log('   ❌ ไม่พบ PostgreSQL Engine Tables');
        }

        // 5. ดูตัวอย่างข้อมูล
        if (tables.data && tables.data.length > 0) {
            const firstTable = tables.data[0][0];
            console.log(`\n5️⃣ ดูโครงสร้างตาราง (${firstTable})...\n`);

            const structure = await executeQuery(`DESCRIBE TABLE ${CLICKHOUSE_DB}.${firstTable} FORMAT JSONCompact`);
            if (structure.data && structure.data.length > 0) {
                console.log('   Columns:');
                structure.data.forEach((row) => {
                    console.log(`      - ${row[0]} (${row[1]})`);
                });
            }

            console.log(`\n6️⃣ นับจำนวนข้อมูลใน ${firstTable}...\n`);
            const count = await executeQuery(`SELECT count(*) as total FROM ${CLICKHOUSE_DB}.${firstTable} FORMAT JSONCompact`);
            if (count.data && count.data.length > 0) {
                console.log(`   จำนวนข้อมูล: ${count.data[0][0].toLocaleString()} rows`);
            }
        }

        // สรุปผล
        console.log('\n' + '='.repeat(60));
        console.log('\n📋 สรุปผล:\n');

        const hasKafka = kafkaTables.data && kafkaTables.data.length > 0;
        const hasMV = mvs.data && mvs.data.length > 0;
        const hasPG = pgTables.data && pgTables.data.length > 0;

        if (hasKafka && hasMV) {
            console.log('   ✅ ใช้ CDC แบบ Real-time (Kafka + Debezium)');
            console.log('   📡 ข้อมูลถูกส่งผ่าน: PostgreSQL → Debezium → Kafka → ClickHouse');
        } else if (hasPG) {
            console.log('   ✅ ใช้ PostgreSQL Engine (Direct Query)');
            console.log('   📡 ClickHouse query ข้อมูลจาก PostgreSQL โดยตรง');
        } else {
            console.log('   ❓ ไม่พบ pipeline ที่ชัดเจน');
            console.log('   💡 ข้อมูลอาจถูก import ด้วยวิธีอื่น (batch import, manual insert)');
        }

    } catch (error) {
        console.error('\n❌ เกิดข้อผิดพลาด:', error.message);
        console.log('\n💡 กรุณาตรวจสอบ:');
        console.log('   1. ClickHouse เปิดอยู่และเข้าถึงได้');
        console.log('   2. Credentials ใน script นี้ถูกต้อง');
        console.log('   3. ไม่มี VPN/Firewall ที่บล็อก connection');
    }
}

// Run
diagnose();
