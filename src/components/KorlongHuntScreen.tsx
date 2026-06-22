import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, MapPin, RefreshCw, Star } from 'lucide-react';
import { KorlongCutscene } from './KorlongCutscene';
import visayasMap from '../assets/png/visayas_map.png';
import {
  loadKorlongSpawn,
  generateKorlongSpawn,
  clearKorlongSpawn,
  haversineDistanceMeters,
  type KorlongSpawn,
} from '../services/verificationService';

interface KorlongHuntScreenProps {
  onBack: () => void;
  onDiscovered: () => void;
}

const DISCOVERY_RADIUS_METERS = 5;
const RETRY_COOLDOWN_SECONDS = 60;

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Bearing from player to target in degrees (0 = North) */
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

type HuntState = 'no-gps' | 'locating' | 'no-spawn' | 'hunting' | 'discovered';

export function KorlongHuntScreen({ onBack, onDiscovered }: KorlongHuntScreenProps) {
  const [huntState, setHuntState] = useState<HuntState>('locating');
  const [spawn, setSpawn] = useState<KorlongSpawn | null>(null);
  const [playerCoords, setPlayerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(Infinity);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Audio Management ───────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio('/audio/korlong_music.mp3');
    audio.loop = false; // Manually loop specific segments
    audioRef.current = audio;
    if (typeof window !== 'undefined') {
      (window as any).korlongHuntAudio = audio;
    }
    
    audio.play().catch(e => console.log('Audio autoplay prevented:', e));
    
    return () => {
      // Only pause if the user is backing out. If discovered, let it persist to the next screen!
      if (!discoveredRef.current) {
        audio.pause();
        audioRef.current = null;
        if (typeof window !== 'undefined') {
          (window as any).korlongHuntAudio = null;
        }
      }
    };
  }, []);

  const watchIdRef = useRef<number | null>(null);
  const discoveredRef = useRef(false);

  // ── Device orientation for compass ────────────────────────────────────────

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setDeviceHeading(e.alpha);
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // ── GPS watch ─────────────────────────────────────────────────────────────

  const onGpsPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude } = pos.coords;
    setPlayerCoords({ lat: latitude, lng: longitude });

    // Try to load or generate spawn
    setSpawn(prev => {
      const active = prev ?? loadKorlongSpawn();
      if (active) {
        const dist = haversineDistanceMeters(latitude, longitude, active.lat, active.lng);
        setDistanceMeters(dist);
        setHuntState('hunting');
        return active;
      }

      // No existing spawn — attempt generation
      const generated = generateKorlongSpawn(pos.coords);
      if (generated) {
        const dist = haversineDistanceMeters(latitude, longitude, generated.lat, generated.lng);
        setDistanceMeters(dist);
        setHuntState('hunting');
        return generated;
      }

      setHuntState('no-spawn');
      return null;
    });
  }, [onDiscovered]);

  const onGpsError = useCallback(() => {
    setHuntState('no-gps');
  }, []);

  // ── Discovery Check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (distanceMeters <= DISCOVERY_RADIUS_METERS && !discoveredRef.current && huntState === 'hunting') {
      discoveredRef.current = true;
      setShowDiscovery(true);
      clearKorlongSpawn();
    }
  }, [distanceMeters, huntState]);

  const handleCutsceneComplete = useCallback(() => {
    setHuntState('discovered');
    onDiscovered();
  }, [onDiscovered]);

  useEffect(() => {
    // ── DEMO MODE INTERCEPT ──
    if (localStorage.getItem('echoes_korlong_demo_mode') === '1') {
      const demoLocations = [
        {
          name: 'Basey, Samar',
          significance: 'Ancient abaca trade hub',
          lat: 11.2729,
          lng: 125.7360,
          loreFragment: 'Near the 17th-century St. Michael the Archangel Church, faint echoes of an ancient two-stringed fiddle remain.'
        },
        {
          name: 'Guiuan, Eastern Samar',
          significance: 'Historic coastal town',
          lat: 11.0333,
          lng: 125.7222,
          loreFragment: 'Amidst the historic Guiuan Church ruins, whispers of the Korlong echo through the sea breeze.'
        },
        {
          name: 'Tacloban City, Leyte',
          significance: 'Cultural center',
          lat: 11.2430,
          lng: 125.0081,
          loreFragment: 'Near the San Juanico bridge, locals say the Korlong was once played to appease the river spirits.'
        },
        {
          name: 'Palo, Leyte',
          significance: 'Religious heritage',
          lat: 11.1594,
          lng: 124.9892,
          loreFragment: 'Behind the Palo Cathedral, ancient strings were once plucked during evening vigils.'
        }
      ];

      const randomLoc = demoLocations[Math.floor(Math.random() * demoLocations.length)];

      setHuntState('hunting');
      setPlayerCoords({ lat: randomLoc.lat, lng: randomLoc.lng });
      setSpawn({
        lat: randomLoc.lat + 0.00052, // Approx 58m North
        lng: randomLoc.lng, 
        expiresAt: Date.now() + 25 * 60 * 1000,
        nearSite: {
          name: randomLoc.name,
          significance: randomLoc.significance,
          lat: randomLoc.lat,
          lng: randomLoc.lng,
          spawnRadiusMeters: 500,
          loreFragment: randomLoc.loreFragment
        }
      });

      // Animate the player walking towards it to trigger discovery
      let d = 58;
      setDistanceMeters(d);
      const interval = setInterval(() => {
        d -= 4;
        setDistanceMeters(d);
        if (d <= 0) clearInterval(interval);
      }, 1000);

      return () => clearInterval(interval);
    }

    if (!navigator.geolocation) {
      setHuntState('no-gps');
      return;
    }

    // First try to load an existing spawn
    const existing = loadKorlongSpawn();
    if (existing) {
      setSpawn(existing);
      setHuntState('hunting');
    }

    watchIdRef.current = navigator.geolocation.watchPosition(onGpsPosition, onGpsError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [onGpsPosition, onGpsError]);

  // ── Retry button countdown ─────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    if (!playerCoords || retryCountdown > 0) return;
    const generated = generateKorlongSpawn({
      latitude: playerCoords.lat,
      longitude: playerCoords.lng,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    } as GeolocationCoordinates);

    if (generated) {
      setSpawn(generated);
      const dist = haversineDistanceMeters(playerCoords.lat, playerCoords.lng, generated.lat, generated.lng);
      setDistanceMeters(dist);
      setHuntState('hunting');
    } else {
      setRetryCountdown(RETRY_COOLDOWN_SECONDS);
    }
  }, [playerCoords, retryCountdown]);

  useEffect(() => {
    if (retryCountdown <= 0) return;
    const t = setInterval(() => setRetryCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [retryCountdown]);

  // ── Compass bearing ────────────────────────────────────────────────────────

  const compassRotation = (() => {
    if (!playerCoords || !spawn) return 0;
    const bearing = bearingDeg(playerCoords.lat, playerCoords.lng, spawn.lat, spawn.lng);
    return bearing - deviceHeading;
  })();

  // ── Distance tiers ─────────────────────────────────────────────────────────

  const getTier = () => {
    if (distanceMeters <= 30) return 'arrived';
    if (distanceMeters <= 400) return 'close';
    if (distanceMeters <= 1000) return 'near';
    return 'far';
  };

  const tier = getTier();
  const tierColor = { arrived: '#e0e5ed', close: '#da2d46', near: '#888ea1', far: '#2a2d43' }[tier];

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    
    const interval = setInterval(() => {
      // Let the music play out naturally to its climax during the cutscene
      if (showDiscovery) return;

      // Fast beats for close/arrived (20s to 40s), slow beats for far/near (0s to 20s)
      const isFast = tier === 'close' || tier === 'arrived';
      const minTime = isFast ? 20 : 0;
      const maxTime = isFast ? 40 : 20;

      if (audio.currentTime >= maxTime || audio.currentTime < minTime) {
        audio.currentTime = minTime;
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [tier, showDiscovery]);

  return (
    <div className="min-h-screen bg-[#2a2d43] flex flex-col relative overflow-hidden">

      {/* Map Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none mix-blend-screen"
        style={{ 
          backgroundImage: `url(${visayasMap})`, 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'sepia(100%) hue-rotate(310deg) saturate(300%) contrast(150%) brightness(80%)'
        }} 
      />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundImage: 'linear-gradient(rgba(218, 45, 70, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(218, 45, 70, 0.2) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* Radar sweep animation overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30 mix-blend-screen">
        <div className="absolute top-1/2 left-1/2 w-[150vw] h-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-[#da2d46]/20 animate-[spin_8s_linear_infinite]"
             style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(218,45,70,0.1) 80%, rgba(218,45,70,0.5) 100%)' }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-12 pb-4 flex items-center justify-between border-b-[6px] border-[#0f0c0c] bg-[#0f0c0c] shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-[#e0e5ed] border-4 border-[#da2d46] flex items-center justify-center text-[#0f0c0c] shadow-[4px_4px_0px_0px_#da2d46] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all -skew-x-6"
        >
          <ChevronLeft size={22} className="skew-x-6 stroke-[3px]" />
        </button>

        <div className="text-center">
          <h1 className="font-orbitron text-xl font-black tracking-widest text-[#da2d46] uppercase"
            style={{ textShadow: '2px 2px 0px #0f0c0c' }}>
            KORLONG HUNT
          </h1>
          <p className="font-space-mono text-[10px] text-[#888ea1] tracking-widest uppercase">★ LEGENDARY INSTRUMENT</p>
        </div>

        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 py-8 relative z-10">

        {/* ── No GPS ── */}
        {huntState === 'no-gps' && (
          <div className="text-center space-y-4">
            <MapPin size={56} className="text-[#888ea1] mx-auto" />
            <p className="font-orbitron font-black text-[#da2d46] text-lg tracking-widest uppercase">GPS UNAVAILABLE</p>
            <p className="font-space-mono text-sm text-[#888ea1] leading-relaxed">
              Enable location services to hunt for the Korlong.
              This device or browser doesn't have GPS access.
            </p>
          </div>
        )}

        {/* ── Locating ── */}
        {huntState === 'locating' && (
          <div className="text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-[#da2d46] rounded-full animate-ping opacity-30" />
              <div className="w-20 h-20 bg-[#0f0c0c] border-[4px] border-[#da2d46] rounded-full flex items-center justify-center">
                <MapPin size={28} className="text-[#da2d46]" />
              </div>
            </div>
            <p className="font-orbitron font-black text-[#e0e5ed] tracking-widest uppercase">ACQUIRING SIGNAL...</p>
            <p className="font-space-mono text-xs text-[#888ea1]">Checking for Korlong presence in your area</p>
          </div>
        )}

        {/* ── No Spawn ── */}
        {huntState === 'no-spawn' && (
          <div className="text-center space-y-6 w-full">
            <div className="bg-[#0f0c0c] border-[4px] border-[#da2d46] p-6 -skew-x-2 shadow-[6px_6px_0px_0px_#da2d46]">
              <p className="font-orbitron font-black text-[#da2d46] text-base tracking-widest uppercase skew-x-2">NO SIGNAL DETECTED</p>
              <p className="font-space-mono text-xs text-[#888ea1] mt-2 skew-x-2 leading-relaxed">
                The Korlong hasn't manifested nearby. It appears more frequently near sites of
                historical significance in Eastern Visayas. Keep moving and try again.
              </p>
            </div>

            <button
              onClick={handleRetry}
              disabled={retryCountdown > 0}
              className={`w-full py-4 border-[4px] border-[#0f0c0c] font-orbitron font-black text-sm tracking-widest uppercase -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] transition-all flex items-center justify-center gap-3 ${
                retryCountdown > 0
                  ? 'bg-[#888ea1] text-[#2a2d43] cursor-not-allowed opacity-70'
                  : 'bg-[#da2d46] text-[#0f0c0c] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0f0c0c] active:translate-y-1 active:shadow-none'
              }`}
            >
              <RefreshCw size={18} className="skew-x-6" />
              <span className="skew-x-6">
                {retryCountdown > 0 ? `RETRY IN ${retryCountdown}s` : 'SEARCH AGAIN'}
              </span>
            </button>
          </div>
        )}

        {/* ── Hunting ── */}
        {huntState === 'hunting' && spawn && (
          <div className="w-full flex flex-col items-center gap-6">

            {/* Lore fragment (only if near a historical site) */}
            {spawn.nearSite && (
              <div className="w-full bg-[#0f0c0c] border-[4px] border-[#da2d46] p-4 -skew-x-1 shadow-[4px_4px_0px_0px_#da2d46]">
                <p className="font-space-mono text-[10px] text-[#da2d46] font-black uppercase tracking-wider mb-1 skew-x-1">
                  HISTORICAL RESONANCE — {spawn.nearSite.name.toUpperCase()}
                </p>
                <p className="font-space-mono text-xs text-[#f0dde0] italic skew-x-1 leading-relaxed">
                  {spawn.nearSite.loreFragment}
                </p>
              </div>
            )}

            {/* Compass */}
            <div className="relative mt-8 mb-6">
              {/* Radar rings */}
              <div className="absolute inset-0 rounded-full border-[2px] border-dashed border-[#da2d46]/40 animate-[spin_20s_linear_infinite_reverse] scale-[1.3]" />
              <div className="absolute inset-0 rounded-full border-[1px] border-[#888ea1]/20 scale-[1.6]" />
              
              {/* Outer ring */}
              <div
                className="w-64 h-64 rounded-full border-[8px] border-[#0f0c0c] flex items-center justify-center shadow-[0_0_40px_rgba(218,45,70,0.4)] relative bg-[#0f0c0c]/90 backdrop-blur-md"
              >
                {/* Cardinal labels */}
                {['N', 'E', 'S', 'W'].map((dir, i) => {
                  const angle = i * 90;
                  const rad = ((angle - 90) * Math.PI) / 180;
                  const r = 90; // radius from center
                  return (
                    <span
                      key={dir}
                      className="absolute font-orbitron font-black text-sm text-[#888ea1] z-10"
                      style={{ 
                        left: `calc(50% + ${r * Math.cos(rad)}px)`, 
                        top: `calc(50% + ${r * Math.sin(rad)}px)`, 
                        transform: 'translate(-50%, -50%)' 
                      }}
                    >
                      {dir}
                    </span>
                  );
                })}

                {/* Compass markers */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute w-1 h-3 bg-[#da2d46]/50" 
                    style={{ 
                      top: '50%', left: '50%',
                      transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-106px)` 
                    }} 
                  />
                ))}

                {/* Needle Container - Rotates to bearing */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${compassRotation}deg)` }}
                >
                   {/* Cool Sci-fi Needle */}
                   <div className="absolute top-6 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[50px] border-l-transparent border-r-transparent border-b-[#da2d46] filter drop-shadow-[0_0_12px_#da2d46]" />
                   <div className="absolute top-[56px] w-2 h-[72px] bg-gradient-to-b from-[#da2d46] to-transparent" />
                </div>
                
                {/* Center node */}
                <div className="absolute w-8 h-8 bg-[#e0e5ed] border-[6px] border-[#da2d46] rounded-full shadow-[0_0_20px_#da2d46]" />

                {tier === 'arrived' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#da2d46]/30 rounded-full backdrop-blur-sm animate-pulse">
                    <Star size={70} className="text-[#e0e5ed] fill-[#e0e5ed]" style={{ filter: 'drop-shadow(0 0 15px #e0e5ed)' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Distance display */}
            <div
              className="bg-[#0f0c0c] border-[4px] px-8 py-3 -skew-x-6 shadow-[6px_6px_0px_0px_#0f0c0c] text-center"
              style={{ borderColor: tierColor }}
            >
              <p className="font-orbitron font-black text-3xl skew-x-6" style={{ color: tierColor }}>
                {distanceMeters === Infinity ? '---' : formatDistance(distanceMeters)}
              </p>
              <p className="font-space-mono text-[10px] text-[#888ea1] skew-x-6 uppercase tracking-widest mt-1">
                {tier === 'arrived' ? 'YOU\'VE ARRIVED' : tier === 'close' ? 'GETTING CLOSE' : tier === 'near' ? 'SIGNAL DETECTED' : 'KEEP MOVING'}
              </p>
            </div>

            {/* Spawn expiry hint */}
            {spawn && (
              <p className="font-space-mono text-[10px] text-[#888ea1] text-center">
                Signal active for {Math.round((spawn.expiresAt - Date.now()) / 60000)}min · Compass points to spawn
              </p>
            )}
          </div>
        )}

        {/* ── Cinematic Discovery Cutscene ── */}
        {showDiscovery && (
          <KorlongCutscene onComplete={handleCutsceneComplete} />
        )}
      </div>

      {/* Bottom info */}
      {huntState === 'hunting' && !showDiscovery && (
        <div className="relative z-10 border-t-[4px] border-[#0f0c0c] bg-[#0f0c0c] px-6 py-3">
          <p className="font-space-mono text-[10px] text-[#888ea1] text-center leading-relaxed">
            The Korlong can spawn anywhere, but appears 75% more often near historical Eastern Visayas sites.
            Discovery requires reaching within 30m of the spawn point.
          </p>
        </div>
      )}
    </div>
  );
}
