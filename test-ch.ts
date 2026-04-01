import { clickhouse } from './src/lib/clickhouse';

async function run() {
    try {
        const query = `
            SELECT DISTINCT branch_sync
            FROM saleinvoice_transaction
            WHERE branch_sync != ''
            ORDER BY branch_sync
        `;
        const result = await clickhouse.query({ query, format: 'JSONEachRow' });
        const data = await result.json();
        console.log("Success:", data);
    } catch(err) {
        console.error("Error:", err);
    }
}
run();
