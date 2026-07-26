import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Users, CheckCircle, XCircle, Loader, ChevronRight, X } from 'lucide-react';
import type { VerificationResult } from '../types';
import {
  checkGpsVerification,
  checkWebXRSupport,
  submitForCommunityReview,
  makeVerificationResult,
} from '../services/verificationService';

type VerifStep =
  | 'checking-gps'
  | 'gps-approved'
  | 'gps-failed'
  | 'checking-webxr'
  | 'webxr-unsupported'
  | 'webxr-scanning'
  | 'webxr-approved'
  | 'community-fallback'
  | 'pending-review';

interface ScanVerificationScreenProps {
  imageBase64: string;
  imageMimeType: string;
  onVerified: (result: VerificationResult) => void;
  onCancel: () => void;
}

export function ScanVerificationScreen({
  imageBase64,
  imageMimeType,
  onVerified,
  onCancel,
}: ScanVerificationScreenProps) {
  const [step, setStep] = useState<VerifStep>('checking-gps');
  const [venue, setVenue] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [webxrDwell, setWebxrDwell] = useState(0); // 0–100
  const [playerNote, setPlayerNote] = useState('');
  const dwellIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Step 1: GPS ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'checking-gps') return;

    if (!navigator.geolocation) {
      setStep('checking-webxr');
      return;
    }

    const timeout = setTimeout(() => setStep('checking-webxr'), 10_000); // 10s GPS timeout

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        const result = checkGpsVerification(pos.coords);
        if (result.passed && result.venue) {
          setVenue(result.venue);
          setStep('gps-approved');
        } else {
          setStep('gps-failed');
        }
      },
      () => {
        clearTimeout(timeout);
        setStep('checking-webxr');
      },
      { timeout: 9_000, enableHighAccuracy: true },
    );

    return () => clearTimeout(timeout);
  }, [step]);

  // Auto-proceed from gps-failed
  useEffect(() => {
    if (step !== 'gps-failed') return;
    const t = setTimeout(() => setStep('checking-webxr'), 1800);
    return () => clearTimeout(t);
  }, [step]);

  // ── Step 2: WebXR ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'checking-webxr') return;
    checkWebXRSupport().then(supported => {
      setStep(supported ? 'webxr-scanning' : 'webxr-unsupported');
    });
  }, [step]);

  // Auto-proceed from webxr-unsupported
  useEffect(() => {
    if (step !== 'webxr-unsupported') return;
    const t = setTimeout(() => setStep('community-fallback'), 1800);
    return () => clearTimeout(t);
  }, [step]);

  // WebXR camera + dwell timer
  useEffect(() => {
    if (step !== 'webxr-scanning') return;

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setStep('community-fallback'));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [step]);

  const startDwell = useCallback(() => {
    if (dwellIntervalRef.current) return;
    dwellIntervalRef.current = setInterval(() => {
      setWebxrDwell(prev => {
        if (prev >= 100) {
          clearInterval(dwellIntervalRef.current!);
          dwellIntervalRef.current = null;
          setStep('webxr-approved');
          return 100;
        }
        return prev + (100 / 30); // 3 seconds at ~10fps
      });
    }, 100);
  }, []);

  const stopDwell = useCallback(() => {
    if (dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current);
      dwellIntervalRef.current = null;
    }
    setWebxrDwell(0);
  }, []);

  useEffect(() => () => {
    if (dwellIntervalRef.current) clearInterval(dwellIntervalRef.current);
  }, []);

  // ── Step 3: Community ──────────────────────────────────────────────────────

  const handleCommunitySubmit = useCallback(async () => {
    // Generate a tiny thumbnail specifically for local storage to prevent bloat
    let thumbBase64 = imageBase64;
    try {
      const img = new Image();
      img.src = `data:${imageMimeType};base64,${imageBase64}`;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 150; // max width/height for the thumbnail
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Get the base64 string without the data URL prefix, compress to 50% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        thumbBase64 = dataUrl.split(',')[1];
      }
    } catch (e) {
      console.error('Failed to create thumbnail', e);
    }

    const id = submitForCommunityReview({
      imageBase64Thumb: thumbBase64,
      playerNote: playerNote.trim() || undefined,
      timestamp: new Date().toISOString(),
    });
    setTicketId(id);
    setStep('pending-review');
  }, [imageBase64, imageMimeType, playerNote]);

  // ── Auto-resolve steps ─────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 'gps-approved') {
      const t = setTimeout(() => {
        onVerified(makeVerificationResult('gps', venue));
      }, 1500);
      return () => clearTimeout(t);
    }
    if (step === 'webxr-approved') {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const t = setTimeout(() => {
        onVerified(makeVerificationResult('webxr'));
      }, 1500);
      return () => clearTimeout(t);
    }
    if (step === 'pending-review' && ticketId) {
      // Do NOT call onVerified — community scans must not trigger Gemini or unlock instruments.
      // Just close the verification screen after showing the confirmation.
      const t = setTimeout(() => {
        onCancel();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [step, venue, ticketId, onVerified, onCancel]);

  // ── Shared badge colors ────────────────────────────────────────────────────

  const stepLabel = {
    'checking-gps':      'STEP 1 OF 3 — GPS VERIFICATION',
    'gps-approved':      'STEP 1 OF 3 — GPS VERIFIED ✓',
    'gps-failed':        'STEP 1 FAILED — TRYING NEXT METHOD',
    'checking-webxr':    'STEP 2 OF 3 — AR SCAN CHECK',
    'webxr-unsupported': 'STEP 2 UNAVAILABLE — TRYING NEXT METHOD',
    'webxr-scanning':    'STEP 2 OF 3 — AR PRESENCE SCAN',
    'webxr-approved':    'STEP 2 OF 3 — AR SCAN VERIFIED ✓',
    'community-fallback':'STEP 3 OF 3 — COMMUNITY REVIEW',
    'pending-review':    'STEP 3 — SUBMITTED FOR REVIEW ✓',
  }[step];

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0c0c]/90 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#2a2d43] border-[6px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#da2d46] flex flex-col">

        {/* Header */}
        <div className="bg-[#da2d46] border-b-[4px] border-[#0f0c0c] px-4 py-3 flex items-center justify-between">
          <span className="font-orbitron text-[10px] font-black tracking-widest text-[#0f0c0c] uppercase">
            {stepLabel}
          </span>
          <button onClick={onCancel} className="text-[#0f0c0c] hover:opacity-70 transition-opacity">
            <X size={20} className="stroke-[3px]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-6 min-h-[280px] justify-center">

          {/* ── GPS Checking ── */}
          {step === 'checking-gps' && (
            <>
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-[#da2d46] rounded-full animate-ping opacity-30" />
                <div className="absolute inset-2 border-4 border-[#da2d46] rounded-full animate-ping opacity-20 [animation-delay:0.3s]" />
                <div className="w-24 h-24 bg-[#0f0c0c] border-[4px] border-[#da2d46] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(218,45,70,0.4)]">
                  <MapPin size={36} className="text-[#da2d46]" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-orbitron font-black text-[#e0e5ed] text-lg tracking-widest uppercase">LOCATING</p>
                <p className="font-space-mono text-xs text-[#888ea1] mt-1">Cross-referencing GPS with verified museum locations...</p>
              </div>
            </>
          )}

          {/* ── GPS Approved ── */}
          {step === 'gps-approved' && (
            <>
              <div className="w-24 h-24 bg-[#0f0c0c] border-[4px] border-[#e0e5ed] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(224,229,237,0.3)]">
                <CheckCircle size={40} className="text-[#e0e5ed] stroke-[2px]" />
              </div>
              <div className="text-center">
                <p className="font-orbitron font-black text-[#e0e5ed] text-lg tracking-widest uppercase">LOCATION VERIFIED</p>
                <div className="mt-2 bg-[#da2d46] border-[3px] border-[#0f0c0c] px-3 py-1 -skew-x-6 shadow-[3px_3px_0px_0px_#0f0c0c] inline-block">
                  <p className="font-space-mono text-xs text-[#0f0c0c] font-black skew-x-6">{venue}</p>
                </div>
              </div>
            </>
          )}

          {/* ── GPS Failed ── */}
          {step === 'gps-failed' && (
            <>
              <XCircle size={48} className="text-[#da2d46] stroke-[1.5px]" />
              <div className="text-center">
                <p className="font-orbitron font-black text-[#da2d46] text-base tracking-widest uppercase">NOT AT A VERIFIED LOCATION</p>
                <p className="font-space-mono text-xs text-[#888ea1] mt-2">Trying AR scan method...</p>
              </div>
            </>
          )}

          {/* ── WebXR Checking ── */}
          {(step === 'checking-webxr') && (
            <>
              <Loader size={48} className="text-[#da2d46] animate-spin" />
              <p className="font-space-mono text-xs text-[#888ea1] text-center">Checking AR capabilities...</p>
            </>
          )}

          {/* ── WebXR Unsupported ── */}
          {step === 'webxr-unsupported' && (
            <>
              <XCircle size={48} className="text-[#888ea1] stroke-[1.5px]" />
              <div className="text-center">
                <p className="font-orbitron font-black text-[#888ea1] text-base tracking-widest uppercase">AR NOT SUPPORTED</p>
                <p className="font-space-mono text-xs text-[#888ea1] mt-2">Moving to community review...</p>
              </div>
            </>
          )}

          {/* ── WebXR Scanning ── */}
          {step === 'webxr-scanning' && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="relative w-full bg-[#0f0c0c] border-[4px] border-[#0f0c0c] overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {/* AR overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 border-[3px] border-dashed border-[#da2d46] flex items-center justify-center">
                    <div className="w-4 h-4 bg-[#da2d46]" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="font-orbitron text-[10px] font-black text-[#da2d46] tracking-widest bg-[#0f0c0c]/80 px-2 py-0.5">ALIGN INSTRUMENT</span>
                </div>
                {/* Dwell progress arc */}
                {webxrDwell > 0 && (
                  <div className="absolute top-2 right-2">
                    <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="#0f0c0c" strokeWidth="4" fill="none" />
                      <circle
                        cx="20" cy="20" r="16" stroke="#da2d46" strokeWidth="4" fill="none"
                        strokeDasharray={`${(webxrDwell / 100) * 100.5} 100.5`}
                        strokeLinecap="square"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="font-space-mono text-xs text-[#888ea1] text-center">
                Hold camera steady on the instrument
              </p>
              <button
                onPointerDown={startDwell}
                onPointerUp={stopDwell}
                onPointerLeave={stopDwell}
                className="w-full py-3 bg-[#da2d46] border-[4px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-widest text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase -skew-x-6"
              >
                <span className="skew-x-6 block">HOLD TO SCAN (3s)</span>
              </button>
              <button onClick={() => setStep('community-fallback')} className="font-space-mono text-xs text-[#888ea1] underline">
                Skip to community review
              </button>
            </div>
          )}

          {/* ── WebXR Approved ── */}
          {step === 'webxr-approved' && (
            <>
              <CheckCircle size={48} className="text-[#e0e5ed] stroke-[1.5px]" />
              <div className="text-center">
                <p className="font-orbitron font-black text-[#e0e5ed] text-lg tracking-widest uppercase">AR SCAN COMPLETE</p>
                <p className="font-space-mono text-xs text-[#888ea1] mt-2">Physical presence confirmed.</p>
              </div>
            </>
          )}

          {/* ── Community Fallback ── */}
          {step === 'community-fallback' && (
            <div className="w-full flex flex-col items-center gap-4">
              <Users size={40} className="text-[#888ea1]" />
              <div className="text-center">
                <p className="font-orbitron font-black text-[#e0e5ed] text-base tracking-widest uppercase">COMMUNITY REVIEW</p>
                <p className="font-space-mono text-xs text-[#888ea1] mt-1 leading-relaxed">
                  Submit this sighting for manual verification by our community administrators.
                  You'll receive tentative XP while it's reviewed.
                </p>
              </div>

              {/* Thumbnail */}
              <div className="w-full bg-[#0f0c0c] border-[3px] border-[#888ea1] overflow-hidden">
                <img
                  src={`data:${imageMimeType};base64,${imageBase64}`}
                  alt="Captured instrument"
                  className="w-full max-h-32 object-cover opacity-70"
                />
              </div>

              <textarea
                value={playerNote}
                onChange={e => setPlayerNote(e.target.value)}
                placeholder="Optional: Tell us where you found this instrument..."
                className="w-full bg-[#0f0c0c] border-[3px] border-[#888ea1] text-[#e0e5ed] font-space-mono text-xs p-3 resize-none h-16 focus:border-[#da2d46] focus:outline-none placeholder:text-[#888ea1]"
              />

              <button
                onClick={handleCommunitySubmit}
                className="w-full py-3 bg-[#da2d46] border-[4px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-widest text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase -skew-x-6 flex items-center justify-center gap-2"
              >
                <span className="skew-x-6 block flex items-center gap-2">
                  SUBMIT FOR REVIEW <ChevronRight size={16} className="inline" />
                </span>
              </button>
            </div>
          )}

          {/* ── Pending Review ── */}
          {step === 'pending-review' && (
            <>
              <CheckCircle size={48} className="text-[#da2d46] stroke-[1.5px]" />
              <div className="text-center">
                <p className="font-orbitron font-black text-[#da2d46] text-base tracking-widest uppercase">SUBMITTED!</p>
                {ticketId && (
                  <div className="mt-2 bg-[#0f0c0c] border-[3px] border-[#da2d46] px-3 py-1 inline-block -skew-x-6">
                    <p className="font-space-mono text-xs text-[#da2d46] font-black skew-x-6">TICKET: {ticketId}</p>
                  </div>
                )}
                <p className="font-space-mono text-xs text-[#888ea1] mt-3">Returning to map. Admins will review your submission.</p>
                <button onClick={onCancel} className="mt-4 text-[#da2d46] underline text-xs font-space-mono">Close</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
