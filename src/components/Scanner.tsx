import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, ChevronRight, ChevronLeft, X } from 'lucide-react';
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
    // Base Container uses Dark Slate
    <div className="min-h-screen bg-[#2a2d43] flex flex-col items-center justify-start px-4 pt-12 pb-20 relative z-0 overflow-hidden">

      {/* Halftone Dot Pattern Background */}
      <div 
        className="absolute inset-0 z-[-3] opacity-30 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#da2d46 2px, transparent 2px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Dynamic Background Speed Slashes */}
      <div className="absolute top-0 left-0 w-[120%] h-[50%] bg-[#da2d46] -skew-y-6 -translate-y-20 z-[-2] border-b-[8px] border-[#0f0c0c]" />

      {/* Tactile Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 md:top-8 md:left-8 w-12 h-12 bg-[#e0e5ed] border-[4px] border-[#0f0c0c] flex items-center justify-center text-[#0f0c0c] shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_0px_#0f0c0c] transition-all -skew-x-6 z-50"
      >
        <ChevronLeft size={28} className="skew-x-6 stroke-[3px]" />
      </button>

      {/* Header Panel */}
      <div className="w-full max-w-md text-center mb-8 mt-12 md:mt-6 relative z-10">
        <div className="inline-block bg-[#0f0c0c] border-[3px] border-[#e0e5ed] px-4 py-1 mb-4 -skew-x-6 shadow-[4px_4px_0px_0px_#e0e5ed]">
          <span className="text-[#e0e5ed] text-xs font-space-mono font-bold tracking-widest uppercase skew-x-6 block">
            AI Game On! Hackathon
          </span>
        </div>
        
        <h1 
          className="font-orbitron text-4xl md:text-5xl font-black text-[#0f0c0c] mb-2 tracking-wider leading-tight uppercase"
          style={{ textShadow: '4px 4px 0px #e0e5ed, -2px 0px 0px #da2d46' }}
        >
          ECHOES OF THE<br />ANCESTORS
        </h1>
        
        <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-3 -skew-x-2 shadow-[6px_6px_0px_0px_#da2d46] mx-auto w-fit mt-4">
          <p className="text-[#f0dde0] text-sm md:text-base font-space-mono font-bold skew-x-2">
            Target a traditional instrument.
          </p>
        </div>
      </div>

      {/* Camera / Upload Zone */}
      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="bg-[#e0e5ed] border-[6px] border-[#0f0c0c] shadow-[12px_12px_0px_0px_#0f0c0c] p-2">

          {/* Image Preview Panel */}
          {previewUrl && !cameraActive && (
            <div className="relative border-[4px] border-[#0f0c0c] overflow-hidden bg-[#0f0c0c]">
              <img src={previewUrl} alt="Captured instrument" className="w-full object-cover max-h-80 opacity-90" />
              
              {/* Comic-style Viewfinder Overlay */}
              <div className="absolute inset-0 pointer-events-none border-[8px] border-[#da2d46] mix-blend-overlay" />
              
              <button
                id="retake-btn"
                onClick={() => { setPreviewUrl(null); setCapturedData(null); }}
                className="absolute top-4 right-4 bg-[#e0e5ed] border-[3px] border-[#0f0c0c] text-[#0f0c0c] font-black font-space-mono px-4 py-2 -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase"
              >
                <span className="skew-x-6 block">RETAKE</span>
              </button>
              
              <div className="absolute bottom-4 left-4 bg-[#da2d46] border-[3px] border-[#0f0c0c] text-[#0f0c0c] font-black font-space-mono px-4 py-2 -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] uppercase">
                <span className="skew-x-6 block">DATA SECURED</span>
              </div>
            </div>
          )}

          {/* Live Camera Viewfinder */}
          {cameraActive && (
            <div className="relative border-[4px] border-[#0f0c0c] overflow-hidden bg-[#0f0c0c]">
              <video ref={videoRef} className="w-full max-h-80 object-cover" playsInline muted autoPlay />
              
              {/* Heavy Crosshair Viewfinder */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border-[4px] border-dashed border-[#da2d46]" />
                <div className="absolute inset-x-0 bottom-6 text-center bg-[#0f0c0c] border-y-[4px] border-[#da2d46] py-1">
                  <span className="text-[#e0e5ed] text-xs font-orbitron font-black uppercase tracking-widest">
                    ALIGN TARGET
                  </span>
                </div>
              </div>

              {/* Shutter Controls */}
              <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center gap-8 z-20">
                <button
                  id="cancel-camera-btn"
                  onClick={stopCamera}
                  className="w-12 h-12 bg-[#e0e5ed] border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-black font-space-mono flex items-center justify-center -skew-x-6 shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
                >
                  <X size={24} className="skew-x-6 stroke-[3px]" />
                </button>
                
                {/* Heavy Shutter Button */}
                <button
                  id="capture-btn"
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-[#da2d46] border-[6px] border-[#0f0c0c] flex items-center justify-center -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all"
                >
                  <div className="w-8 h-8 bg-[#0f0c0c] rounded-sm skew-x-6" />
                </button>
                
                <div className="w-12 h-12" /> {/* Layout spacer */}
              </div>
            </div>
          )}

          {/* Idle — Camera/Upload Choice */}
          {!cameraActive && !previewUrl && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`p-8 text-center transition-colors border-[4px] border-[#0f0c0c] ${dragOver ? 'bg-[#da2d46]/20' : 'bg-[#e0e5ed]'}`}
            >
              
              {/* Static Graphic Icon */}
              <div className="w-24 h-24 mx-auto mb-6 bg-[#0f0c0c] border-[4px] border-[#da2d46] flex items-center justify-center -skew-x-6 shadow-[6px_6px_0px_0px_#da2d46]">
                <Camera size={40} className="text-[#f0dde0] skew-x-6" />
              </div>

              <div className="bg-[#0f0c0c] px-4 py-2 border-[3px] border-[#0f0c0c] mb-6">
                <p className="text-[#f0dde0] text-sm font-space-mono font-bold uppercase tracking-widest">
                  Acquire Instrument Data
                </p>
              </div>

              {cameraError && (
                <div className="mb-6 bg-[#da2d46] border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-black font-space-mono p-3 -skew-x-2 shadow-[4px_4px_0px_0px_#0f0c0c]">
                  <span className="skew-x-2 block uppercase">{cameraError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  id="open-camera-btn"
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#da2d46] border-[4px] border-[#0f0c0c] text-[#0f0c0c] text-sm font-orbitron font-black tracking-widest -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase"
                >
                  <Camera size={20} className="skew-x-6" /> <span className="skew-x-6">SCAN</span>
                </button>
                
                <button
                  id="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#2a2d43] border-[4px] border-[#0f0c0c] text-[#e0e5ed] text-sm font-orbitron font-black tracking-widest -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all uppercase"
                >
                  <Upload size={20} className="skew-x-6" /> <span className="skew-x-6">UPLOAD</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {/* Main Action CTA */}
      <div className="w-full max-w-md relative z-10 mt-auto">
        <button
          id="scan-instrument-btn"
          onClick={handleScan}
          disabled={!capturedData}
          className={`w-full py-5 border-[6px] border-[#0f0c0c] font-orbitron text-lg font-black tracking-widest uppercase flex items-center justify-center gap-3 -skew-x-6 transition-all duration-200 ${
            capturedData 
              ? 'bg-[#da2d46] text-[#0f0c0c] shadow-[8px_8px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_#0f0c0c] active:translate-y-2 active:translate-x-2 active:shadow-none cursor-pointer' 
              : 'bg-[#888ea1] text-[#2a2d43] shadow-[4px_4px_0px_0px_#0f0c0c] cursor-not-allowed opacity-80'
          }`}
        >
          <span className="skew-x-6 block">IDENTIFY & PLAY</span>
          <ChevronRight size={24} className="skew-x-6 stroke-[3px]" />
        </button>
      </div>

    </div>
  );
}