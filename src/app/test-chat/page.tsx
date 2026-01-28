'use client';

import { useState } from 'react';

export default function TestChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage += chunk;
          
          // Update UI with streaming text
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage?.role === 'assistant') {
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
              };
            } else {
              newMessages.push({
                role: 'assistant',
                content: assistantMessage,
              });
            }
            
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            🧪 Test Chat API
          </h1>

          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                ส่งข้อความเพื่อเริ่มการสนทนา
              </p>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 ml-12'
                    : 'bg-gray-100 dark:bg-gray-700 mr-12'
                }`}
              >
                <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
                  {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                </div>
                <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳' : 'ส่ง'}
            </button>
          </form>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>💡 ทดสอบ: พิมพ์ &quot;สวัสดี&quot; หรือ &quot;บอกเรื่องตลกหน่อย&quot;</p>
            <p className="mt-1">
              Status: {isLoading ? '🟡 กำลังตอบ...' : '🟢 พร้อม'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
