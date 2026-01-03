import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { HistoryItem, MessageType } from '../types';

interface OutputItemProps {
  item: HistoryItem;
  onPreview?: (content: string) => void;
}

export const OutputItem: React.FC<OutputItemProps> = ({ item, onPreview }) => {
  const isUser = item.type === MessageType.USER;
  const isSystem = item.type === MessageType.SYSTEM;
  const isError = item.type === MessageType.ERROR;

  // Animation wrapper class
  const animationClass = "animate-enter origin-bottom";

  if (isUser) {
    return (
      <div className={`mt-6 mb-2 group ${animationClass}`}>
        <div className="flex items-start">
          <div className="text-claude-accent font-bold mr-3 select-none text-lg leading-relaxed pt-0.5">
            ➜
          </div>
          <div className="whitespace-pre-wrap break-words font-medium text-lg text-white leading-relaxed">
            {item.content}
          </div>
        </div>
      </div>
    );
  }

  if (isSystem || isError) {
    return (
      <div className={`my-4 py-2 px-3 border-l-2 ${isError ? 'border-red-500/50 text-red-400' : 'border-claude-dim text-claude-dim'} bg-claude-panel/20 ${animationClass}`}>
        <div className="whitespace-pre-wrap text-xs font-mono tracking-tight">{item.content}</div>
      </div>
    );
  }

  // AI / Assistant Response
  return (
    <div className={`mb-8 pl-[2.25rem] text-claude-text/90 leading-7 max-w-full overflow-x-hidden ${animationClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            
            if (isInline) {
               return (
                <code className="bg-claude-panel text-claude-accent px-1.5 py-0.5 rounded text-[0.85em] font-medium" {...props}>
                  {children}
                </code>
               );
            }

            return (
              <div className="my-5 overflow-hidden rounded border border-claude-border/50 bg-[#1e1e1e]">
                <div className="flex items-center justify-between bg-[#2d2d2d] px-4 py-2 text-xs text-gray-400 border-b border-white/10 font-sans select-none">
                  <span>{match ? match[1] : 'text'}</span>
                  {onPreview && (match?.[1] === 'html' || match?.[1] === 'svg') && (
                     <button
                       onClick={() => onPreview(String(children).replace(/\n$/, ''))}
                       className="text-claude-accent hover:text-white transition-colors cursor-pointer"
                       title="Open in Preview"
                     >
                       Preview
                     </button>
                  )}
                </div>
                <SyntaxHighlighter
                  {...props}
                  style={vscDarkPlus}
                  language={match ? match[1] : 'text'}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    background: 'transparent',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: {
                        fontFamily: '"JetBrains Mono", monospace'
                    }
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-outside my-4 ml-4 space-y-2 text-claude-dim">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-outside my-4 ml-4 space-y-2 text-claude-dim">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-claude-accent underline underline-offset-2 hover:text-white transition-colors">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-claude-accent/40 pl-4 italic text-claude-dim my-4">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4 mt-8 font-sans">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-3 mt-6 font-sans">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2 mt-4 font-sans">{children}</h3>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 border border-claude-border/50 rounded-lg">
              <table className="min-w-full divide-y divide-claude-border/30 text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-claude-panel/50 text-white font-semibold">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-claude-border/30 bg-transparent">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3 text-claude-accent">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-claude-dim">{children}</td>,
        }}
      >
        {item.content}
      </ReactMarkdown>
      {item.isStreaming && (
         <span className="inline-block w-2.5 h-5 bg-claude-accent ml-1 animate-cursor-blink align-text-bottom"></span>
      )}
    </div>
  );
};
