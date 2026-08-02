import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f0c0c]/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#2a2d43] border-[6px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#da2d46] p-6 sm:p-8 relative -skew-x-2">
            <h2 className="font-orbitron font-black text-2xl text-[#e0e5ed] uppercase tracking-widest mb-4 skew-x-2 text-center">
              API Key Required
            </h2>
            <p className="font-space-mono text-sm text-[#888ea1] mb-6 skew-x-2 text-center">
              To use the AI Scanner and AI Companions, you must provide your own Google Gemini API Key. This key is saved locally in your browser.
            </p>
            
            <div className="flex flex-col gap-4 skew-x-2">
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-[#0f0c0c] border-[3px] border-[#888ea1] p-3 font-space-mono text-[#e0e5ed] outline-none focus:border-[#da2d46] transition-colors placeholder:opacity-50"
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={!inputValue.trim()}
                  className="flex-1 bg-[#da2d46] hover:bg-[#ff3b56] text-[#0f0c0c] border-[3px] border-[#0f0c0c] p-3 font-orbitron font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  Save Key
                </button>
                {localStorage.getItem('filinstruments_gemini_key') && (
                  <button 
                    onClick={() => { clearApiKey(); setShowPrompt(false); }}
                    className="bg-[#da2d46]/20 hover:bg-[#da2d46]/40 text-[#da2d46] border-[3px] border-[#da2d46] p-3 font-orbitron font-black uppercase tracking-widest transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <button 
                onClick={handleSkip}
                className="w-full bg-transparent hover:bg-[#888ea1]/20 text-[#888ea1] border-[3px] border-[#888ea1] p-3 font-orbitron font-black uppercase tracking-widest transition-all"
              >
                Play Without AI
              </button>
            </div>
          </div>
        </div>
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
