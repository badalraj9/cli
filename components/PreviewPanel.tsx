import React, { useEffect, useRef } from 'react';

interface PreviewPanelProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ content, isOpen, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(content || '<div style="color: #666; font-family: monospace; padding: 20px;">No content to preview</div>');
        doc.close();
      }
    }
  }, [content]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-0 bottom-0 w-1/2 bg-claude-bg border-l border-claude-border shadow-2xl z-20 flex flex-col animate-slide-up">
      <div className="flex items-center justify-between px-4 py-2 bg-claude-panel border-b border-claude-border select-none">
        <span className="text-xs font-semibold text-claude-text uppercase tracking-wider">Preview</span>
        <button onClick={onClose} className="text-claude-dim hover:text-white transition-colors">
          ✕
        </button>
      </div>
      <div className="flex-1 bg-white relative">
         <iframe
           ref={iframeRef}
           className="w-full h-full border-none"
           title="Preview"
           sandbox="allow-scripts"
         />
      </div>
    </div>
  );
};
