'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer, { parseChartTag } from './ChartRenderer';
import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Parse chart tags and extract chart data
  const { chartData, cleanContent } = useMemo(() => parseChartTag(content), [content]);

  return (
    <div className={`markdown-content ${className}`}>
      {/* Render chart if exists */}
      {chartData && <ChartRenderer chartData={chartData} />}

      {/* Render markdown content */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          // Bold and italic
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm">{children}</li>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-700">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left font-semibold border border-gray-300 dark:border-gray-600 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border border-gray-300 dark:border-gray-600 whitespace-nowrap">
              {children}
            </td>
          ),
          // Code
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-200 dark:bg-gray-600 p-2 rounded text-xs overflow-x-auto">
                {children}
              </code>
            );
          },
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-3 my-2 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-gray-300 dark:border-gray-600" />
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
