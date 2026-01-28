import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    console.log('[Test Chat API] Received:', messages);

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: 'คุณเป็น AI ผู้ช่วยที่เป็นมิตร ตอบเป็นภาษาไทยทุกครั้ง',
    });

    console.log('[Test Chat API] Streaming response...');
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[Test Chat API Error]:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
