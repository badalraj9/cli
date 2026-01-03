import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OutputItem } from './OutputItem';
import { streamResponse, resetSession, setConnectionConfig } from '../services/geminiService';
import { triggerFileSelect, processFile } from '../services/fileService';
import { HistoryItem, MessageType, ConnectionState, FileContext } from '../types';
import { INITIAL_GREETING } from '../constants';

interface TerminalProps {
  onConnectionChange: (state: ConnectionState) => void;
  files: FileContext[];
  setFiles: React.Dispatch<React.SetStateAction<FileContext[]>>;
  setPreviewContent: (content: string) => void;
  setIsPreviewOpen: (isOpen: boolean) => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  onConnectionChange,
  files,
  setFiles,
  setPreviewContent,
  setIsPreviewOpen
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        return;

      case 'export': {
        const filename = args[1] || `conversation-${new Date().toISOString().slice(0, 10)}.md`;
        let content = `# Conversation Log\nDate: ${new Date().toLocaleString()}\n\n`;

        history.forEach(item => {
          if (item.type === MessageType.USER) {
            content += `## User\n${item.content}\n\n`;
          } else if (item.type === MessageType.ASSISTANT) {
            content += `## AI\n${item.content}\n\n`;
          }
        });

        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addHistoryItem(MessageType.INFO, `Exported conversation to ${a.download}`);
        return;
      }

      case 'preview': {
        const subCmd = args[1];
        if (subCmd === 'close' || subCmd === 'off') {
            setIsPreviewOpen(false);
            addHistoryItem(MessageType.INFO, "Preview panel closed.");
        } else {
            // If the user provided content, use it? Or just toggle last?
            // For now, simple toggle of existing content or last HTML block
            setIsPreviewOpen(true);
            addHistoryItem(MessageType.INFO, "Preview panel opened.");
        }
        return;
      }
        
      case 'help':
        addHistoryItem(MessageType.INFO, `
Commands:
  connect gemini                 Connect to Gemini Cloud (Default)
  connect local <model> [url]    Connect to Localhost (e.g., connect local llama3)
  upload                         Upload a file (PDF/Text) for context
  context                        View current loaded context
  export [filename]              Export conversation to Markdown
  preview [off]                  Toggle preview panel
  clear                          Clear terminal
  reset                          Reset conversation context
  
Features:
  - Google Search Grounding (Gemini)
  - PDF/Text Parsing & RAG (Local/Cloud)
  - Multi-file Context Support
        `);
        return;

      case 'reset':
        resetSession();
        setFiles([]);
        addHistoryItem(MessageType.SYSTEM, "Conversation context and files reset.");
        return;

      case 'upload':
        try {
          addHistoryItem(MessageType.SYSTEM, "Select a file to upload...");
          const file = await triggerFileSelect();
          if (file) {
             addHistoryItem(MessageType.SYSTEM, `Processing ${file.name}...`);
             const context = await processFile(file);
             setFiles(prev => [...prev, context]);
             addHistoryItem(MessageType.INFO, `Loaded: ${file.name} (${Math.round(context.content.length / 1024)} KB)\nFile added to active context.`);
          } else {
             addHistoryItem(MessageType.SYSTEM, "No file selected.");
          }
        } catch (err) {
          addHistoryItem(MessageType.ERROR, "Error reading file.");
          console.error(err);
        }
        return;

      case 'context':
        if (files.length > 0) {
           let msg = `Active Context (${files.length} files):\n`;
           files.forEach((f, i) => {
             msg += `${i+1}. ${f.name} (${Math.round(f.content.length / 1024)} KB) [${f.type}]\n`;
           });
           addHistoryItem(MessageType.INFO, msg);
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

  const handleAIChat = async (message: string) => {
    setIsProcessing(true);
    
    setTimeout(async () => {
        const responseId = addHistoryItem(MessageType.ASSISTANT, '', true);
        let fullResponse = '';

        try {
          const stream = streamResponse(message, history, files);
          
          for await (const chunk of stream) {
            fullResponse += chunk;
            updateHistoryItem(responseId, fullResponse, true);
            scrollToBottom();
          }
          updateHistoryItem(responseId, fullResponse, false);
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
          <OutputItem
            key={item.id}
            item={item}
            onPreview={(code) => {
              setPreviewContent(code);
              setIsPreviewOpen(true);
            }}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 mb-6 pt-4 shrink-0 bg-claude-bg">
        {files.length > 0 && (
           <div className="mb-2 px-3 py-1 text-xs text-claude-accent border border-claude-accent/30 inline-block rounded bg-claude-accent/5">
             Context: {files.length} file(s) loaded
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
            placeholder={isProcessing ? "" : "Type 'help', 'upload', or a message..."}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
