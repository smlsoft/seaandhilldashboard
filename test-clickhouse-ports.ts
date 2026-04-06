import { createClient } from '@clickhouse/client';

async function testPort(port: number) {
    const client = createClient({
        url: `http://103.13.30.32:${port}`,
        username: 'changsiam',
        password: 'n300sJzuR0ArXpbo',
        database: 'datachangsiam',
        request_timeout: 5000,
    });

    try {
        const result = await client.query({ query: 'SELECT 1 as val', format: 'JSONEachRow' });
        const data = await result.json();
        console.log(`Port ${port} success:`, data);
        return true;
    } catch (error) {
        console.error(`Port ${port} failed:`, error instanceof Error ? error.message : error);
        return false;
    }
}

async function run() {
    console.log("Testing port 8123...");
    await testPort(8123);
    console.log("Testing port 9000...");
    await testPort(9000);
}
run();
