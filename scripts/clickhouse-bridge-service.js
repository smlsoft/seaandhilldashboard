/**
 * CLICKHOUSE BRIDGE SERVICE (Alternative CDC Pipeline)
 * ---------------------------------------------------
 * This script acts as a middleware between Kafka and ClickHouse.
 * It consumes Debezium CDC events from Kafka and inserts them into ClickHouse
 * using standard INSERT statements, bypassing the need for KAFKA engine permissions.
 */

const { Kafka } = require('kafkajs');
const https = require('https');
const http = require('http');

// CONFIGURATION
const KAFKA_BROKERS = ['localhost:9092'];
const CLICKHOUSE_HOST = 'http://103.13.30.32:8123';
const CLICKHOUSE_USER = 'changsiam';
const CLICKHOUSE_PASSWORD = 'n300sJzuR0ArXpbo';
const CLICKHOUSE_DB = 'datachangsiam';

// Topics to subscribe to (Pattern: branch_xxx.public.tablename)
// We use a regex pattern to match all branches
const TOPIC_REGEXP = /^branch_(\d+)\.public\.(.*)$/;

const kafka = new Kafka({
    clientId: 'clickhouse-bridge',
    brokers: KAFKA_BROKERS
});

const consumer = kafka.consumer({ groupId: 'clickhouse-bridge-group' });

/**
 * Execute ClickHouse query (Insert or Command)
 */
async function executeClickHouse(query) {
    return new Promise((resolve, reject) => {
        const url = new URL(CLICKHOUSE_HOST);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 8123),
            path: `/?database=${CLICKHOUSE_DB}`,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'X-ClickHouse-User': CLICKHOUSE_USER,
                'X-ClickHouse-Key': CLICKHOUSE_PASSWORD,
            },
        };

        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(data);
                else reject(new Error(`CH Error ${res.statusCode}: ${data}`));
            });
        });

        req.on('error', reject);
        req.write(query);
        req.end();
    });
}

/**
 * Process a message from Kafka
 */
async function processMessage(topic, message) {
    try {
        const match = topic.match(TOPIC_REGEXP);
        if (!match) return;

        const branchCode = match[1];
        const tableName = match[2];
        const payload = JSON.parse(message.value.toString());

        // We only care about Create (c) and Update (u) operations
        if (!payload.payload || (payload.payload.op !== 'c' && payload.payload.op !== 'u')) return;

        const data = payload.payload.after;
        if (!data) return;

        // Construct INSERT query
        const columns = Object.keys(data).join(', ');
        const values = Object.values(data).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
        }).join(', ');

        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
        
        await executeClickHouse(query);
        console.log(`✅ Synced ${tableName} from branch ${branchCode}`);

    } catch (error) {
        console.error(`❌ Process Error (${topic}):`, error.message);
    }
}

/**
 * START THE BRIDGE
 */
async function start() {
    console.log('🚀 Starting ClickHouse Bridge Service...');
    
    await consumer.connect();
    console.log('🔗 Connected to Kafka');

    // Subscribe to all topics matching our branches
    // Note: This requires the Kafka broker to allow metadata fetches for all topics
    await consumer.subscribe({ topics: [/branch_.*\.public\..*/], fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            await processMessage(topic, message);
        },
    });
}

start().catch(err => {
    console.error('🔥 Fatal Error:', err.message);
    process.exit(1);
});
