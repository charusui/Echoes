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
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png?v=2',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png?v=2',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png?v=2',
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

// Heavy Comic-Style Target Marker
const customMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border: 4px solid #da2d46; transform: rotate(45deg);"></div>
      <div style="position: relative; width: 16px; height: 16px; background: #da2d46; border: 3px solid #0f0c0c; box-shadow: 4px 4px 0px 0px #0f0c0c;"></div>
    </div>
  `,
  className: 'custom-marker-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Heavy Comic-Style User Marker (Cyan)
const userMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border: 4px solid #66FCF1; border-radius: 50%; animation: comic-ping 2s steps(2) infinite;"></div>
      <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #66FCF1; border: 3px solid #0f0c0c; box-shadow: 4px 4px 0px 0px #0f0c0c;"></div>
    </div>
  `,
  className: 'user-marker-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
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
    <div className="h-screen w-screen bg-[#2a2d43] relative overflow-hidden">
      
      {/* Map Container */}
      <div className="absolute inset-0 z-0 border-[6px] md:border-[12px] border-[#0f0c0c] pointer-events-auto">
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <InvalidateMapSize />
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?v=2"
          />

          {/* Render Museums */}
          {museums.map(museum => (
            <Marker key={museum.id} position={[museum.lat, museum.lng]} icon={customMarkerIcon}>
              <Popup className="custom-popup">
                <div className="p-1 max-w-[220px]">
                  {/* Comic Header */}
                  <div className="bg-[#0f0c0c] border-[3px] border-[#da2d46] px-2 py-1 -skew-x-2 shadow-[2px_2px_0px_0px_#da2d46] mb-3 w-fit">
                    <h3 className="font-orbitron font-black text-[#f0dde0] text-[10px] md:text-xs leading-none skew-x-2 tracking-widest uppercase">
                      {museum.name}
                    </h3>
                  </div>
                  
                  <p className="font-space-mono font-bold text-[9px] text-[#0f0c0c] mb-2 uppercase border-b-[2px] border-[#0f0c0c] pb-1 tracking-widest">
                    LOC: {museum.region}
                  </p>
                  
                  {museum.description && (
                    <p className="font-space-mono text-[10px] text-[#0f0c0c] leading-relaxed mb-3">
                      {museum.description}
                    </p>
                  )}

                  <p className="font-space-mono text-[9px] font-black text-[#da2d46] mb-1.5 uppercase tracking-widest">ACQUIRED DATA:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {museum.instruments.map((inst: string) => (
                      <span key={inst} className="bg-[#e0e5ed] px-1.5 py-0.5 text-[9px] text-[#0f0c0c] border-[2px] border-[#0f0c0c] font-space-mono font-bold shadow-[2px_2px_0px_0px_#0f0c0c] uppercase">
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
              <Popup className="custom-popup user-popup">
                <div className="p-1 text-[#0f0c0c] font-orbitron text-[10px] font-black uppercase tracking-widest text-center">
                  USER SIGNAL
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Diagonal Screen Tint Overlay (Pointer events none so you can still click the map) */}
        <div className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-30" style={{ backgroundImage: 'linear-gradient(45deg, #da2d46 25%, transparent 25%, transparent 50%, #da2d46 50%, #da2d46 75%, transparent 75%, transparent)' }} />
      </div>

      {/* Header Back Button */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <button
          onClick={onBack}
          className="w-12 h-12 bg-[#f0dde0] border-[4px] border-[#0f0c0c] flex items-center justify-center text-[#0f0c0c] pointer-events-auto shadow-[4px_4px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all -skew-x-6"
        >
          <ChevronLeft size={28} className="skew-x-6 stroke-[4px]" />
        </button>
      </div>

      {/* Control Panel (Bottom) */}
      <div className="absolute bottom-4 inset-x-4 z-[1000] flex justify-center pointer-events-none">
        <div className="w-full max-w-lg bg-[#2a2d43] border-[6px] border-[#0f0c0c] p-4 shadow-[12px_12px_0px_0px_#0f0c0c] pointer-events-auto -skew-x-1">
          
          <h2 className="font-orbitron font-black text-[#e0e5ed] text-sm tracking-widest mb-3 flex items-center justify-between skew-x-1 uppercase">
            <span className="flex items-center gap-2">
              <MapPin size={18} className="text-[#da2d46] stroke-[3px]" /> INDIGENOUS RADAR
            </span>
            {isSearchingAI && (
              <span className="flex items-center gap-1 text-[10px] font-space-mono text-[#f0dde0] bg-[#da2d46] px-2 py-0.5 border-[2px] border-[#0f0c0c] animate-comic-pulse shadow-[2px_2px_0px_0px_#0f0c0c]">
                <Sparkles size={12} className="stroke-[3px]" /> AI ACTIVE
              </span>
            )}
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2 mb-3 skew-x-1">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888ea1] stroke-[3px]" />
              <input
                type="text"
                placeholder="SEARCH REGION OR MUSEUM..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={isSearchingAI}
                className="w-full bg-[#e0e5ed] border-[4px] border-[#0f0c0c] py-3 pl-10 pr-3 text-xs md:text-sm text-[#0f0c0c] font-space-mono font-bold focus:outline-none focus:border-[#da2d46] transition-all placeholder:text-[#888ea1] placeholder:uppercase shadow-[4px_4px_0px_0px_#0f0c0c] disabled:opacity-50"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearchingAI || !searchQuery.trim()}
              className="bg-[#da2d46] text-[#0f0c0c] border-[4px] border-[#0f0c0c] font-black px-4 md:px-6 text-sm font-orbitron shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              FIND
            </button>
          </form>

          <button
            onClick={handleUseMyLocation}
            disabled={isLocating || isSearchingAI}
            className="w-full py-4 bg-[#e0e5ed] border-[4px] border-[#0f0c0c] text-[#0f0c0c] font-orbitron font-black text-sm tracking-widest flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_#0f0c0c] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#0f0c0c] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all disabled:opacity-50 uppercase skew-x-1"
          >
            {isLocating ? (
              <div className="w-5 h-5 border-[3px] border-[#0f0c0c] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation size={18} className="stroke-[3px]" />
            )}
            {isLocating ? 'DETERMINING GPS...' : 'SCAN NEAR MY POSITION'}
          </button>
        </div>
      </div>

      {/* Global CSS for the Leaflet popup and animations */}
      <style>{`
        @keyframes comic-ping {
          0% { transform: scale(1); opacity: 1; border-width: 4px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 1px; }
        }
        @keyframes comic-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95); opacity: 0.9; }
        }
        .animate-comic-pulse { animation: comic-pulse 1s ease-in-out infinite; }
        
        /* Restyled Leaflet Popups for Comic Book Look */
        .leaflet-popup-content-wrapper {
          background-color: #f0dde0; /* pale pink */
          color: #0f0c0c;
          border-radius: 0px !important;
          border: 4px solid #0f0c0c !important;
          box-shadow: 6px 6px 0px 0px #0f0c0c !important;
          transform: skewX(-2deg);
        }
        .leaflet-popup-tip {
          background-color: #0f0c0c !important;
          width: 20px !important;
          height: 20px !important;
          margin-top: -10px !important;
        }
        .custom-popup .leaflet-popup-content {
          margin: 12px 14px !important;
          transform: skewX(2deg);
        }
        /* Specific override for user location popup */
        .user-popup .leaflet-popup-content-wrapper {
          background-color: #66FCF1;
          box-shadow: 4px 4px 0px 0px #0f0c0c !important;
        }
      `}</style>
    </div>
  );
}