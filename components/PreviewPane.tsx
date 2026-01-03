import React, { useEffect, useRef, useState } from 'react';

interface PreviewPaneProps {
  content: string;
  onClose: () => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ content, onClose }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus container for keyboard shortcuts
  useEffect(() => {
    const timer = setTimeout(() => {
        rootRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      ref={rootRef}
      tabIndex={-1}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      className="h-full w-full bg-[#1e1e1e] animate-enter flex flex-col font-sans outline-none border-l border-claude-border/30"
    >
      {/* Header */}
      <div className={`h-9 flex items-center justify-between px-4 border-b bg-[#252529] select-none shrink-0 transition-colors duration-300 ${
        isFocused ? 'border-claude-accent/40' : 'border-claude-border/30'
      }`}>
        <div className="flex items-center gap-3">
           <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
             isFocused ? 'text-claude-accent' : 'text-claude-dim/70'
           }`}>
             Live Preview
           </span>
           <span className="h-3 w-[1px] bg-claude-border/50"></span>
           <span className="text-xs text-white font-medium tracking-wide">
             Render Output
           </span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold bg-white text-black px-1.5 py-0.5 rounded-[2px]">
                HTML
            </span>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 bg-white relative">
        <iframe
          title="Live Preview"
          srcDoc={content}
          className="absolute inset-0 w-full h-full border-none"
          sandbox="allow-scripts"
        />
      </div>

      {/* Footer Status */}
      <div className={`h-7 border-t bg-[#252529] px-4 flex items-center justify-between transition-colors duration-300 ${
        isFocused ? 'border-claude-accent/40' : 'border-claude-border/30'
      }`}>
         <div className="flex gap-4 text-[9px] text-claude-dim/60 font-mono">
             <span className={isFocused ? "text-claude-dim" : ""}>ESC: close</span>
         </div>
      </div>
    </div>
  );
};