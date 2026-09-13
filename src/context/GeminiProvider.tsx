import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Key } from 'pixelarticons/react';
import { PixelButton, PixelModal } from '../components/ui';

// ─── Context Types ─────────────────────────────────────────────────────────────

const isElectron = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

interface GeminiContextValue {
  client: GoogleGenAI;
  isElectron: boolean;
  showApiKeyPrompt: () => void;
  clearApiKey: () => void;
}

const GeminiContext = createContext<GeminiContextValue | null>(null);

// Vercel build will inject this. The HTML5 zip build will NOT have it (if we clear it during build).
const ENV_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

// ─── Provider ──────────────────────────────────────────────────────────────────

export function GeminiProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState(() => ENV_API_KEY || localStorage.getItem('filinstruments_gemini_key') || '');
  const [showPrompt, setShowPrompt] = useState(false);
  const [inputValue, setInputValue] = useState(() => localStorage.getItem('filinstruments_gemini_key') || '');

  // Only show prompt in Electron if there is no key at all (from ENV or LocalStorage)
  useEffect(() => {
    if (isElectron && !ENV_API_KEY && !localStorage.getItem('filinstruments_gemini_key') && !localStorage.getItem('filinstruments_gemini_skipped')) {
      setShowPrompt(true);
    }
  }, []);

  const client = useMemo(() => new GoogleGenAI({ apiKey: apiKey }), [apiKey]);

  const handleSave = () => {
    if (inputValue.trim()) {
      localStorage.setItem('filinstruments_gemini_key', inputValue.trim());
      localStorage.removeItem('filinstruments_gemini_skipped');
      setApiKey(inputValue.trim());
      setShowPrompt(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('filinstruments_gemini_skipped', 'true');
    setShowPrompt(false);
  };

  const showApiKeyPrompt = () => {
    setInputValue(localStorage.getItem('filinstruments_gemini_key') || '');
    setShowPrompt(true);
  };

  const clearApiKey = () => {
    localStorage.removeItem('filinstruments_gemini_key');
    localStorage.removeItem('filinstruments_gemini_skipped');
    setApiKey('');
    setInputValue('');
  };

  return (
    <GeminiContext.Provider value={{ client, isElectron, showApiKeyPrompt, clearApiKey }}>
      {children}
      
      {showPrompt && (
        <PixelModal
          onClose={handleSkip}
          title="Gemini API Key"
          subtitle="Needed for the AI scanner and companions"
          icon={<Key />}
          maxWidth="max-w-md"
          footer={
            <>
              {localStorage.getItem('filinstruments_gemini_key') && (
                <PixelButton variant="danger" size="sm" className="mr-auto" onClick={() => { clearApiKey(); setShowPrompt(false); }}>
                  Clear Key
                </PixelButton>
              )}
              <PixelButton variant="ghost" onClick={handleSkip}>Play Without AI</PixelButton>
              <PixelButton variant="primary" disabled={!inputValue.trim()} onClick={handleSave}>Save Key</PixelButton>
            </>
          }
        >
          <p className="text-base text-parchment-300">
            Paste your own Google Gemini API key. It stays on this device and is only used to talk to Gemini.
          </p>
          <label className="mt-4 block">
            <span className="text-sm text-parchment-300">API key</span>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="mt-1 w-full h-12 px-3 bg-plum-950 border-[3px] border-ink text-base text-parchment-100 placeholder:text-parchment-500 focus:border-gold-300 focus:outline-none"
            />
          </label>
        </PixelModal>
      )}
    </GeminiContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useGemini(): GeminiContextValue {
  const ctx = useContext(GeminiContext);
  if (!ctx) throw new Error('useGemini must be used within GeminiProvider');
  return ctx;
}
