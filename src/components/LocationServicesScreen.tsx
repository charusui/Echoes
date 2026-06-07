import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, MapPin, Search, Navigation, Sparkles } from 'lucide-react';
import L from 'leaflet';
import { useGemini } from '../context/GeminiProvider';
import { GEMINI_MODEL } from '../constants';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically change map view
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const customMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(218, 45, 70, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #da2d46; border: 2.5px solid #f0dde0; box-shadow: 0 0 10px #da2d46;"></div>
    </div>
  `,
  className: 'custom-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const userMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(102, 252, 241, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #66FCF1; border: 2.5px solid #0f0c0c; box-shadow: 0 0 10px #66FCF1;"></div>
    </div>
  `,
  className: 'user-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const DEFAULT_MUSEUMS = [
  // Western Visayas
  {
    id: 'm1',
    name: 'National Museum of Western Visayas',
    lat: 10.6946,
    lng: 122.5645,
    instruments: ['Tultugan', 'Buktot', 'Tulali', 'Tugo', 'Litguit', 'Subing'],
    region: 'Western Visayas',
    description: 'A grand regional branch of the National Museum featuring extensive archaeological and musical exhibits of Panay.'
  },
  {
    id: 'm2',
    name: 'Museo Iloilo',
    lat: 10.7022,
    lng: 122.5539,
    instruments: ['Tultugan', 'Tugo'],
    region: 'Western Visayas',
    description: 'The first government-sponsored museum outside Manila, housing cultural artifacts of Western Visayas.'
  },
  {
    id: 'm3',
    name: 'Maasin Municipal Hall Heritage Display',
    lat: 10.8988,
    lng: 122.4283,
    instruments: ['Tultugan'],
    region: 'Western Visayas',
    description: 'A municipal gallery celebrating Maasin\'s local history and its legendary bamboo instrument craftsmanship.'
  },
  {
    id: 'm4',
    name: 'UP Visayas Museum of Art and Cultural Heritage (UPV MACH)',
    lat: 10.6974,
    lng: 122.5594,
    instruments: ['Pasiyak', 'Tulali', 'Tugo', 'Litguit'],
    region: 'Western Visayas',
    description: 'Showcases traditional visual and performative cultural heritage of Panay and the Visayan islands.'
  },
  {
    id: 'm5',
    name: 'School of Living Traditions (SLT) Cultural Gallery',
    lat: 11.1256,
    lng: 122.5303,
    instruments: ['Tulali'],
    region: 'Western Visayas',
    description: 'A community center in Calinog dedicated to preserving Panay Bukidnon traditions and folklore.'
  },

  // Central Visayas
  {
    id: 'm6',
    name: 'Jose R. Gullas Halad Museum',
    lat: 10.2970,
    lng: 123.9022,
    instruments: ['Buktot', 'Pasiyak', 'Litguit', 'Cebuano Gitara', 'Bandurria', 'Laud', 'Octavina', 'Bajo de Uñas'],
    region: 'Central Visayas',
    description: 'A themed museum in Cebu commemorating musical heritage and historic Cebuano artists.'
  },
  {
    id: 'm7',
    name: 'University of San Carlos (USC) Museum',
    lat: 10.3006,
    lng: 123.8993,
    instruments: ['Buktot', 'Cebuano Gitara', 'Bandurria', 'Laud', 'Octavina', 'Bajo de Uñas', 'Lantoy', 'Korlong'],
    region: 'Central Visayas',
    description: 'Features world-class archaeological and ethnographic galleries documenting Visayan indigenous history.'
  },
  {
    id: 'm8',
    name: 'Museo Sugbo / Cebu Provincial Museum',
    lat: 10.3048,
    lng: 123.9067,
    instruments: ['Pasiyak'],
    region: 'Central Visayas',
    description: 'Housed in Cebu\'s historic former jail, it tracks the provincial history and cultural evolution of Cebu.'
  },
  {
    id: 'm9',
    name: 'Alegre Guitar Factory Showroom',
    lat: 10.2889,
    lng: 124.0189,
    instruments: ['Cebuano Gitara', 'Bandurria', 'Laud', 'Octavina', 'Bajo de Uñas'],
    region: 'Central Visayas',
    description: 'Famous showroom displaying premium handcrafted guitars and Rondalla string instruments in Mactan.'
  },

  // Eastern Visayas
  {
    id: 'm10',
    name: 'Samar Archaeological Museum and Research Center',
    lat: 12.0674,
    lng: 124.5956,
    instruments: ['Lantoy', 'Subing', 'Korlong'],
    region: 'Eastern Visayas',
    description: 'Affiliated with Christ the King College, it is Samar\'s first museum preserving regional historical treasures.'
  },
  {
    id: 'm11',
    name: 'People\'s Center and Library Heritage Displays',
    lat: 11.2428,
    lng: 125.0042,
    instruments: ['Lantoy'],
    region: 'Eastern Visayas',
    description: 'A historic library and cultural center in Tacloban holding Leyte and Samar ethnographic artifacts.'
  },
  {
    id: 'm12',
    name: 'Leyte Provincial Capitol Museum Displays',
    lat: 11.2482,
    lng: 125.0028,
    instruments: ['Subing'],
    region: 'Eastern Visayas',
    description: 'An exhibition gallery in the historical Tacloban Capitol showcasing regional heritage.'
  },
  {
    id: 'm13',
    name: 'National Museum Regional Exhibitions (Tacloban)',
    lat: 11.2410,
    lng: 125.0060,
    instruments: ['Korlong'],
    region: 'Eastern Visayas',
    description: 'Rotating displays of national and regional historical artifacts on tour across the Eastern Visayas.'
  }
];


export function LocationServicesScreen({ onBack }: { onBack: () => void }) {
  const { client } = useGemini();
  const [museums, setMuseums] = useState<any[]>(DEFAULT_MUSEUMS);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.5, 123.5]); // Default Visayas center
  const [mapZoom, setMapZoom] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  // Helper to query Gemini for museums
  const searchMuseumsWithAI = async (promptText: string, _fallbackCenter: [number, number]) => {
    setIsSearchingAI(true);
    try {
      const responseSchema = {
        type: 'OBJECT',
        properties: {
          museums: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                name: { type: 'STRING' },
                lat: { type: 'NUMBER' },
                lng: { type: 'NUMBER' },
                instruments: {
                  type: 'ARRAY',
                  items: { type: 'STRING' }
                },
                region: { type: 'STRING' },
                description: { type: 'STRING' }
              },
              required: ['id', 'name', 'lat', 'lng', 'instruments', 'region', 'description']
            }
          }
        },
        required: ['museums']
      };

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema as any
        }
      });

      let text = response.text;
      if (!text) {
        const parts = response.candidates?.[0]?.content?.parts;
        text = parts?.map((p: any) => p.text ?? '').join('') || '';
      }

      if (text) {
        const data = JSON.parse(text);
        if (data.museums && data.museums.length > 0) {
          const formatted = data.museums.map((m: any, idx: number) => ({
            ...m,
            id: m.id || `ai-${idx}-${Date.now()}`
          }));

          // Merge default museums with AI-returned ones, filtering out duplicates
          const merged = [...DEFAULT_MUSEUMS];
          formatted.forEach((aiMuseum: any) => {
            const exists = merged.some(m => 
              m.name.toLowerCase() === aiMuseum.name.toLowerCase() ||
              (Math.abs(m.lat - aiMuseum.lat) < 0.001 && Math.abs(m.lng - aiMuseum.lng) < 0.001)
            );
            if (!exists) {
              merged.push(aiMuseum);
            }
          });

          setMuseums(merged);
          const first = formatted[0];
          setMapCenter([first.lat, first.lng]);
          setMapZoom(11);
        } else {
          alert("AI Radar: No specialized instrument museums found for this criteria.");
        }
      }
    } catch (err) {
      console.error("[AI Radar] Gemini call failed:", err);
      alert("AI Radar search failed. Showing local results as fallback.");
      
      // Fallback search: focus on match, but keep all default pins visible
      const query = searchQuery.toLowerCase();
      const matched = DEFAULT_MUSEUMS.filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.region.toLowerCase().includes(query) ||
        m.instruments.some(i => i.toLowerCase().includes(query))
      );
      if (matched.length > 0) {
        setMapCenter([matched[0].lat, matched[0].lng]);
        setMapZoom(11);
      }
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const prompt = `Search for up to 5 real museums, cultural heritage galleries, or community art spaces in the Philippines matching query: "${searchQuery}" that exhibit traditional Philippine indigenous musical instruments (such as gongs like kulintang, native lutes like buktot/kudyapi, flutes like lantoy/tulali, or jaw harps). You must verify their real-world latitude and longitude coordinates in the Philippines. Include a helpful 1-sentence description detailing their exhibits. Return the list in JSON matching the requested schema.`;
    await searchMuseumsWithAI(prompt, mapCenter);
  };

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setMapZoom(10);
          setIsLocating(false);

          const prompt = `Find up to 5 real museums, cultural heritage hubs, or historic exhibits in the Philippines closest to coordinates [latitude: ${position.coords.latitude}, longitude: ${position.coords.longitude}] that house or display traditional Philippine indigenous musical instruments (e.g. kulintang, gongs, native lutes, bamboo flutes). Ensure the coordinates are accurate. Include a helpful 1-sentence description detailing their exhibits. Return the list in JSON matching the requested schema.`;
          await searchMuseumsWithAI(prompt, loc);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not retrieve your location. Please check browser permissions.");
          setIsLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-obsidian relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-[1000] p-4 bg-gradient-to-b from-obsidian via-obsidian/80 to-transparent flex justify-between items-start pointer-events-none">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-dark-slate/85 border border-light-gray/20 flex items-center justify-center text-light-gray backdrop-blur-md pointer-events-auto active:scale-95 transition-all hover:bg-dark-slate"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <InvalidateMapSize />
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Render Museums */}
          {museums.map(museum => (
            <Marker key={museum.id} position={[museum.lat, museum.lng]} icon={customMarkerIcon}>
              <Popup className="custom-popup">
                <div className="p-1 max-w-[200px]">
                  <h3 className="font-orbitron font-bold text-obsidian text-[13px] leading-tight mb-1">{museum.name}</h3>
                  <p className="font-space-mono text-[9px] text-obsidian/70 mb-1.5 uppercase">{museum.region}</p>
                  
                  {museum.description && (
                    <p className="text-[10px] text-obsidian/85 leading-relaxed italic mb-2 border-t border-obsidian/10 pt-1.5">
                      {museum.description}
                    </p>
                  )}

                  <p className="text-[10px] font-bold text-crimson mb-0.5">Exhibited Instruments:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {museum.instruments.map((inst: string) => (
                      <span key={inst} className="bg-obsidian/5 px-1.5 py-0.5 rounded text-[9px] text-obsidian border border-obsidian/10 font-space-mono">
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render User Location if available */}
          {userLocation && (
            <Marker position={userLocation} icon={userMarkerIcon}>
              <Popup>
                <div className="p-1 text-obsidian font-space-mono text-xs font-bold">
                  You are here
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Control Panel (Bottom) */}
      <div className="absolute bottom-0 inset-x-0 z-[1000] p-4 bg-gradient-to-t from-obsidian via-obsidian/95 to-transparent">
        <div className="glass-card p-4 rounded-2xl border border-pale-pink/20 shadow-2xl relative overflow-hidden bg-dark-slate/60 backdrop-blur-md">
          
          {/* Sparkle Glow for AI Radar */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-crimson/10 rounded-full blur-xl pointer-events-none" />

          <h2 className="font-orbitron font-black text-light-gray text-xs tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin size={16} className="text-crimson" /> INDIGENOUS RADAR
            </span>
            {isSearchingAI && (
              <span className="flex items-center gap-1 text-[9px] font-space-mono text-crimson animate-pulse">
                <Sparkles size={10} /> AI CONSULTING...
              </span>
            )}
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-gray/40" />
              <input
                type="text"
                placeholder="Search region, city or museum..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={isSearchingAI}
                className="w-full bg-obsidian border border-light-gray/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-light-gray focus:border-crimson/50 focus:ring-1 focus:ring-crimson/50 transition-all outline-none font-space-mono"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearchingAI || !searchQuery.trim()}
              className="bg-crimson text-obsidian font-bold px-4 rounded-xl text-xs font-orbitron hover:shadow-lg hover:shadow-crimson/30 active:scale-95 transition-all disabled:opacity-50"
            >
              FIND
            </button>
          </form>

          <button
            onClick={handleUseMyLocation}
            disabled={isLocating || isSearchingAI}
            className="w-full py-3 rounded-xl bg-crimson/10 border border-crimson/30 text-crimson font-space-mono text-xs flex items-center justify-center gap-2 hover:bg-crimson/20 active:scale-95 transition-all"
          >
            {isLocating ? (
              <div className="w-4 h-4 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation size={14} />
            )}
            {isLocating ? 'DETERMINING GPS...' : 'SCAN NEAR MY POSITION'}
          </button>
        </div>
      </div>

      {/* Global CSS for the Leaflet popup */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          background-color: #f0dde0; /* pale pink */
          color: #0f0c0c;
          border-radius: 16px;
          border: 2px solid #da2d46;
          box-shadow: 0 4px 20px rgba(218, 45, 70, 0.3);
        }
        .leaflet-popup-tip {
          background-color: #da2d46;
        }
        .custom-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
      `}</style>
    </div>
  );
}
