export enum MessageType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  ASSISTANT = 'ASSISTANT',
  ERROR = 'ERROR',
  INFO = 'INFO'
}

export interface HistoryItem {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Command {
  command: string;
  description: string;
  action: (args: string[]) => void;
}

export type AIProvider = 'GEMINI' | 'LOCAL';

export interface ConnectionState {
  provider: AIProvider;
  model: string;
  url?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
}

export interface FileContext {
  id: string; // Added ID for easier management
  name: string;
  content: string;
  type: string;
}
