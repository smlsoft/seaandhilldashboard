#!/usr/bin/env node

/**
 * Test script สำหรับทดสอบ Chat API
 * รัน: node test-chat-api.js
 */

async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  const API_URL = 'http://localhost:3001/api/chat';
  
  const testMessage = {
    messages: [
      {
        role: 'user',
        content: 'ขอดูรายชื่อตารางหน่อย',
      }
    ]
  };

  console.log('📤 Sending request to:', API_URL);
  console.log('📝 Message:', JSON.stringify(testMessage, null, 2));
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    console.log('📦 Content-Type:', contentType);

    if (contentType?.includes('application/json')) {
      const json = await response.json();
      console.log('📄 JSON Response:', JSON.stringify(json, null, 2));
    } else {
      // Stream response
      console.log('📡 Streaming Response:\n');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        process.stdout.write(chunk);
      }
      
      console.log('\n\n📝 Full Response Length:', fullText.length, 'characters');
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testChatAPI().catch(console.error);
