import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, MapPin, Reload as RefreshCw, Star } from 'pixelarticons/react';
import { PixelButton, PixelIconButton, PixelPanel } from './ui';
import { cn } from '../lib/cn';
import { KorlongCutscene } from './KorlongCutscene';
import visayasMap from '../assets/png/visayas_map.png?v=2';
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

import { useGameOnAuth } from '../hooks/useGameOnAuth';

type HuntState = 'no-gps' | 'locating' | 'no-spawn' | 'hunting' | 'auth-required' | 'discovered';

export function KorlongHuntScreen({ onBack, onDiscovered }: KorlongHuntScreenProps) {
  const [huntState, setHuntState] = useState<HuntState>('locating');
  const [spawn, setSpawn] = useState<KorlongSpawn | null>(null);
  const [playerCoords, setPlayerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(Infinity);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const auth = useGameOnAuth();

  // ── Audio Management ───────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio('/assets/audio/korlong_music.mp3');
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
        setHuntState(h => h !== 'auth-required' ? 'hunting' : h);
        return active;
      }

      // No existing spawn — attempt generation
      const generated = generateKorlongSpawn(pos.coords);
      if (generated) {
        const dist = haversineDistanceMeters(latitude, longitude, generated.lat, generated.lng);
        setDistanceMeters(dist);
        setHuntState(h => h !== 'auth-required' ? 'hunting' : h);
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
      setHuntState('auth-required');
      clearKorlongSpawn();
    }
  }, [distanceMeters, huntState]);

  // ── Auth Success Check ────────────────────────────────────────────────────
  useEffect(() => {
    if (auth.status === 'success' && !discoveredRef.current) {
      discoveredRef.current = true;
      setShowDiscovery(true);
    }
  }, [auth.status]);

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
    <div className="min-h-screen bg-plum-950 text-parchment-100 flex flex-col relative overflow-hidden">
      {/* Map backdrop */}
      <img src={visayasMap} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-plum-950/60 via-plum-950/80 to-plum-950 pointer-events-none" aria-hidden />

      {/* Header */}
      <header className="relative z-10 shrink-0 bg-plum-900 border-b-[3px] border-ink">
        <div className="max-w-xl mx-auto px-3 pt-10 sm:pt-3 pb-3 flex items-center gap-3">
          <PixelIconButton icon={<ChevronLeft />} label="Back" sound="ui_back" onClick={onBack} />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-2xl leading-none">Korlong Hunt</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-gold-300"><Star className="size-4" aria-hidden />Legendary instrument</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-xl mx-auto flex flex-col items-center justify-center gap-6 px-4 py-8">

        {huntState === 'no-gps' && (
          <PixelPanel frame="wood" padding="lg" className="w-full flex flex-col items-center gap-3 text-center">
            <MapPin className="size-12 text-parchment-500" aria-hidden />
            <h2 className="font-bold text-2xl leading-none">Location unavailable</h2>
            <p className="text-base text-parchment-300">Turn on location services to hunt for the Korlong. This device or browser doesn't have GPS access.</p>
          </PixelPanel>
        )}

        {huntState === 'locating' && (
          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <div className="px-frame px-frame-inset size-20 flex items-center justify-center">
              <MapPin className="size-8 text-gold-300 animate-pulse" aria-hidden />
            </div>
            <p className="font-bold text-xl leading-none">Finding your location...</p>
            <p className="text-sm text-parchment-500">Checking for Korlong signals nearby</p>
          </div>
        )}

        {huntState === 'no-spawn' && (
          <div className="w-full flex flex-col gap-4">
            <PixelPanel frame="wood" padding="lg" className="text-center">
              <h2 className="font-bold text-2xl leading-none">No signal nearby</h2>
              <p className="mt-2 text-base text-parchment-300">
                The Korlong hasn't appeared here. It shows up more often near historic sites in Eastern Visayas. Keep moving and try again.
              </p>
            </PixelPanel>
            <PixelButton variant="primary" size="lg" fullWidth icon={<RefreshCw />} disabled={retryCountdown > 0} onClick={handleRetry}>
              {retryCountdown > 0 ? `Try again in ${retryCountdown}s` : 'Search Again'}
            </PixelButton>
          </div>
        )}

        {huntState === 'hunting' && spawn && (
          <div className="w-full flex flex-col items-center gap-6">
            {spawn.nearSite && (
              <PixelPanel frame="parchment" padding="sm" title={`Near ${spawn.nearSite.name}`} className="w-full">
                <p className="text-sm leading-snug text-ink">{spawn.nearSite.loreFragment}</p>
              </PixelPanel>
            )}

            {/* Compass */}
            <div className="relative size-64 my-4">
              <div className="absolute inset-0 rounded-full border-[3px] border-ink bg-plum-900" />
              <div className="absolute inset-3 rounded-full border-2 border-dashed border-plum-600" />
              {['N', 'E', 'S', 'W'].map((dir, i) => {
                const rad = ((i * 90 - 90) * Math.PI) / 180;
                return (
                  <span
                    key={dir}
                    className={cn('absolute font-label text-base leading-none', dir === 'N' ? 'text-gold-300' : 'text-parchment-500')}
                    style={{ left: `calc(50% + ${90 * Math.cos(rad)}px)`, top: `calc(50% + ${90 * Math.sin(rad)}px)`, transform: 'translate(-50%, -50%)' }}
                  >
                    {dir}
                  </span>
                );
              })}
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute w-1 h-3 bg-plum-600"
                  style={{ top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-106px)` }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out" style={{ transform: `rotate(${compassRotation}deg)` }}>
                <div className="absolute top-8 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[48px] border-l-transparent border-r-transparent border-b-gold-500" />
                <div className="absolute top-[80px] w-2 h-12 bg-gold-700" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-7 bg-parchment-100 border-[3px] border-ink" />
              {tier === 'arrived' && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-gold-500/25 animate-pulse">
                  <Star className="size-16 text-gold-300" aria-hidden />
                </div>
              )}
            </div>

            <div className="px-frame px-frame-wood px-8 py-3 text-center" aria-live="polite">
              <p className={cn('font-label text-3xl leading-none', TIER_TEXT[tier])}>
                {distanceMeters === Infinity ? '---' : formatDistance(distanceMeters)}
              </p>
              <p className="mt-2 text-sm text-parchment-300">
                {tier === 'arrived' ? "You've arrived!" : tier === 'close' ? 'Getting close' : tier === 'near' ? 'Signal detected' : 'Keep moving'}
              </p>
            </div>

            <p className="text-sm text-parchment-500 text-center">
              Signal lasts {Math.round((spawn.expiresAt - Date.now()) / 60000)} min · The needle points to the Korlong
            </p>
          </div>
        )}

        {huntState === 'auth-required' && !showDiscovery && (
          <div className="w-full flex flex-col items-center gap-4">
            <PixelPanel frame="wood" padding="lg" className="w-full text-center">
              <h2 className="font-bold text-2xl leading-none text-gold-300">You found the Korlong!</h2>
              <p className="mt-3 text-base text-parchment-300">
                Connect your GameOn Portal account to add this legendary instrument to your profile.
              </p>
              {auth.status === 'error' && (
                <p className="mt-3 text-sm font-semibold text-hp-light">{auth.errorMsg}</p>
              )}
            </PixelPanel>

            <PixelButton
              variant="primary"
              size="lg"
              fullWidth
              disabled={auth.status !== 'idle' && auth.status !== 'error'}
              onClick={auth.startAuthFlow}
            >
              {auth.status === 'initializing' ? 'Starting...'
                : auth.status === 'waiting-for-auth' ? 'Waiting for browser...'
                : auth.status === 'unlocking' ? 'Adding instrument...'
                : 'Connect GameOn Account'}
            </PixelButton>

            {(auth.status === 'waiting-for-auth' || auth.status === 'unlocking') && (
              <p className="text-sm text-parchment-300 text-center" aria-live="polite">
                {auth.status === 'waiting-for-auth' ? 'Finish signing in in the browser window.' : 'Almost done...'}
              </p>
            )}
          </div>
        )}

        {showDiscovery && (
          <KorlongCutscene onComplete={handleCutsceneComplete} />
        )}
      </main>

      {huntState === 'hunting' && !showDiscovery && (
        <footer className="relative z-10 border-t-[3px] border-ink bg-plum-900 px-4 py-3">
          <p className="max-w-xl mx-auto text-sm text-parchment-500 text-center">
            The Korlong can appear anywhere, but shows up more often near historic Eastern Visayas sites. Get within 30 m to discover it.
          </p>
        </footer>
      )}
    </div>
  );
}

const TIER_TEXT = { arrived: 'text-gold-300', close: 'text-heal', near: 'text-xp', far: 'text-parchment-300' } as const;
