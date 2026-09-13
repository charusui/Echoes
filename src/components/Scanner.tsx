import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Check, ChevronLeft, ChevronRight, Close as X, Reload, Upload } from 'pixelarticons/react';
import { PixelButton, PixelChip, PixelIconButton, PixelPanel } from './ui';
import { cn } from '../lib/cn';
import type { ScanMode } from '../types';

interface ScannerProps {
  onImageReady: (base64: string, mimeType: string, mode: ScanMode) => void;
  onBack: () => void;
}

export function Scanner({ onImageReady, onBack }: ScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedData, setCapturedData] = useState<{ base64: string; mimeType: string; mode: ScanMode } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
    
    // FIX: Guard against missing mediaDevices (prevents fatal crashes on HTTP/Webviews)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API not supported on this browser. Please use Upload.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera unavailable';
      setCameraError(
        msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Permission denied. Please use Upload.'
          : 'Camera unavailable — try uploading.'
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    setPreviewUrl(dataUrl);
    setCapturedData({ base64, mimeType: 'image/jpeg', mode: 'camera' });
    stopCamera();
  }, [stopCamera]);

  // ── File Upload / Drag-Drop ───────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setPreviewUrl(dataUrl);
      setCapturedData({ base64, mimeType: file.type, mode: 'upload' });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error('[Scanner] Failed to play video stream:', err);
      });
    }
  }, [cameraActive]);

  const handleScan = useCallback(() => {
    if (!capturedData) return;
    onImageReady(capturedData.base64, capturedData.mimeType, capturedData.mode);
  }, [capturedData, onImageReady]);

  return (
    <div className="min-h-screen bg-plum-950 flex flex-col items-center px-4 pt-6 pb-10">
      <header className="w-full max-w-md flex items-center justify-between gap-3 mb-6">
        <PixelIconButton icon={<ChevronLeft />} label="Back" sound="ui_back" onClick={onBack} />
        <h1 className="font-bold text-2xl leading-none text-parchment-100">Scan Instrument</h1>
        <span className="size-11" aria-hidden />
      </header>

      <p className="w-full max-w-md mb-4 text-center text-base text-parchment-300">
        Point your camera at a traditional instrument, or upload a photo.
      </p>

      <PixelPanel frame="wood" padding="sm" className="w-full max-w-md">
        {previewUrl && !cameraActive && (
          <div className="relative px-frame px-frame-inset overflow-hidden">
            <img src={previewUrl} alt="Captured instrument" className="w-full object-cover max-h-80" />
            <PixelButton
              id="retake-btn"
              size="sm"
              icon={<Reload />}
              className="absolute top-3 right-3"
              onClick={() => {
                setPreviewUrl(null);
                setCapturedData(null);
                // Reset the input so the same file can be re-uploaded
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Retake
            </PixelButton>
            <PixelChip tone="heal" icon={<Check />} className="absolute bottom-3 left-3">Photo ready</PixelChip>
          </div>
        )}

        {cameraActive && (
          <div className="relative px-frame px-frame-inset overflow-hidden">
            <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted autoPlay />
            <div className="absolute inset-6 border-[3px] border-dashed border-gold-300 pointer-events-none" />
            <p className="absolute top-3 inset-x-0 text-center text-sm font-semibold text-parchment-100 [text-shadow:0_2px_0_var(--color-ink)] pointer-events-none">
              Fit the instrument inside the frame
            </p>
            <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-6">
              <PixelIconButton id="cancel-camera-btn" icon={<X />} label="Cancel" sound="ui_back" onClick={stopCamera} />
              <button
                id="capture-btn"
                type="button"
                aria-label="Take photo"
                onClick={capturePhoto}
                className="px-btn px-btn-primary size-20 p-0 [&_svg]:size-8"
              >
                <Camera />
              </button>
              <span className="size-11" aria-hidden />
            </div>
          </div>
        )}

        {!cameraActive && !previewUrl && (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={cn('px-frame px-frame-inset flex flex-col items-center gap-5 p-6 text-center', dragOver && 'brightness-125')}
          >
            <div className="px-frame bg-xp size-24 flex items-center justify-center text-ink [&_svg]:size-12" style={{ ['--frame-bg' as string]: 'var(--color-xp)' }}>
              <Camera />
            </div>
            <p className="text-base text-parchment-300">Take a clear photo of the whole instrument.</p>

            {cameraError && (
              <p className="w-full px-frame px-frame-sm bg-hp px-3 py-2 text-sm font-semibold text-parchment-100" style={{ ['--frame-bg' as string]: 'var(--color-hp)' }}>
                {cameraError}
              </p>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <PixelButton id="open-camera-btn" variant="primary" size="lg" className="flex-1" icon={<Camera />} onClick={startCamera}>
                Use Camera
              </PixelButton>
              <PixelButton id="upload-btn" size="lg" className="flex-1" icon={<Upload />} onClick={() => fileInputRef.current?.click()}>
                Upload
              </PixelButton>
            </div>
            <p className="text-xs text-parchment-500">You can also drag a photo here.</p>
          </div>
        )}
      </PixelPanel>

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {capturedData && (
        <PixelButton
          id="scan-instrument-btn"
          variant="primary"
          size="lg"
          className="w-full max-w-md mt-6 px-rise-in"
          icon={<ChevronRight />}
          onClick={handleScan}
        >
          Identify & Play
        </PixelButton>
      )}
    </div>
  );
}
