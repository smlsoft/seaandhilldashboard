#!/usr/bin/env node

/**
 * ตรวจสอบว่าข้อมูลใน ClickHouse มาจากสาขาไหนบ้าง
 */

const http = require('http');

const CLICKHOUSE_HOST = 'http://103.13.30.32:9000';
const CLICKHOUSE_USER = 'changsiam';
const CLICKHOUSE_PASSWORD = 'n300sJzuR0ArXpbo';
const CLICKHOUSE_DB = 'datachangsiam';

async function executeQuery(query) {
    return new Promise((resolve, reject) => {
        const url = new URL(CLICKHOUSE_HOST);
        const options = {
            hostname: url.hostname,
            port: url.port || 8123,
            path: `/?database=${CLICKHOUSE_DB}&default_format=JSONCompact`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'X-ClickHouse-User': CLICKHOUSE_USER,
                'X-ClickHouse-Key': CLICKHOUSE_PASSWORD,
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
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

        req.on('error', reject);
        req.write(query);
        req.end();
    });
}

async function checkBranchData() {
    console.log('🔍 ตรวจสอบข้อมูลจากแต่ละสาขาใน ClickHouse\n');
    console.log('='.repeat(70));

    const tables = [
        'journal_transaction_detail',
        'payment_transaction',
        'purchase_transaction',
        'purchase_transaction_detail',
        'saleinvoice_transaction',
        'saleinvoice_transaction_detail',
        'stock_transaction'
    ];

    for (const table of tables) {
        console.log(`\n📊 ตาราง: ${table}`);

        try {
            // เช็คว่ามี column branch_code หรือไม่
            const structure = await executeQuery(`DESCRIBE TABLE ${CLICKHOUSE_DB}.${table} FORMAT JSONCompact`);
            const hasBranchCode = structure.data.some(row => row[0] === 'branch_code');

            if (hasBranchCode) {
                // นับข้อมูลแต่ละสาขา
                const branchData = await executeQuery(`
          SELECT 
            branch_code,
            branch_name,
            COUNT(*) as record_count
          FROM ${CLICKHOUSE_DB}.${table}
          GROUP BY branch_code, branch_name
          ORDER BY branch_code
          FORMAT JSONCompact
        `);

                if (branchData.data && branchData.data.length > 0) {
                    console.log('   Branches:');
                    let totalRecords = 0;
                    branchData.data.forEach((row) => {
                        const [branchCode, branchName, count] = row;
                        console.log(`      - ${branchCode} (${branchName}): ${count.toLocaleString()} records`);
                        totalRecords += count;
                    });
                    console.log(`   รวม: ${totalRecords.toLocaleString()} records จาก ${branchData.data.length} สาขา`);
                } else {
                    console.log('   ⚠️ ไม่มีข้อมูล');
                }
            } else {
                console.log('   ⚠️ ตารางนี้ไม่มี column branch_code');

                // นับข้อมูลทั้งหมด
                const count = await executeQuery(`
          SELECT COUNT(*) as total FROM ${CLICKHOUSE_DB}.${table} FORMAT JSONCompact
        `);
                if (count.data && count.data[0]) {
                    console.log(`   รวม: ${count.data[0][0].toLocaleString()} records (ไม่มีข้อมูลสาขา)`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📋 สรุป:\n');

    try {
        // รวมข้อมูลทุกตาราง (ยกเว้น stock_transaction ที่ไม่มี branch_code)
        const summary = await executeQuery(`
      SELECT 
        branch_code,
        branch_name,
        SUM(cnt) as total_records
      FROM (
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.journal_transaction_detail GROUP BY branch_code, branch_name
        UNION ALL
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.payment_transaction GROUP BY branch_code, branch_name
        UNION ALL
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.purchase_transaction GROUP BY branch_code, branch_name
        UNION ALL
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.purchase_transaction_detail GROUP BY branch_code, branch_name
        UNION ALL
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.saleinvoice_transaction GROUP BY branch_code, branch_name
        UNION ALL
        SELECT branch_code, branch_name, COUNT(*) as cnt FROM ${CLICKHOUSE_DB}.saleinvoice_transaction_detail GROUP BY branch_code, branch_name
      )
      GROUP BY branch_code, branch_name
      ORDER BY branch_code
      FORMAT JSONCompact
    `);

        if (summary.data && summary.data.length > 0) {
            console.log('   ข้อมูลทั้งหมดใน ClickHouse แยกตามสาขา:\n');
            summary.data.forEach((row) => {
                const [branchCode, branchName, count] = row;
                console.log(`      ✓ ${branchCode} (${branchName}): ${count.toLocaleString()} records รวมทุกตาราง`);
            });
            console.log(`\n   🎯 มีข้อมูลจาก ${summary.data.length} สาขา`);

            // ตรวจสอบว่าขาดสาขาไหน
            const foundBranches = summary.data.map(row => row[0]);
            const expectedBranches = ['001', '002', '003', '004', '005'];
            const missingBranches = expectedBranches.filter(b => !foundBranches.includes(b));

            if (missingBranches.length > 0) {
                console.log(`\n   ⚠️  สาขาที่ยังไม่มีข้อมูล: ${missingBranches.join(', ')}`);
            } else {
                console.log(`\n   ✅ มีข้อมูลครบทุกสาขา (001-005)`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error in summary: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
}

checkBranchData();
