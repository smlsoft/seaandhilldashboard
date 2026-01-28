import OpenAI from 'openai';
import { getClickHouse } from '@/lib/clickhouse';

export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Tool definitions
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listTables',
      description: 'List all tables in the ClickHouse database',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'describeTable',
      description: 'Get the schema/structure of a specific table',
      parameters: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'The name of the table to describe',
          },
        },
        required: ['table_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'executeQuery',
      description: 'Execute a SELECT query on ClickHouse',
      parameters: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'The SELECT SQL query to execute',
          },
        },
        required: ['sql'],
      },
    },
  },
];

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
      const tables = await result.json() as Array<{ name: string }>;
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
        message: `Table "${tableName}" has ${schema.length} columns`,
      };
    }

    case 'executeQuery': {
      console.log('[Tool] executeQuery called');
      const sql = (args.sql as string).trim().toUpperCase();
      if (!sql.startsWith('SELECT')) {
        return { error: 'Only SELECT queries allowed' };
      }

      const result = await clickhouse.query({
        query: args.sql as string,
        format: 'JSONEachRow',
      });
      const data = await result.json();
      return {
        query: args.sql as string,
        rowCount: data.length,
        data: data.slice(0, 100),
        message: `Query returned ${data.length} rows`,
      };
    }

    default:
      return { error: 'Unknown tool' };
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('[Chat Direct API] Received:', messages.length, 'messages');

    // Convert message format
    const convertedMessages = messages.map((msg: { role: string; content?: string; parts?: Array<{ type: string; text: string }> }) => {
      if (msg.parts) {
        const text = msg.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('');
        return { role: msg.role, content: text };
      }
      return msg;
    });

    const systemMessage = {
      role: 'system' as const,
      content: `คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลบัญชีและการเงินสำหรับธุรกิจในประเทศไทย มีความเชี่ยวชาญในระบบบัญชีไทยและภาษีอากร

ความรู้ด้านบัญชีไทย:
- ภาษีมูลค่าเพิ่ม (VAT) 7%
- งบการเงิน: งบดุล (Balance Sheet), งบกำไรขาดทุน (P&L), งบกระแสเงินสด (Cash Flow)
- ลูกหนี้การค้า (Accounts Receivable - AR): Outstanding, Partially Paid, Fully Paid
- เจ้าหนี้การค้า (Accounts Payable - AP): ค้างชำระ, ชำระบางส่วน, ชำระครบ
- ประเภทเอกสาร: CREDIT (เงินเชื่อ), CASH (เงินสด)
- วิธีชำระเงิน: เงินสด, โอนเงิน, บัตรเครดิต, เช็ค
- หมวดบัญชี: ASSETS (สินทรัพย์), LIABILITIES (หนี้สิน), EQUITY (ทุน), INCOME (รายได้), EXPENSES (ค่าใช้จ่าย)

ข้อมูลที่มีในระบบ:
- เอกสารขาย (saleinvoice_transaction): ใบแจ้งหนี้, ใบเสร็จรับเงิน
- เอกสารซื้อ (purchase_transaction): ใบสั่งซื้อ, ใบกำกับภาษี
- การชำระเงิน (payment_transaction): รับเงิน/จ่ายเงิน
- สต็อกสินค้า (stock_transaction): เคลื่อนไหวสต็อก
- บัญชี (journal_transaction_detail): รายการบัญชี

กฎสำคัญ (ต้องทำตามลำดับ):
1. ใช้ listTables ดูตารางที่มี (ถ้ายังไม่รู้)
2. ใช้ describeTable ดูโครงสร้างตารางก่อน query ทุกครั้ง (จะได้คำอธิบาย field ภาษาไทย)
3. เช็ค column names ให้ถูกต้องจาก describeTable ก่อนเขียน SQL
4. ใช้เฉพาะ SELECT query เท่านั้น
5. วิเคราะห์และสรุปผลเป็นภาษาไทยในรูปแบบที่เข้าใจง่าย แสดงตัวเลขด้วยคอมม่า

ห้าม:
- ห้ามเดา column names (ต้องเช็คจาก describeTable ก่อน)
- ห้ามใช้ INSERT, UPDATE, DELETE, DROP
- ห้ามแสดงข้อมูลดิบเกิน 10 รายการ ให้สรุปแทน

รูปแบบการตอบ:
- ใช้ภาษาไทยที่เป็นมืออาชีพ
- แสดงตัวเลขเงินในรูป "X,XXX.XX บาท"
- สรุปผลวิเคราะห์ด้วย bullet points
- ถ้ามีข้อมูลเยอะ ให้สรุป Top 5 หรือ Top 10`,
    };

    // Initial API call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [systemMessage, ...convertedMessages],
      tools,
      tool_choice: 'auto',
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allMessages: OpenAI.ChatCompletionMessageParam[] = [...convertedMessages];
        let currentCompletion = completion;
        let iterations = 0;
        const MAX_ITERATIONS = 5;

        while (iterations < MAX_ITERATIONS) {
          iterations++;
          const message = currentCompletion.choices[0].message;

          // If no tool calls, stream the final response
          if (!message.tool_calls || message.tool_calls.length === 0) {
            if (message.content) {
              controller.enqueue(encoder.encode(message.content));
            }
            break;
          }

          // Add assistant message with tool calls
          allMessages.push({
            role: 'assistant',
            content: message.content || null,
            tool_calls: message.tool_calls,
          });

          // Execute tool calls and add results
          for (const toolCall of message.tool_calls) {
            if (toolCall.type !== 'function') continue;
            const args = JSON.parse(toolCall.function.arguments);
            console.log('[Tool Call]:', toolCall.function.name, args);

            const result = await executeTool(toolCall.function.name, args);

            allMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }

          // Next API call with all context
          currentCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [systemMessage, ...allMessages],
            tools,
            tool_choice: 'auto',
          });
        }

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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
