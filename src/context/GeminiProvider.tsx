import React, { createContext, useContext, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';

// ─── Context Types ─────────────────────────────────────────────────────────────

interface GeminiContextValue {
  client: GoogleGenAI;
}

const GeminiContext = createContext<GeminiContextValue | null>(null);

// API key is baked in at build time from VITE_GEMINI_API_KEY env variable.
// Never ask end-users for a key — this is a self-hosted hackathon demo.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!API_KEY) {
  console.error(
    '[Gemini] VITE_GEMINI_API_KEY is not set. ' +
    'Create a .env file with VITE_GEMINI_API_KEY=your_key'
  );
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function GeminiProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new GoogleGenAI({ apiKey: API_KEY ?? '' }), []);

  return (
    <GeminiContext.Provider value={{ client }}>
      {children}
    </GeminiContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGemini(): GeminiContextValue {
  const ctx = useContext(GeminiContext);
  if (!ctx) throw new Error('useGemini must be used within GeminiProvider');
  return ctx;
}
