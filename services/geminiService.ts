import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { HistoryItem, MessageType, AIProvider, FileContext } from "../types";

// Configuration State
let currentProvider: AIProvider = 'GEMINI';
let currentModel = 'gemini-3-flash-preview';
let localUrl = 'http://localhost:11434'; // Default Ollama port

// Gemini State
let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

// --- Configuration Methods ---

export const setConnectionConfig = (provider: AIProvider, model: string, url?: string) => {
  currentProvider = provider;
  currentModel = model;
  if (url) localUrl = url;
  
  // Reset sessions when switching
  chatSession = null;
};

// --- Helper: Format Context ---
const formatContext = (files: FileContext[]): string => {
  if (!files || files.length === 0) return '';

  let contextString = '[CONTEXT FILES LOADED]\n';
  files.forEach((file, index) => {
    contextString += `\n--- FILE ${index + 1}: ${file.name} ---\n${file.content}\n`;
  });
  return contextString;
};

// --- Gemini Implementation ---

const initializeGemini = () => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY not found in environment.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
};

const getGeminiStream = async function* (message: string, files: FileContext[]) {
  initializeGemini();
  if (!genAI) throw new Error("Gemini client initialization failed.");

  const contextContent = formatContext(files);
  
  let effectiveMessage = message;
  if (contextContent) {
    effectiveMessage = `${contextContent}\n\n[USER QUERY]\n${message}`;
  }

  if (!chatSession) {
    chatSession = genAI.chats.create({
      model: currentModel,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      },
    });
  }

  // We need to type the result stream correctly to access grounding metadata
  const result = await chatSession.sendMessageStream({ message: effectiveMessage });
  
  let accumulatedGrounding: any[] = [];

  for await (const chunk of result) {
    // Check for grounding chunks
    const c = chunk as any;
    if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      accumulatedGrounding = c.candidates[0].groundingMetadata.groundingChunks;
    }
    
    if (c.text) {
      yield c.text;
    }
  }

  // Append sources if available
  if (accumulatedGrounding.length > 0) {
    let sourcesText = "\n\n---\n**Sources:**\n";
    const uniqueLinks = new Set();
    let index = 1;

    for (const chunk of accumulatedGrounding) {
      if (chunk.web?.uri && chunk.web?.title) {
        if (!uniqueLinks.has(chunk.web.uri)) {
          sourcesText += `${index}. [${chunk.web.title}](${chunk.web.uri})\n`;
          uniqueLinks.add(chunk.web.uri);
          index++;
        }
      }
    }
    if (uniqueLinks.size > 0) {
      yield sourcesText;
    }
  }
};

// --- Local (Ollama) Implementation ---

const getLocalStream = async function* (message: string, history: HistoryItem[], files: FileContext[]) {
  // Convert history to OpenAI/Ollama format
  const messages = history
    .filter(h => h.type === MessageType.USER || h.type === MessageType.ASSISTANT || h.type === MessageType.SYSTEM)
    .map(h => ({
      role: h.type === MessageType.USER ? 'user' : h.type === MessageType.ASSISTANT ? 'assistant' : 'system',
      content: h.content
    }));

  let effectiveMessage = message;
  const contextContent = formatContext(files);

  // Inject context for local RAG-lite
  if (contextContent) {
    // If context is huge, this might hit context limits of local models.
    // For a basic implementation, we prepend it.
    effectiveMessage = `${contextContent}\n\nUser Question:\n${message}`;
  }

  // Add current message
  messages.push({ role: 'user', content: effectiveMessage });
  
  // Prepend system instruction if not present
  if (messages.length === 0 || messages[0].role !== 'system') {
    messages.unshift({ role: 'system', content: SYSTEM_INSTRUCTION });
  }

  // Attempt to fetch from local endpoint (Assumes Ollama /api/chat format)
  const response = await fetch(`${localUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: currentModel,
      messages: messages,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`Local server error: ${response.status} ${response.statusText}. Ensure CORS is enabled (OLLAMA_ORIGINS="*").`);
  }

  if (!response.body) throw new Error("No response body from local server.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        // Handle Ollama response format
        if (json.message && json.message.content) {
          yield json.message.content;
        }
        if (json.done) return;
      } catch (e) {
        // Ignore parse errors for partial chunks
      }
    }
  }
};

// --- Unified Stream Function ---

export const resetSession = () => {
  chatSession = null;
};

export const streamResponse = async function* (message: string, history: HistoryItem[], files: FileContext[]) {
  try {
    if (currentProvider === 'GEMINI') {
      yield* getGeminiStream(message, files);
    } else {
      yield* getLocalStream(message, history, files);
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    yield `\n[CONNECTION ERROR]: ${error instanceof Error ? error.message : "Unknown error occurred."}`;
  }
};
