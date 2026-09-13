import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { MapPin, Users, Check as CheckCircle, Close as XCircle, Loader, ChevronRight } from 'pixelarticons/react';
import { PixelBar, PixelButton, PixelChip, PixelModal } from './ui';
import { cn } from '../lib/cn';
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

  // ── Step titles ────────────────────────────────────────────────────────────

  const stepLabel = {
    'checking-gps':      'Step 1 of 3 · Location check',
    'gps-approved':      'Step 1 of 3 · Location verified',
    'gps-failed':        'Step 1 · Trying another method',
    'checking-webxr':    'Step 2 of 3 · AR check',
    'webxr-unsupported': 'Step 2 · Trying another method',
    'webxr-scanning':    'Step 2 of 3 · AR scan',
    'webxr-approved':    'Step 2 of 3 · AR scan verified',
    'community-fallback':'Step 3 of 3 · Community review',
    'pending-review':    'Step 3 · Sent for review',
  }[step];

  return (
    <PixelModal onClose={onCancel} title="Verify your find" subtitle={stepLabel} icon={<MapPin />} maxWidth="max-w-sm">
      <div className="flex flex-col items-center gap-5 min-h-[260px] justify-center text-center" aria-live="polite">

        {step === 'checking-gps' && (
          <>
            <StatusIcon tone="gold"><MapPin className="animate-pulse" /></StatusIcon>
            <div>
              <p className="font-bold text-xl leading-none">Checking your location...</p>
              <p className="mt-2 text-sm text-parchment-300">Comparing your GPS with verified museum locations.</p>
            </div>
          </>
        )}

        {step === 'gps-approved' && (
          <>
            <StatusIcon tone="heal"><CheckCircle /></StatusIcon>
            <div className="flex flex-col items-center gap-2">
              <p className="font-bold text-xl leading-none">Location verified!</p>
              <PixelChip tone="gold">{venue}</PixelChip>
            </div>
          </>
        )}

        {step === 'gps-failed' && (
          <>
            <StatusIcon tone="dim"><XCircle /></StatusIcon>
            <div>
              <p className="font-bold text-xl leading-none">Not at a verified location</p>
              <p className="mt-2 text-sm text-parchment-300">Let's try an AR scan instead...</p>
            </div>
          </>
        )}

        {step === 'checking-webxr' && (
          <>
            <StatusIcon tone="gold"><Loader className="animate-spin" /></StatusIcon>
            <p className="text-sm text-parchment-300">Checking if your device supports AR...</p>
          </>
        )}

        {step === 'webxr-unsupported' && (
          <>
            <StatusIcon tone="dim"><XCircle /></StatusIcon>
            <div>
              <p className="font-bold text-xl leading-none">AR isn't available</p>
              <p className="mt-2 text-sm text-parchment-300">Moving to community review...</p>
            </div>
          </>
        )}

        {step === 'webxr-scanning' && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full px-frame px-frame-inset overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="size-32 border-[3px] border-dashed border-gold-300" />
              </div>
              {webxrDwell > 0 && (
                <div className="absolute inset-x-3 bottom-3">
                  <PixelBar kind="gold" height={8} segments={10} value={webxrDwell} transition="none" />
                </div>
              )}
            </div>
            <p className="text-sm text-parchment-300">Keep the camera steady on the instrument</p>
            <button
              type="button"
              onPointerDown={startDwell}
              onPointerUp={stopDwell}
              onPointerLeave={stopDwell}
              className="px-btn px-btn-primary w-full min-h-12 text-base"
            >
              Hold to Scan (3s)
            </button>
            <PixelButton size="sm" variant="ghost" onClick={() => setStep('community-fallback')}>
              Skip to community review
            </PixelButton>
          </div>
        )}

        {step === 'webxr-approved' && (
          <>
            <StatusIcon tone="heal"><CheckCircle /></StatusIcon>
            <div>
              <p className="font-bold text-xl leading-none">AR scan complete!</p>
              <p className="mt-2 text-sm text-parchment-300">We confirmed you're with the instrument.</p>
            </div>
          </>
        )}

        {step === 'community-fallback' && (
          <div className="w-full flex flex-col items-center gap-4">
            <StatusIcon tone="dim"><Users /></StatusIcon>
            <div>
              <p className="font-bold text-xl leading-none">Community review</p>
              <p className="mt-2 text-sm text-parchment-300">
                Send this find to our reviewers. You'll get starter XP while they check it.
              </p>
            </div>
            <div className="w-full px-frame px-frame-inset overflow-hidden">
              <img src={`data:${imageMimeType};base64,${imageBase64}`} alt="Captured instrument" className="w-full max-h-32 object-cover" />
            </div>
            <label className="w-full text-left">
              <span className="text-sm text-parchment-300">Where did you find it? (optional)</span>
              <textarea
                value={playerNote}
                onChange={e => setPlayerNote(e.target.value)}
                placeholder="e.g. a museum in Iloilo City"
                className="mt-1 w-full h-20 p-3 resize-none bg-plum-950 border-[3px] border-ink text-base text-parchment-100 placeholder:text-parchment-500 focus:border-gold-300 focus:outline-none"
              />
            </label>
            <PixelButton variant="primary" fullWidth icon={<ChevronRight />} onClick={handleCommunitySubmit}>
              Send for Review
            </PixelButton>
          </div>
        )}

        {step === 'pending-review' && (
          <>
            <StatusIcon tone="heal"><CheckCircle /></StatusIcon>
            <div className="flex flex-col items-center gap-2">
              <p className="font-bold text-xl leading-none">Sent!</p>
              {ticketId && <PixelChip tone="dark">Ticket {ticketId}</PixelChip>}
              <p className="text-sm text-parchment-300">Taking you back to the map. Reviewers will check your find.</p>
              <PixelButton size="sm" variant="ghost" sound="ui_back" onClick={onCancel}>Close</PixelButton>
            </div>
          </>
        )}
      </div>
    </PixelModal>
  );
}

function StatusIcon({ children, tone }: { children: ReactNode; tone: 'gold' | 'heal' | 'hp' | 'dim' }) {
  return (
    <span
      className={cn(
        'px-frame size-24 flex items-center justify-center [&_svg]:size-10',
        tone === 'gold' && 'bg-gold-500 text-ink',
        tone === 'heal' && 'bg-heal text-ink',
        tone === 'hp' && 'bg-hp text-parchment-100',
        tone === 'dim' && 'px-frame-inset text-parchment-500',
      )}
    >
      {children}
    </span>
  );
}
