import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, ChevronRight } from 'lucide-react';

interface ScannerProps {
  onImageReady: (base64: string, mimeType: string) => void;
}

export function Scanner({ onImageReady }: ScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedData, setCapturedData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCameraError(null);
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
          ? 'Camera permission denied. Please use Upload instead.'
          : 'Camera not available — try uploading a photo.'
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
    setCapturedData({ base64, mimeType: 'image/jpeg' });
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
      setCapturedData({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Cleanup camera on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Bind camera stream when active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.error('[Scanner] Failed to play video stream:', err);
      });
    }
  }, [cameraActive]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleScan = useCallback(() => {
    if (!capturedData) return;
    onImageReady(capturedData.base64, capturedData.mimeType);
  }, [capturedData, onImageReady]);

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-start px-4 pt-10 pb-20">

      {/* Header */}
      <div className="w-full max-w-md text-center mb-10">
        <div className="text-teal text-xs font-space-mono tracking-widest mb-3 uppercase">
          ✦ AI Game On! Hackathon ✦
        </div>
        <h1 className="font-orbitron text-3xl font-black text-cyan mb-2 tracking-wider glow-cyan leading-tight">
          ECHOES OF THE<br />ANCESTORS
        </h1>
        <p className="text-silver/60 text-sm font-space-mono leading-relaxed">
          Point your camera at a traditional<br />
          Philippine instrument to begin
        </p>
      </div>

      {/* Camera / Upload Zone */}
      <div className="w-full max-w-md mb-6">
        <div className="glass-card rounded-2xl border border-teal/20 overflow-hidden">

          {/* Image Preview */}
          {previewUrl && !cameraActive && (
            <div className="relative">
              <img src={previewUrl} alt="Captured instrument" className="w-full object-cover max-h-72" />
              {/* Cyan border overlay */}
              <div className="absolute inset-0 border-4 border-cyan/30 rounded-t-2xl pointer-events-none" />
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-cyan pointer-events-none" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-cyan pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-cyan pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-cyan pointer-events-none" />
              <button
                id="retake-btn"
                onClick={() => { setPreviewUrl(null); setCapturedData(null); }}
                className="absolute top-3 right-10 bg-obsidian/80 border border-danger/40 text-danger text-xs font-space-mono px-3 py-1 rounded-lg"
              >
                RETAKE
              </button>
              <div className="absolute bottom-3 left-3 bg-obsidian/80 border border-cyan/30 text-cyan text-xs font-space-mono px-3 py-1 rounded-lg">
                ✓ Ready to analyze
              </div>
            </div>
          )}

          {/* Live Camera Viewfinder */}
          {cameraActive && (
            <div className="relative">
              <video ref={videoRef} className="w-full max-h-72 object-cover" playsInline muted autoPlay />
              {/* Viewfinder overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-dashed border-cyan/60 rounded-xl" />
                <div className="absolute top-10 left-10 w-5 h-5 border-t-2 border-l-2 border-cyan" />
                <div className="absolute top-10 right-10 w-5 h-5 border-t-2 border-r-2 border-cyan" />
                <div className="absolute bottom-20 left-10 w-5 h-5 border-b-2 border-l-2 border-cyan" />
                <div className="absolute bottom-20 right-10 w-5 h-5 border-b-2 border-r-2 border-cyan" />
                <div className="absolute inset-x-0 bottom-14 text-center text-cyan/60 text-xs font-space-mono">
                  FRAME THE INSTRUMENT
                </div>
              </div>
              {/* Shutter button */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6">
                <button
                  id="cancel-camera-btn"
                  onClick={stopCamera}
                  className="w-10 h-10 rounded-full bg-obsidian/70 border border-silver/30 text-silver text-xs font-space-mono flex items-center justify-center"
                >
                  ✕
                </button>
                <button
                  id="capture-btn"
                  onClick={capturePhoto}
                  className="w-18 h-18 rounded-full bg-cyan/20 border-4 border-cyan shadow-lg shadow-cyan/40 flex items-center justify-center active:scale-90 transition-transform"
                  style={{ width: 72, height: 72 }}
                >
                  <div className="w-12 h-12 rounded-full bg-cyan" />
                </button>
                <div className="w-10 h-10" /> {/* spacer */}
              </div>
            </div>
          )}

          {/* Idle — Camera/Upload Choice */}
          {!cameraActive && !previewUrl && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`p-10 text-center transition-colors ${dragOver ? 'bg-teal/10' : ''}`}
            >
              {/* Animated instrument icon */}
              <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-teal/20 to-cyan/10 border-2 border-dashed border-teal/40 flex items-center justify-center pulse-glow">
                <Camera size={36} className="text-teal/70" />
              </div>

              <p className="text-silver/60 text-sm mb-1">
                Experience traditional Philippine instruments
              </p>
              <p className="text-silver/30 text-xs font-space-mono mb-6">
                Kulintang · Kudyapi · Gangsa · Agung · Babarak
              </p>

              {cameraError && (
                <div className="mb-5 text-danger text-xs font-space-mono bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
                  {cameraError}
                </div>
              )}

              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  id="open-camera-btn"
                  onClick={startCamera}
                  className="flex items-center gap-2 px-5 py-3 bg-teal/20 border border-teal/50 rounded-xl text-teal text-sm font-space-mono hover:bg-teal/30 active:scale-95 transition-all min-h-[44px]"
                >
                  <Camera size={18} /> CAMERA
                </button>
                <button
                  id="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-charcoal/60 border border-silver/20 rounded-xl text-silver text-sm font-space-mono hover:border-silver/40 active:scale-95 transition-all min-h-[44px]"
                >
                  <Upload size={18} /> UPLOAD
                </button>
              </div>

              <p className="text-silver/25 text-xs mt-5 font-space-mono">
                or drag & drop an image here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* CTA */}
      <div className="w-full max-w-md">
        <button
          id="scan-instrument-btn"
          onClick={handleScan}
          disabled={!capturedData}
          className="w-full py-4 rounded-xl font-orbitron text-sm font-bold tracking-widest uppercase
            bg-gradient-to-r from-teal to-cyan text-obsidian
            disabled:opacity-25 disabled:cursor-not-allowed
            enabled:hover:shadow-lg enabled:hover:shadow-cyan/40
            enabled:active:scale-[0.98]
            transition-all duration-200 flex items-center justify-center gap-3 min-h-[56px]"
        >
          IDENTIFY &amp; PLAY <ChevronRight size={20} />
        </button>
        {!capturedData && (
          <p className="text-center text-silver/30 text-xs mt-3 font-space-mono">
            Scan or upload an instrument photo first
          </p>
        )}
      </div>
    </div>
  );
}
