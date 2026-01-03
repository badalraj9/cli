import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODES } from "../constants";
import { HistoryItem, MessageType, AIProvider } from "../types";

// Configuration State
let currentProvider: AIProvider = 'GEMINI';
let currentModel = 'gemini-3-flash-preview';
let localUrl = 'http://localhost:11434'; // Default Ollama port
let currentSystemInstruction = MODES.chat.instruction;

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

export const updateSystemInstruction = (instruction: string) => {
  currentSystemInstruction = instruction;
  // Reset session to apply new persona
  chatSession = null;
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

const getGeminiStream = async function* (message: string, contextContent?: string) {
  initializeGemini();
  if (!genAI) throw new Error("Gemini client initialization failed.");

  // If we have new context and a session exists, we might need to recreate it or send it as part of the message
  // For simplicity, if context is provided, we send it in the message prompt this turn.
  
  let effectiveMessage = message;
  if (contextContent) {
    effectiveMessage = `[CONTEXT FILE LOADED]\n${contextContent}\n\n[USER QUERY]\n${message}`;
  }

  if (!chatSession) {
    chatSession = genAI.chats.create({
      model: currentModel,
      config: { 
        systemInstruction: currentSystemInstruction,
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

const getLocalStream = async function* (message: string, history: HistoryItem[], contextContent?: string) {
  // Convert history to OpenAI/Ollama format
  const messages = history
    .filter(h => h.type === MessageType.USER || h.type === MessageType.ASSISTANT || h.type === MessageType.SYSTEM)
    .map(h => ({
      role: h.type === MessageType.USER ? 'user' : h.type === MessageType.ASSISTANT ? 'assistant' : 'system',
      content: h.content
    }));

  let effectiveMessage = message;
  // Inject context for local RAG-lite
  if (contextContent) {
    // If context is huge, this might hit context limits of local models.
    // For a basic implementation, we prepend it.
    effectiveMessage = `Context from uploaded file:\n${contextContent}\n\nUser Question:\n${message}`;
  }

  // Add current message
  messages.push({ role: 'user', content: effectiveMessage });
  
  // Prepend system instruction if not present
  if (messages.length === 0 || messages[0].role !== 'system') {
    messages.unshift({ role: 'system', content: currentSystemInstruction });
  } else if (messages[0].role === 'system') {
      // Ensure the system instruction matches the current mode
      messages[0].content = currentSystemInstruction;
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

export const streamResponse = async function* (message: string, history: HistoryItem[], contextContent?: string) {
  try {
    if (currentProvider === 'GEMINI') {
      yield* getGeminiStream(message, contextContent);
    } else {
      yield* getLocalStream(message, history, contextContent);
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    yield `\n[CONNECTION ERROR]: ${error instanceof Error ? error.message : "Unknown error occurred."}`;
  }
};