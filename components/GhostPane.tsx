import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileContext } from '../types';

interface GhostPaneProps {
  context: FileContext | null;
  onClose: () => void;
}

export const GhostPane: React.FC<GhostPaneProps> = ({ context, onClose }) => {
  if (!context) return null;

  const isMarkdown = context.name.toLowerCase().endsWith('.md');
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus when context loads
  useEffect(() => {
    const timer = setTimeout(() => {
        rootRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!scrollRef.current) return;
    
    // Smooth scrolling amount
    const scrollAmount = 200;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'j':
      case 'ArrowDown':
        scrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        break;
      case 'k':
      case 'ArrowUp':
        scrollRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        break;
      case 'g':
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (e.shiftKey) {
             scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
        break;
      case 'G':
         scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
         break;
    }
  };

  return (
    <div 
      ref={rootRef}
      tabIndex={-1}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      className={`h-full w-full bg-[#18181b] animate-enter flex flex-col font-sans outline-none focus:ring-1 focus:ring-inset focus:ring-claude-accent/30 transition-all duration-300`}
    >
      {/* Header / Lens Chrome */}
      <div className={`h-9 flex items-center justify-between px-4 border-b bg-[#202023] select-none shrink-0 transition-colors duration-300 ${
        isFocused ? 'border-claude-accent/40' : 'border-claude-border/30'
      }`}>
        <div className="flex items-center gap-3">
           <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
             isFocused ? 'text-claude-accent' : 'text-claude-dim/70'
           }`}>
             Document Lens
           </span>
           <span className="h-3 w-[1px] bg-claude-border/50"></span>
           <span className="text-xs text-white font-medium tracking-wide truncate max-w-[200px]">
             {context.name}
           </span>
        </div>
        <div className="flex items-center gap-2">
            {isFocused && (
                <span className="text-[9px] font-bold bg-claude-accent text-white px-1.5 py-0.5 rounded-[2px] animate-pulse">
                    ACTIVE
                </span>
            )}
            <div className="text-[10px] font-mono text-claude-dim">
            {context.type === 'application/pdf' ? 'PDF TEXT' : context.type.toUpperCase()}
            </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-thin"
      >
        {isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none text-claude-text/90 leading-relaxed">
            <ReactMarkdown>{context.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="font-mono text-xs leading-relaxed text-claude-text/80 whitespace-pre-wrap break-words">
            {context.content}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className={`h-7 border-t bg-[#202023] px-4 flex items-center justify-between transition-colors duration-300 ${
        isFocused ? 'border-claude-accent/40' : 'border-claude-border/30'
      }`}>
         <div className="flex gap-4 text-[9px] text-claude-dim/60 font-mono">
             <span className={isFocused ? "text-claude-dim" : ""}>j/k: scroll</span>
             <span className={isFocused ? "text-claude-dim" : ""}>g/G: top/bot</span>
             <span className={isFocused ? "text-claude-dim" : ""}>ESC: close</span>
         </div>
         <span className="text-[10px] text-claude-dim font-mono">
            {context.content.length.toLocaleString()} chars
         </span>
      </div>
    </div>
  );
};