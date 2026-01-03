import React from 'react';
import { FileContext } from '../types';

interface ContextSidebarProps {
  files: FileContext[];
  onRemove: (id: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ContextSidebar: React.FC<ContextSidebarProps> = ({
  files,
  onRemove,
  onClear,
  isOpen,
  onToggle
}) => {
  return (
    <>
      {/* Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute top-20 right-0 bg-claude-panel border-l border-t border-b border-claude-border px-2 py-3 rounded-l-md hover:bg-claude-panel/80 transition-colors z-20 group"
          title="Show Context Files"
        >
          <div className="text-claude-dim group-hover:text-claude-accent transition-colors writing-vertical-rl text-xs font-medium tracking-wide">
            CONTEXT ({files.length})
          </div>
        </button>
      )}

      {/* Sidebar Panel */}
      <div className={`
        fixed top-0 right-0 h-full w-64 bg-claude-bg border-l border-claude-border/50 shadow-xl z-30 transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-claude-border/30">
             <h3 className="text-sm font-semibold text-claude-text">Active Context</h3>
             <button onClick={onToggle} className="text-claude-dim hover:text-white">
               ✕
             </button>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {files.length === 0 ? (
               <div className="text-center text-claude-dim text-xs mt-10 italic">
                 No files loaded.<br/>Use 'upload' command.
               </div>
             ) : (
               files.map(file => (
                 <div key={file.id} className="group relative bg-claude-panel/40 border border-claude-border/50 rounded p-3 hover:border-claude-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                       <div>
                         <div className="text-xs font-medium text-claude-text truncate w-40" title={file.name}>
                           {file.name}
                         </div>
                         <div className="text-[10px] text-claude-dim mt-1 uppercase">
                           {file.type.split('/')[1] || 'TXT'} • {Math.round(file.content.length / 1024)}KB
                         </div>
                       </div>
                       <button
                         onClick={() => onRemove(file.id)}
                         className="text-claude-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Remove file"
                       >
                         ✕
                       </button>
                    </div>
                 </div>
               ))
             )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-claude-border/30 bg-claude-bg">
             <button
               onClick={onClear}
               disabled={files.length === 0}
               className="w-full py-2 text-xs font-medium text-red-400 border border-red-500/20 bg-red-500/5 rounded hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               Clear All Context
             </button>
          </div>
        </div>
      </div>
    </>
  );
};
