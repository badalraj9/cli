import React, { useState } from 'react';
import { ConnectionState, FileContext } from '../types';
import { ContextSidebar } from './ContextSidebar';
import { PreviewPanel } from './PreviewPanel';

interface LayoutProps {
  children: React.ReactNode;
  connectionState: ConnectionState;
  files: FileContext[];
  onRemoveFile: (id: string) => void;
  onClearFiles: () => void;
  // Preview Props
  isPreviewOpen: boolean;
  previewContent: string;
  onClosePreview: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  connectionState,
  files,
  onRemoveFile,
  onClearFiles,
  isPreviewOpen,
  previewContent,
  onClosePreview
}) => {
  const isLocal = connectionState.provider === 'LOCAL';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-claude-bg text-claude-text flex flex-col items-center justify-center overflow-hidden relative">

      <ContextSidebar
        files={files}
        onRemove={onRemoveFile}
        onClear={onClearFiles}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <PreviewPanel
        isOpen={isPreviewOpen}
        content={previewContent}
        onClose={onClosePreview}
      />

      {/* Main Container */}
      <div className={`
        w-full h-full max-w-4xl flex flex-col relative bg-claude-bg transition-all duration-300
        ${isSidebarOpen ? 'mr-64' : ''}
        ${isPreviewOpen ? 'w-1/2 max-w-none border-r border-claude-border' : ''}
      `}>
        
        {/* Minimal Header */}
        <div className="h-14 flex items-center justify-between px-6 shrink-0 select-none border-b border-claude-border/30 font-sans transition-colors duration-300">
           <div className="font-medium text-sm text-claude-dim tracking-wide flex items-center gap-2">
             <span className={isLocal ? "text-amber-500" : "text-blue-400"}>
               {isLocal ? 'Localhost' : 'Gemini Cloud'}
             </span>
             <span className="text-claude-border">/</span> 
             <span className="text-white/80">{connectionState.model}</span>
           </div>
           
           <div className={`text-[11px] font-medium flex items-center gap-2 px-3 py-1 rounded-full border ${
             isLocal 
               ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
               : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
           }`}>
             <span className={`w-1.5 h-1.5 rounded-full ${
               isLocal ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
             }`}></span>
             {connectionState.status}
           </div>
        </div>

        {/* Content Area - Mono Font for Terminal */}
        <div className="flex-1 overflow-hidden relative px-2 font-mono">
          {children}
        </div>
        
      </div>
    </div>
  );
};
