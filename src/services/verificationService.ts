import type { VerificationResult } from '../types';

// ─── Haversine Distance ───────────────────────────────────────────────────────

export function haversineDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Verified Instrument Locations ───────────────────────────────────────────

interface VerifiedVenue {
  venue: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export const VERIFIED_INSTRUMENT_LOCATIONS: Record<string, VerifiedVenue[]> = {
  'Tultugan': [
    { venue: 'Tultugan Festival, Maasin, Iloilo', lat: 10.8736, lng: 122.5747, radiusMeters: 300 },
  ],
  'Tulali': [
    { venue: 'UPV Museum of Art & Cultural Heritage (UPV MACH), Iloilo City', lat: 10.7167, lng: 122.5500, radiusMeters: 150 },
  ],
  'Litgit': [
    { venue: 'UPV Museum of Art & Cultural Heritage (UPV MACH), Iloilo City', lat: 10.7167, lng: 122.5500, radiusMeters: 150 },
  ],
  'Cebuano Gitara': [
    { venue: 'Alegre Guitar Factory, Abuno, Lapu-Lapu City', lat: 10.2985, lng: 123.9891, radiusMeters: 200 },
    { venue: 'National Museum of the Philippines – Cebu', lat: 10.2956, lng: 123.8979, radiusMeters: 150 },
  ],
  'Bandurria': [
    { venue: 'Alegre Guitar Factory Showroom, Abuno, Lapu-Lapu City', lat: 10.2985, lng: 123.9891, radiusMeters: 200 },
  ],
  'Bajo de Uñas': [
    { venue: 'Alegre Guitar Factory Showroom, Abuno, Lapu-Lapu City', lat: 10.2985, lng: 123.9891, radiusMeters: 200 },
  ],
  'Laud': [
    { venue: 'Ferangeli Guitar Handcrafter Showroom, Cebu', lat: 10.3200, lng: 123.9000, radiusMeters: 150 },
  ],
  'Octavina': [
    { venue: 'Ferangeli Guitar Handcrafter Showroom, Cebu', lat: 10.3200, lng: 123.9000, radiusMeters: 150 },
  ],
};

// ─── GPS Verification ─────────────────────────────────────────────────────────

export interface GpsVerificationResult {
  passed: boolean;
  venue: string | null;
  distanceMeters: number;
}

export function checkGpsVerification(
  coords: GeolocationCoordinates,
  instrumentName?: string,
): GpsVerificationResult {
  const toCheck = instrumentName
    ? (VERIFIED_INSTRUMENT_LOCATIONS[instrumentName] ? { [instrumentName]: VERIFIED_INSTRUMENT_LOCATIONS[instrumentName] } : {})
    : VERIFIED_INSTRUMENT_LOCATIONS;

  let closest: GpsVerificationResult = { passed: false, venue: null, distanceMeters: Infinity };

  for (const venues of Object.values(toCheck)) {
    for (const v of venues) {
      const dist = haversineDistanceMeters(coords.latitude, coords.longitude, v.lat, v.lng);
      if (dist < closest.distanceMeters) {
        closest = { passed: dist <= v.radiusMeters, venue: v.venue, distanceMeters: dist };
      }
    }
  }

  return closest;
}

// ─── Korlong Weighted Spawn ───────────────────────────────────────────────────

export interface KorlongSite {
  name: string;
  significance: string;
  lat: number;
  lng: number;
  spawnRadiusMeters: number;
  loreFragment: string;
}

export const KORLONG_HUNT_SITES: KorlongSite[] = [
  {
    name: 'Basey, Samar',
    significance: 'Ancient abaca trade hub',
    lat: 11.2800, lng: 125.0700, spawnRadiusMeters: 500,
    loreFragment: '"Ancient abaca traders spoke of a haunting two-stringed cry echoing from the hills of Samar..."',
  },
  {
    name: 'Guiuan, Eastern Samar',
    significance: '16th-century colonial port',
    lat: 11.0317, lng: 125.7178, spawnRadiusMeters: 500,
    loreFragment: '"16th-century Spanish accounts mention a bowed instrument unlike any they had seen in their travels..."',
  },
  {
    name: 'Balangiga, Eastern Samar',
    significance: 'Cultural memory & ethnographic record site',
    lat: 11.5000, lng: 125.3833, spawnRadiusMeters: 500,
    loreFragment: '"Ethnographers in 1904 documented a fiddle of extraordinary rarity in this valley. Two strings. One voice."',
  },
  {
    name: 'Catbalogan, Samar',
    significance: 'Capital of Samar Province',
    lat: 11.7753, lng: 124.8856, spawnRadiusMeters: 500,
    loreFragment: '"The Samar Archaeological Museum archives reference \'the two-voice instrument\' — last seen, never photographed."',
  },
  {
    name: 'Borongan, Eastern Samar',
    significance: 'Waray-Waray heritage capital',
    lat: 11.6082, lng: 125.4326, spawnRadiusMeters: 500,
    loreFragment: '"Waray-Waray oral tradition preserves a song played only on \'dalawang-kudlit\' — the twin-string."',
  },
];

const KORLONG_SPAWN_KEY = 'echoes_korlong_spawn';
const KORLONG_SPAWN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface KorlongSpawn {
  lat: number;
  lng: number;
  nearSite: KorlongSite | null;
  expiresAt: number;
}

/** Load an active (non-expired) spawn from localStorage, or null */
export function loadKorlongSpawn(): KorlongSpawn | null {
  try {
    const raw = localStorage.getItem(KORLONG_SPAWN_KEY);
    if (!raw) return null;
    const spawn: KorlongSpawn = JSON.parse(raw);
    if (Date.now() > spawn.expiresAt) {
      localStorage.removeItem(KORLONG_SPAWN_KEY);
      return null;
    }
    return spawn;
  } catch {
    return null;
  }
}

/** Save a spawn to localStorage */
export function saveKorlongSpawn(spawn: KorlongSpawn): void {
  localStorage.setItem(KORLONG_SPAWN_KEY, JSON.stringify(spawn));
}

/** Clear the active spawn */
export function clearKorlongSpawn(): void {
  localStorage.removeItem(KORLONG_SPAWN_KEY);
}

/** Random offset in meters → degrees (approximate) */
function offsetCoords(lat: number, lng: number, minM: number, maxM: number): { lat: number; lng: number } {
  const dist = minM + Math.random() * (maxM - minM);
  const angle = Math.random() * 2 * Math.PI;
  const dLat = (dist * Math.cos(angle)) / 111_320;
  const dLng = (dist * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

/**
 * Attempt to generate a new Korlong spawn.
 * Returns the spawn if generated, or null if the RNG didn't fire this attempt.
 */
export function generateKorlongSpawn(coords: GeolocationCoordinates): KorlongSpawn | null {
  // Check if near a historical site (75% spawn chance)
  for (const site of KORLONG_HUNT_SITES) {
    const dist = haversineDistanceMeters(coords.latitude, coords.longitude, site.lat, site.lng);
    if (dist <= site.spawnRadiusMeters) {
      if (Math.random() < 0.75) {
        // Spawn within the site's radius
        const offset = offsetCoords(site.lat, site.lng, 0, site.spawnRadiusMeters * 0.8);
        const spawn: KorlongSpawn = {
          lat: offset.lat,
          lng: offset.lng,
          nearSite: site,
          expiresAt: Date.now() + KORLONG_SPAWN_TTL_MS,
        };
        saveKorlongSpawn(spawn);
        return spawn;
      }
      return null; // RNG failed at historical site
    }
  }

  // Not near any site — 20% chance of local spawn
  if (Math.random() < 0.20) {
    const offset = offsetCoords(coords.latitude, coords.longitude, 200, 800);
    const spawn: KorlongSpawn = {
      lat: offset.lat,
      lng: offset.lng,
      nearSite: null,
      expiresAt: Date.now() + KORLONG_SPAWN_TTL_MS,
    };
    saveKorlongSpawn(spawn);
    return spawn;
  }

  return null; // No spawn this attempt
}

// ─── WebXR Support Probe ──────────────────────────────────────────────────────

export async function checkWebXRSupport(): Promise<boolean> {
  try {
    const nav = navigator as any;
    if (!nav.xr) return false;
    return await nav.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

// ─── Community Review Queue ───────────────────────────────────────────────────

const REVIEW_QUEUE_KEY = 'echoes_community_reviews';

export interface CommunityReviewPayload {
  instrumentHint?: string;
  imageBase64Thumb?: string; // truncated for storage
  playerNote?: string;
  timestamp: string;
}

export function submitForCommunityReview(payload: CommunityReviewPayload): string {
  const ticketId = `ECH-${Date.now().toString(36).toUpperCase()}`;
  try {
    const raw = localStorage.getItem(REVIEW_QUEUE_KEY);
    const queue: Array<CommunityReviewPayload & { ticketId: string }> = raw ? JSON.parse(raw) : [];
    queue.push({ ...payload, ticketId });
    // Keep only last 20 submissions to avoid localStorage bloat
    if (queue.length > 20) queue.splice(0, queue.length - 20);
    localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full — silently ignore
  }
  return ticketId;
}

export function getPendingReviews(): Array<CommunityReviewPayload & { ticketId: string }> {
  try {
    const raw = localStorage.getItem(REVIEW_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Convenience: build a VerificationResult ─────────────────────────────────

export function makeVerificationResult(
  method: VerificationResult['method'],
  venue?: string | null,
  ticketId?: string,
): VerificationResult {
  return { method, venue: venue ?? null, ticketId, timestamp: new Date().toISOString() };
}
