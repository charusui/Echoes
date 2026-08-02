import { useState, useRef, useEffect } from 'react';

export type AuthStatus = 'idle' | 'initializing' | 'waiting-for-auth' | 'unlocking' | 'success' | 'error';

export function useGameOnAuth() {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startAuthFlow = async () => {
    try {
      setStatus('initializing');
      setErrorMsg(null);
      
      const gameId = import.meta.env.VITE_GAMEON_ID;
      if (!gameId) {
        throw new Error("GameOn ID is missing in environment variables.");
      }

      // Phase 1: Create Session
      const sessionRes = await fetch('https://gameonportal.ph/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId })
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to initialize GameOn session.');
      }

      const { sessionToken, signinUrl } = await sessionRes.json();

      // Phase 2: Open Browser
      window.open(signinUrl, '_blank');
      setStatus('waiting-for-auth');

      // Phase 3: Poll Status
      if (pollingRef.current) clearInterval(pollingRef.current);
      
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('https://gameonportal.ph/api/session', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${sessionToken}` }
          });
          
          if (!pollRes.ok) return;
          
          const pollData = await pollRes.json();
          
          if (pollData.status === 'authorized') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            
            // Phase 4: Unlock Artifact
            setStatus('unlocking');
            const unlockRes = await fetch('https://gameonportal.ph/api/artifacts/unlock', {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json' 
              }
            });
            
            if (unlockRes.ok) {
              setStatus('success');
            } else {
              const errText = await unlockRes.text();
              console.error("Unlock failed:", unlockRes.status, errText);
              throw new Error(`Failed to unlock artifact: ${unlockRes.status} ${errText}`);
            }
          } else if (pollData.status === 'expired') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            throw new Error('Session expired. Please try again.');
          }
        } catch (e) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStatus('error');
          setErrorMsg(e instanceof Error ? e.message : 'An error occurred while polling authentication.');
        }
      }, 3000);

    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'An error occurred while initializing authentication.');
    }
  };
  
  const reset = () => {
    setStatus('idle');
    setErrorMsg(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  return { status, errorMsg, startAuthFlow, reset };
}
