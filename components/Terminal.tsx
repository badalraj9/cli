import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OutputItem } from './OutputItem';
import { streamResponse, resetSession, setConnectionConfig, updateSystemInstruction } from '../services/geminiService';
import { triggerFileSelect, processFile } from '../services/fileService';
import { HistoryItem, MessageType, ConnectionState, FileContext, Mode } from '../types';
import { INITIAL_GREETING, MODES } from '../constants';

interface TerminalProps {
  onConnectionChange: (state: ConnectionState) => void;
  onLensToggle: (isOpen: boolean) => void;
  onContextChange: (context: FileContext | null) => void;
  isLensOpen: boolean;
  activeContext: FileContext | null;
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
  onPreviewUpdate: (content: string | null) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  onConnectionChange, 
  onLensToggle, 
  onContextChange,
  isLensOpen,
  activeContext,
  activeMode,
  onModeChange,
  onPreviewUpdate
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    // Use 'auto' (instant) instead of 'smooth' to prevent jitter during streaming
    // when content height changes rapidly
    requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
  };

  useEffect(() => {
    setHistory([{
      id: uuidv4(),
      type: MessageType.SYSTEM,
      content: INITIAL_GREETING,
      timestamp: Date.now(),
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // Refocus input when Lens/Preview closes
  useEffect(() => {
    if (!isLensOpen) {
      inputRef.current?.focus();
    }
  }, [isLensOpen]);

  const addHistoryItem = (type: MessageType, content: string, isStreaming = false): string => {
    const id = uuidv4();
    setHistory(prev => [...prev, { id, type, content, timestamp: Date.now(), isStreaming }]);
    return id;
  };

  const updateHistoryItem = useCallback((id: string, content: string, isStreaming: boolean) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, content, isStreaming } : item
    ));
  }, []);

  const handleCommand = async (cmd: string) => {
    const args = cmd.trim().split(/\s+/);
    const mainCommand = args[0].toLowerCase();
    
    switch (mainCommand) {
      case 'clear':
      case 'cls':
        setHistory([]);
        onLensToggle(false); 
        onPreviewUpdate(null);
        return;
        
      case 'help':
        addHistoryItem(MessageType.INFO, `
Core Commands:
  mode <name>                    Switch intent mode (explain, code, doc, design, chat)
  connect gemini                 Connect to Gemini Cloud
  connect local <model> [url]    Connect to Localhost
  upload                         Load document into Context
  open / close                   Manage Document Lens
  preview close                  Close Live Preview
  clear                          Clear terminal
  reset                          Reset session & context

Current Mode: ${activeMode.toUpperCase()}
        `);
        return;

      case 'preview':
        if (args[1] === 'close') {
            onPreviewUpdate(null);
        }
        return;

      case 'mode':
        if (!args[1]) {
           const modesList = Object.entries(MODES).map(([key, val]) => 
             `  ${key.padEnd(10)} – ${val.description}`
           ).join('\n');
           
           addHistoryItem(MessageType.INFO, `
Available Modes:
${modesList}

Usage: mode <name>
Current: ${activeMode.toUpperCase()}
           `);
        } else {
           const targetMode = args[1].toLowerCase();
           if (targetMode in MODES) {
             const newMode = targetMode as Mode;
             onModeChange(newMode);
             updateSystemInstruction(MODES[newMode].instruction);
             addHistoryItem(MessageType.SYSTEM, `Switched to [${newMode.toUpperCase()}] mode.\n${MODES[newMode].description}`);
             
             // Close preview when switching modes to be clean
             onPreviewUpdate(null);
           } else {
             addHistoryItem(MessageType.ERROR, `Unknown mode: ${targetMode}`);
           }
        }
        return;

      case 'open':
      case 'view':
        if (!activeContext) {
           addHistoryItem(MessageType.ERROR, "No context loaded. Use 'upload' first.");
        } else {
           onLensToggle(true);
           onPreviewUpdate(null); // Close preview if opening lens
           addHistoryItem(MessageType.SYSTEM, `Opening Document Lens: ${activeContext.name}`);
        }
        return;

      case 'close':
        onLensToggle(false);
        onPreviewUpdate(null);
        return;

      case 'reset':
        resetSession();
        onContextChange(null);
        onLensToggle(false);
        onPreviewUpdate(null);
        onModeChange('chat'); // Reset to default mode
        updateSystemInstruction(MODES.chat.instruction);
        addHistoryItem(MessageType.SYSTEM, "System reset complete. Context cleared. Mode reset to CHAT.");
        return;

      case 'upload':
        try {
          addHistoryItem(MessageType.SYSTEM, "Select a file (PDF/MD/TXT)...");
          const file = await triggerFileSelect();
          if (file) {
             addHistoryItem(MessageType.SYSTEM, `Processing ${file.name}...`);
             const context = await processFile(file);
             onContextChange(context);
             onLensToggle(true); // Auto-open lens
             onPreviewUpdate(null); // Prioritize lens
             
             // Suggest DOC mode if not active
             let msg = `Loaded: ${file.name} (${Math.round(context.content.length / 1024)} KB)\nDocument Lens opened.`;
             if (activeMode !== 'doc') {
                msg += `\n\n[TIP] Type 'mode doc' to optimize the model for document analysis.`;
             }
             addHistoryItem(MessageType.INFO, msg);
          } else {
             addHistoryItem(MessageType.SYSTEM, "No file selected.");
          }
        } catch (err) {
          addHistoryItem(MessageType.ERROR, "Error reading file.");
          console.error(err);
        }
        return;

      case 'context':
        if (activeContext) {
           addHistoryItem(MessageType.INFO, `Active Context:\nFile: ${activeContext.name}\nType: ${activeContext.type}\nSize: ${activeContext.content.length} chars`);
        } else {
           addHistoryItem(MessageType.INFO, "No context loaded.");
        }
        return;

      case 'connect':
        if (args[1] === 'local') {
          const model = args[2] || 'llama3';
          const url = args[3] || 'http://localhost:11434';
          
          setConnectionConfig('LOCAL', model, url);
          onConnectionChange({ provider: 'LOCAL', model, url, status: 'CONNECTED' });
          addHistoryItem(MessageType.SYSTEM, `Switched to LOCAL provider.\nTarget: ${url}\nModel: ${model}`);
        } else if (args[1] === 'gemini') {
          setConnectionConfig('GEMINI', 'gemini-3-flash-preview');
          onConnectionChange({ provider: 'GEMINI', model: 'gemini-3-flash-preview', status: 'CONNECTED' });
          addHistoryItem(MessageType.SYSTEM, "Switched to GEMINI provider (Cloud).");
        } else {
           addHistoryItem(MessageType.ERROR, "Usage: connect [gemini|local] [model_name]");
        }
        return;

      default:
        await handleAIChat(cmd);
        return;
    }
  };

  const extractPreviewableCode = (text: string): string | null => {
    // Regex to find ```html or ```svg blocks
    // We look for the LAST occurrence to get the final output
    const regex = /```(html|svg)\n([\s\S]*?)```/g;
    let match;
    let lastMatch = null;
    
    while ((match = regex.exec(text)) !== null) {
        lastMatch = match[2];
    }
    return lastMatch;
  };

  const handleAIChat = async (message: string) => {
    setIsProcessing(true);
    
    setTimeout(async () => {
        const responseId = addHistoryItem(MessageType.ASSISTANT, '', true);
        let fullResponse = '';

        try {
          const contextContent = activeContext ? activeContext.content : undefined;
          
          const stream = streamResponse(message, history, contextContent);
          
          for await (const chunk of stream) {
            fullResponse += chunk;
            updateHistoryItem(responseId, fullResponse, true);
            scrollToBottom();
          }
          updateHistoryItem(responseId, fullResponse, false);

          // After response finishes, check for previewable code if in CODE mode
          if (activeMode === 'code') {
              const htmlContent = extractPreviewableCode(fullResponse);
              if (htmlContent) {
                  onPreviewUpdate(htmlContent);
                  addHistoryItem(MessageType.INFO, "Live Preview updated.");
              }
          }

        } catch (error) {
          updateHistoryItem(responseId, "Connection error.", false);
        } finally {
          setIsProcessing(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = input.trim();
      if (!trimmed) return;

      addHistoryItem(MessageType.USER, trimmed);
      setInputHistory(prev => [...prev, trimmed]);
      setHistoryIndex(-1);
      setInput('');
      handleCommand(trimmed);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(inputHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = Math.min(inputHistory.length - 1, historyIndex + 1);
      if (historyIndex === inputHistory.length - 1) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(inputHistory[newIndex]);
      }
    }
  };

  return (
    <div 
      className="h-full w-full flex flex-col pt-2 pb-0 px-4 text-base font-mono"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {history.map(item => (
          <OutputItem key={item.id} item={item} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 mb-6 pt-4 shrink-0 bg-claude-bg">
        {activeContext && (
           <div className="mb-2 flex items-center gap-2">
             <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded uppercase">
               Context Loaded
             </span>
             <span className="text-xs text-claude-dim">{activeContext.name}</span>
           </div>
        )}
        <div className="relative flex items-center group">
          <span className={`text-claude-accent font-bold mr-3 select-none text-lg transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}>➜</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            autoFocus
            className="w-full bg-transparent border-none outline-none text-white placeholder-claude-dim/30 font-medium text-lg caret-claude-accent"
            placeholder={isProcessing ? "" : `Type 'help' or query [${activeMode}]...`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};