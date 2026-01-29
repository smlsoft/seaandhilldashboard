import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { getClickHouse } from '@/lib/clickhouse';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Tool definitions for Gemini - Database tools + Web Search
const tools = [
  {
    functionDeclarations: [
      {
        name: 'listTables',
        description: 'List all tables in the ClickHouse database',
        parameters: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'describeTable',
        description: 'Get the schema/structure of a specific table with field descriptions',
        parameters: {
          type: 'object' as const,
          properties: {
            table_name: {
              type: 'string',
              description: 'The name of the table to describe',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'executeQuery',
        description: 'Execute a SELECT query on ClickHouse',
        parameters: {
          type: 'object' as const,
          properties: {
            sql: {
              type: 'string',
              description: 'The SELECT SQL query to execute',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'webSearch',
        description: 'Search the web for external information to analyze causes, trends, or context. Use this when you need information outside the database such as economic news, market trends, holidays, or events that might explain data patterns.',
        parameters: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'The search query in Thai or English',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
] as Tool[];

// Web search function using Serper API (primary) or SerpApi (fallback)
async function performWebSearch(query: string): Promise<{
  results: Array<{ title: string; url: string; snippet: string }>;
  message: string;
}> {
  console.log('[Tool] webSearch called:', query);

  // Primary: Use Serper API if configured (faster, more free quota)
  const serperApiKey = process.env.SERPER_API_KEY;
  if (serperApiKey) {
    try {
      console.log('[webSearch] Using Serper API');
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: 'th',
          hl: 'th',
          num: 5,
        }),
      });
      const data = await response.json();

      if (data.organic && data.organic.length > 0) {
        const results = data.organic.map((item: { title: string; link: string; snippet?: string }) => ({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
        }));

        console.log(`[webSearch] Serper found ${results.length} results`);
        return {
          results,
          message: `Found ${results.length} search results for "${query}"`,
        };
      }
    } catch (error) {
      console.error('[webSearch] Serper API error:', error);
    }
  }

  // Fallback: Use SerpApi if configured
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (serpApiKey) {
    try {
      console.log('[webSearch] Using SerpApi (fallback)');
      const params = new URLSearchParams({
        api_key: serpApiKey,
        engine: 'google',
        q: query,
        gl: 'th',
        hl: 'th',
        num: '5',
      });
      const response = await fetch(`https://serpapi.com/search?${params}`);
      const data = await response.json();

      if (data.organic_results && data.organic_results.length > 0) {
        const results = data.organic_results.map((item: { title: string; link: string; snippet?: string }) => ({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
        }));

        console.log(`[webSearch] SerpApi found ${results.length} results`);
        return {
          results,
          message: `Found ${results.length} search results for "${query}"`,
        };
      }
    } catch (error) {
      console.error('[webSearch] SerpApi error:', error);
    }
  }

  // Final fallback: Return a message that search is not configured
  return {
    results: [],
    message: `Web search is not configured. Please set SERPER_API_KEY or SERPAPI_API_KEY in environment variables. Query was: "${query}"`,
  };
}

// Tool execution functions
async function executeTool(name: string, args: Record<string, unknown>) {
  const clickhouse = await getClickHouse();

  switch (name) {
    case 'listTables': {
      console.log('[Tool] listTables called');
      const result = await clickhouse.query({
        query: 'SHOW TABLES',
        format: 'JSONEachRow',
      });
      const tables = (await result.json()) as Array<{ name: string }>;
      return {
        tables: tables.map((row) => row.name),
        message: `Found ${tables.length} tables`,
      };
    }

    case 'describeTable': {
      const tableName = args.table_name as string;
      console.log('[Tool] describeTable called:', tableName);

      const result = await clickhouse.query({
        query: `DESCRIBE TABLE ${tableName}`,
        format: 'JSONEachRow',
      });
      const schema = await result.json();

      return {
        table: tableName,
        columns: schema,
        message: `Table "${tableName}" has ${(schema as unknown[]).length} columns`,
      };
    }

    case 'executeQuery': {
      console.log('[Tool] executeQuery called');
      const sql = (args.sql as string).trim().toUpperCase();
      if (!sql.startsWith('SELECT')) {
        return { error: 'Only SELECT queries allowed' };
      }

      try {
        const result = await clickhouse.query({
          query: args.sql as string,
          format: 'JSONEachRow',
        });
        const data = await result.json();
        return {
          query: args.sql as string,
          rowCount: (data as unknown[]).length,
          data: (data as unknown[]).slice(0, 100),
          message: `Query returned ${(data as unknown[]).length} rows`,
        };
      } catch (queryError: unknown) {
        const errorMsg =
          queryError instanceof Error ? queryError.message : 'Unknown query error';
        console.error('[Tool] executeQuery error:', errorMsg);
        return {
          error: `SQL Error: ${errorMsg}`,
          failedQuery: args.sql as string,
          suggestion:
            'Please check table/column names using listTables and describeTable, then try again with correct names.',
        };
      }
    }

    case 'webSearch': {
      const query = args.query as string;
      return await performWebSearch(query);
    }

    default:
      return { error: 'Unknown tool' };
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('[Chat Direct API] Received:', messages.length, 'messages');

    // Convert messages to Gemini format
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = `คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลสำหรับระบบฐานข้อมูล ClickHouse สามารถทำงานกับ schema ใดก็ได้

ฐานข้อมูล: ClickHouse SQL
- ใช้ ClickHouse SQL dialect (ไม่ใช่ MySQL/PostgreSQL)
- **ฟังก์ชัน Case-Sensitive**: ต้องใช้ตัวพิมพ์ให้ถูกต้อง!
  * ฟังก์ชัน JSON: **JSONExtractArrayRaw**, **JSONExtractString**, **JSONHas** (ต้องเป็นตัวใหญ่)
  * ฟังก์ชันอื่นๆ: sum(), count(), avg(), toYear(), toDate(), dateDiff() (ตัวเล็ก/camelCase)
- ฟังก์ชันวันที่: toYear(), toQuarter(), toMonth(), toDate(), now(), today(), dateDiff()
- ฟังก์ชัน aggregate: sum(), count(), avg(), min(), max(), groupArray(), groupUniqArray()
- ฟังก์ชันสตริง: concat(), toString(), lower(), upper()
- ฟังก์ชันตัวเลข: round(value, decimal)
- **ฟังก์ชัน JSON** (CRITICAL - ต้องใช้ตัวใหญ่):
  * **JSONExtractString(json_string, 'key')** - ดึงค่า string จาก JSON object (ห้ามใช้ jsonextractstring)
  * **JSONExtractArrayRaw(json_string)** - ดึง array เป็น raw (ห้ามใช้ jsonextractarrayraw)
  * **JSONHas(json_string, 'key')** - เช็คว่ามี key หรือไม่
  * ตัวอย่างที่ถูก: ARRAY JOIN JSONExtractArrayRaw(billing_no_array) AS payment_obj
  * จากนั้น: JSONExtractString(payment_obj, 'doc_no')
- WHERE clause: ใช้ != สำหรับ not equal
- ARRAY JOIN: ใช้สำหรับ expand array column
- **การจัดรูปแบบตัวเลข**: ไม่ต้องทำใน SQL แค่ SELECT ค่าออกมา จะจัดรูปแบบใน response

วิธีการทำงาน (CRITICAL - ต้องทำตามลำดับ ห้ามข้าม):
1. **ค้นหาตาราง (บังคับ)**: ต้องใช้ listTables ดูตารางที่มีในระบบก่อนเสมอ - ห้ามสมมติชื่อตาราง
2. **ศึกษาโครงสร้าง (บังคับ)**: ต้องใช้ describeTable ดู column names ก่อนเขียน query - ห้ามสมมติชื่อ column
3. **ค้นหาค่าที่เป็นไปได้**: Query ดู DISTINCT values ของ column ที่สำคัญ
   * ตัวอย่าง: SELECT DISTINCT status FROM table_name LIMIT 10
   * ทำก่อนเขียน WHERE clause เสมอ
4. **เขียน Query**: ใช้ชื่อ tables, columns และ values ที่ได้จริงจาก step 1-3 เท่านั้น
5. **วิเคราะห์**: สรุปผลเป็นภาษาไทยแบบกระชับ

กฎสำคัญ (ห้าม hardcode - ถ้าฝ่าฝืนจะเกิด error):
- **ห้ามสมมติชื่อตาราง** เช่น sales, products, orders - ต้อง listTables ก่อนทุกครั้ง
- **ห้ามสมมติชื่อ column** เช่น sale_date, qty, amount - ต้อง describeTable ก่อนทุกครั้ง
- **ห้ามข้ามขั้นตอน** - ถ้าไม่รู้ชื่อตารางหรือ column จริง ห้ามเขียน executeQuery
- ห้ามเดา - ถ้าไม่แน่ใจต้อง describeTable หรือ query DISTINCT
- ห้ามใช้ INSERT, UPDATE, DELETE, DROP
- ห้ามแสดงข้อมูลดิบเกิน 5 รายการ
- ใช้เฉพาะ SELECT query เท่านั้น

**กฎ Retry เมื่อเกิด SQL Error (สำคัญมาก)**:
- ถ้า executeQuery return error ให้ทำตามขั้นตอนนี้:
  1. อ่าน error message ให้เข้าใจสาเหตุ
  2. กลับไปใช้ listTables หรือ describeTable ตรวจสอบชื่อที่ถูกต้อง
  3. แก้ไข SQL แล้วลองใหม่
- **ห้ามยอมแพ้** - ต้องลองแก้ไขและ retry จนกว่าจะสำเร็จ (สูงสุด 3 ครั้ง)
- ถ้าลอง 3 ครั้งแล้วยังไม่สำเร็จ ให้แจ้งผู้ใช้ว่าพบปัญหาอะไร

**กฎ SQL Alias (สำคัญมาก - ClickHouse ไม่รองรับภาษาไทย)**:
- **ห้ามใช้ภาษาไทยใน SQL** ทั้งหมด รวมถึง column alias
- ใช้ชื่อ alias เป็น **ภาษาอังกฤษเท่านั้น** เช่น:
  * ✅ ถูก: SELECT toYear(date) AS year, sum(amount) AS total_sales
  * ❌ ผิด: SELECT toYear(date) AS ปี, sum(amount) AS ยอดขาย
- ตอบผู้ใช้เป็นภาษาไทยได้ แต่ SQL ต้องเป็นภาษาอังกฤษ 100%

ขั้นตอนตัวอย่าง:
1. User ถาม: "สินค้าขายดี"
2. listTables → เจอตาราง sales, products
3. describeTable(sales) → เจอ columns: item_name, qty, status
4. SELECT DISTINCT status FROM sales LIMIT 5 → เจอ 'Active', 'Cancelled'
5. SELECT item_name, sum(qty) FROM sales WHERE status = 'Active' GROUP BY item_name

รูปแบบการตอบ (สำหรับ Chatbot - ต้องกระชับมาก):
- ตอบสั้น กระชับ ได้ใจความ (1-2 ประโยคเปิด)
- ใช้ emoji น้อยๆ (📊 💰 ⚠️ ✅)
- **ตารางกระชับสุด**:
  * **แสดงแค่ Top 5** (ห้ามเกิน!)
  * **หัวตารางสั้นมาก** (ใช้ชื่อย่อ เช่น "ลูกค้า", "ยอด", "จำนวน")
  * **ไม่เกิน 3-4 คอลัมน์** (รวมข้อมูลที่เกี่ยวข้องเป็นคอลัมน์เดียว)
- แสดงตัวเลขด้วย comma (1,234)
- **สรุป 1-2 ประโยคสั้นๆ** (ตรงประเด็น)
- **ข้อเสนอแนะสั้น 1 ข้อ** (ถ้าจำเป็น)
- ห้ามเขียนยาว ห้ามลงรายละเอียดมาก

**การใช้ Web Search (สำหรับวิเคราะห์เชิงลึก)**:
- ใช้ webSearch tool เมื่อต้องการข้อมูลภายนอกเพื่อ **วิเคราะห์สาเหตุ** หรือ **อธิบายบริบท**
- ตัวอย่างสถานการณ์ที่ควรใช้:
  * ยอดขายตกในเดือนใดเดือนหนึ่ง → ค้นหาว่ามีเหตุการณ์อะไรในช่วงนั้น (เศรษฐกิจ, วันหยุด, ภัยธรรมชาติ)
  * เปรียบเทียบกับแนวโน้มตลาด → ค้นหาข้อมูลอุตสาหกรรม
  * ผู้ใช้ถามว่า "ทำไม" หรือ "สาเหตุ" → ค้นหาข้อมูลประกอบ
- **ขั้นตอน**: Query ข้อมูลจาก database ก่อน → วิเคราะห์ → ถ้าต้องการบริบทเพิ่ม → webSearch
- **รูปแบบการแสดงผล**: แยกส่วน "ข้อมูลจากระบบ" และ "ข้อมูลจากการค้นหา" ให้ชัดเจน

**การแสดงแหล่งที่มา (บังคับเมื่อใช้ webSearch)**:
- เมื่อใช้ข้อมูลจาก webSearch ต้องแสดง **แหล่งอ้างอิง** ทุกครั้ง
- รูปแบบการแสดงแหล่งที่มา:
  * ใช้หัวข้อ "📎 แหล่งอ้างอิง:" หรือ "🔗 Sources:"
  * แสดงเป็น link แบบ markdown: [ชื่อบทความ](URL)
  * ใช้ URL จริงที่ได้จาก webSearch results
- ตัวอย่าง:
  📎 **แหล่งอ้างอิง:**
  - [ชื่อบทความ 1](https://actual-url-from-search.com)
  - [ชื่อบทความ 2](https://another-url.com)

**การแสดงกราฟ (Chart Visualization)**:
- **เมื่อไหร่ควรแสดงกราฟ** (AI ต้องตัดสินใจเอง):
  * ข้อมูลรายเดือน/รายปี/time series → ควรมีกราฟ
  * เปรียบเทียบยอดขาย/แนวโน้ม → ควรมีกราฟ
  * สัดส่วน/เปอร์เซ็นต์ → ควรมี pie chart
  * คำถามที่ถามถึง "แนวโน้ม", "เปรียบเทียบ", "รายเดือน", "กราฟ" → ต้องมีกราฟ
- **เมื่อไหร่ไม่ต้องมีกราฟ**:
  * ข้อมูลแค่ 1-2 ค่า (เช่น ยอดขายวันนี้)
  * รายการ Top 5 ที่ไม่มี time dimension
  * คำถามทั่วไปที่ไม่ต้องการ visualization

- **รูปแบบ Chart Tag** (ใส่ก่อนตาราง):
\`\`\`
<!--chart
type: bar|line|pie
title: ชื่อกราฟ
labels: ม.ค.,ก.พ.,มี.ค.,...
data: 100,200,150,...
-->
\`\`\`

- **ประเภทกราฟ**:
  * \`bar\` - เปรียบเทียบค่าแต่ละหมวด (ยอดขายรายเดือน, Top 5)
  * \`line\` - แสดงแนวโน้ม/trend (ยอดขายตลอดปี)
  * \`pie\` - แสดงสัดส่วน (% ของแต่ละหมวด)

- **กฎสำคัญ**:
  * labels และ data ต้องมีจำนวนเท่ากัน
  * ใช้ comma คั่น ห้ามมี space หลัง comma
  * ตัวเลขใน data ห้ามมี comma (ใช้ 1000 ไม่ใช่ 1,000)
  * title ใช้ภาษาไทยได้

- **ตัวอย่าง**:
\`\`\`
<!--chart
type: bar
title: ยอดขายรายเดือน 2024
labels: ม.ค.,ก.พ.,มี.ค.,เม.ย.,พ.ค.,มิ.ย.
data: 197.34,130.21,283.54,97.25,193.01,207.62
-->

| เดือน | ยอดขาย (ตัน) |
| :---- | :---------- |
| ม.ค. | 197.34 |
...
\`\`\``;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    console.log('[DEBUG] Using model:', modelName);

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      tools,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const MAX_ITERATIONS = 120;
        let iterations = 0;

        console.log('[DEBUG] Starting chat with history:', geminiMessages.length - 1, 'messages');

        const chat = model.startChat({
          history: geminiMessages.slice(0, -1), // All except last message
        });

        // Send last message
        const lastMessage = geminiMessages[geminiMessages.length - 1];
        console.log('[DEBUG] Sending message:', lastMessage.parts[0].text.substring(0, 100) + '...');

        let result = await chat.sendMessage(lastMessage.parts[0].text);
        console.log('[DEBUG] Initial response received');

        while (iterations < MAX_ITERATIONS) {
          iterations++;
          console.log('[DEBUG] Iteration:', iterations);

          const response = result.response;
          const functionCalls = response.functionCalls();

          console.log('[DEBUG] Function calls:', functionCalls ? functionCalls.length : 0);

          // If no function calls, stream the text response
          if (!functionCalls || functionCalls.length === 0) {
            const text = response.text();
            console.log('[DEBUG] Final text response length:', text ? text.length : 0);
            console.log('[DEBUG] Final text preview:', text ? text.substring(0, 200) + '...' : 'EMPTY');
            if (text) {
              controller.enqueue(encoder.encode(text));
            } else {
              console.log('[DEBUG] WARNING: Empty response from model');
              // Try to get more info about the response
              console.log('[DEBUG] Response candidates:', JSON.stringify(response.candidates, null, 2));
            }
            break;
          }

          // Execute function calls
          const functionResponses = [];
          for (const call of functionCalls) {
            console.log('[Tool Call]:', call.name, call.args);
            const toolResult = await executeTool(call.name, call.args as Record<string, unknown>);
            console.log('[DEBUG] Tool result for', call.name, ':', JSON.stringify(toolResult).substring(0, 200) + '...');
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: toolResult,
              },
            });
          }

          // Send function results back
          console.log('[DEBUG] Sending function responses back to model...');
          result = await chat.sendMessage(functionResponses);
          console.log('[DEBUG] Received response after function call');
        }

        // Send final response if loop ended due to max iterations
        if (iterations >= MAX_ITERATIONS) {
          console.log('[DEBUG] WARNING: Max iterations reached!');
          const text = result.response.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }

        console.log('[DEBUG] Stream completed');
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: unknown) {
    console.error('[Chat Direct API Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
