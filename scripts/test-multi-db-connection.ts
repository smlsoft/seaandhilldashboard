/**
 * Multi-Database Connection Tester
 * ทดสอบการเชื่อมต่อกับฐานข้อมูลทั้งหมดที่กำหนดใน .env.local
 */

import {
    getAllDatabasesInfo,
    loadDatabaseConfigByKey,
    getDefaultDatabase
} from '../src/lib/db/multi-db-config';
import type { PostgreSQLConfig } from '../src/lib/db/db-config';

async function testConnections() {
    console.log('🔍 Testing Multi-Database Connections...\n');

    try {
        // 1. แสดง Default Database
        const defaultDb = getDefaultDatabase();
        console.log(`📌 Default Database: ${defaultDb}\n`);

        // 2. แสดงฐานข้อมูลทั้งหมดที่พบ
        const databases = getAllDatabasesInfo();

        if (databases.length === 0) {
            console.log('⚠️  ไม่พบการ config database ใน .env.local');
            console.log('\n💡 ตัวอย่างการ config:');
            console.log('   DB1_TYPE=CLICKHOUSE');
            console.log('   DB1_CLICKHOUSE_HOST=http://103.13.30.32:8123');
            console.log('   DB1_CLICKHOUSE_USER=changsiam');
            console.log('   ...');
            return;
        }

        console.log(`✅ พบ ${databases.length} ฐานข้อมูล:\n`);

        // 3. แสดงรายละเอียดแต่ละฐาน
        databases.forEach((db, index) => {
            console.log(`${index + 1}. ${db.name} (${db.key})`);
            console.log(`   Type: ${db.type}`);

            if (db.type === 'CLICKHOUSE') {
                console.log(`   Host: ${db.config.host}`);
                console.log(`   Database: ${db.config.database}`);
                console.log(`   User: ${db.config.username}`);
            } else if (db.type === 'POSTGRESQL') {
                const pgConfig = db.config as PostgreSQLConfig;
                console.log(`   Host: ${pgConfig.host}:${pgConfig.port}`);
                console.log(`   Database: ${pgConfig.database}`);
                console.log(`   User: ${pgConfig.username}`);
                console.log(`   SSL: ${pgConfig.ssl ? 'Yes' : 'No'}`);
            }
            console.log('');
        });

        // 4. แสดงสรุป
        const clickhouseCount = databases.filter(db => db.type === 'CLICKHOUSE').length;
        const postgresCount = databases.filter(db => db.type === 'POSTGRESQL').length;

        console.log('📊 สรุป:');
        console.log(`   - ClickHouse: ${clickhouseCount} ฐาน`);
        console.log(`   - PostgreSQL: ${postgresCount} ฐาน`);
        console.log(`   - รวมทั้งหมด: ${databases.length} ฐาน`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    }
}

// รันทันที
testConnections();
