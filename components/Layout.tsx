import React from 'react';
import { ConnectionState, FileContext, Mode } from '../types';
import { GhostPane } from './GhostPane';

interface LayoutProps {
  children: React.ReactNode;
  connectionState: ConnectionState;
  isLensOpen: boolean;
  activeContext: FileContext | null;
  activeMode: Mode;
}

export const Layout: React.FC<LayoutProps> = ({ children, connectionState, isLensOpen, activeContext, activeMode }) => {
  const isLocal = connectionState.provider === 'LOCAL';

  return (
    <div className="h-screen w-screen bg-claude-bg text-claude-text flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ease-in-out">
      {/* Main Container */}
      <div className={`h-full flex flex-col relative bg-claude-bg transition-all duration-500 ease-in-out ${
        isLensOpen ? 'w-full max-w-[98vw]' : 'w-full max-w-4xl'
      }`}>
        
        {/* Minimal Header */}
        <div className="h-14 flex items-center justify-between px-6 shrink-0 select-none border-b border-claude-border/30 font-sans transition-colors duration-300">
           <div className="font-medium text-sm text-claude-dim tracking-wide flex items-center gap-2">
             <span className={isLocal ? "text-amber-500" : "text-blue-400"}>
               {isLocal ? 'Localhost' : 'Gemini Cloud'}
             </span>
             <span className="text-claude-border">/</span> 
             <span className="text-white/80">{connectionState.model}</span>
           </div>

           <div className="flex items-center gap-4">
             {/* Mode Indicator */}
             <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-claude-dim/80 bg-claude-panel/50 px-3 py-1 rounded-sm border border-claude-border/30">
               <span className="uppercase font-bold text-claude-accent">{activeMode}</span>
               <span className="opacity-50">MODE</span>
             </div>
             
             {/* Status Indicator */}
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
        </div>

        {/* Split View Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Terminal Area */}
          <div className={`flex-1 overflow-hidden relative px-2 font-mono transition-all duration-500 ${isLensOpen ? 'basis-[65%]' : 'basis-full'}`}>
            {children}
          </div>

          {/* Document Lens Area */}
          {isLensOpen && (
            <div className="basis-[35%] h-full transition-all duration-500 animate-slide-up border-l border-claude-border/30">
              <GhostPane context={activeContext} />
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};