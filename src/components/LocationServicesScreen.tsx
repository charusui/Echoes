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

const DEFAULT_MUSEUMS = [
  { id: 'm1', name: 'Museo de Iloilo', lat: 10.7022, lng: 122.5539, instruments: ['Tultugan', 'Buktot', 'Litguit'], region: 'Western Visayas' },
  { id: 'm2', name: 'Casa Gorordo Museum', lat: 10.2985, lng: 123.9048, instruments: ['Cebuano Gitara', 'Bandurria', 'Laud'], region: 'Central Visayas' },
  { id: 'm3', name: 'Silliman University Anthropology Museum', lat: 9.3101, lng: 123.3082, instruments: ['Subing', 'Korlong'], region: 'Negros / Central Visayas' },
  { id: 'm4', name: 'Bohol National Museum', lat: 9.6465, lng: 123.8569, instruments: ['Octavina', 'Bajo de Uñas'], region: 'Central Visayas' },
  { id: 'm5', name: 'National Museum of the Philippines - Cebu', lat: 10.2929, lng: 123.9061, instruments: ['Cebuano Gitara', 'Lantoy'], region: 'Central Visayas' },
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
  const searchMuseumsWithAI = async (promptText: string, fallbackCenter: [number, number]) => {
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
                region: { type: 'STRING' }
              },
              required: ['id', 'name', 'lat', 'lng', 'instruments', 'region']
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
          setMuseums(formatted);
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
      
      // Fallback search in static list
      const query = searchQuery.toLowerCase();
      const matched = DEFAULT_MUSEUMS.filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.region.toLowerCase().includes(query) ||
        m.instruments.some(i => i.toLowerCase().includes(query))
      );
      if (matched.length > 0) {
        setMuseums(matched);
        setMapCenter([matched[0].lat, matched[0].lng]);
        setMapZoom(10);
      }
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const prompt = `Search for up to 5 real museums, cultural heritage galleries, or community art spaces in the Philippines matching query: "${searchQuery}" that exhibit traditional Philippine indigenous musical instruments (such as gongs like kulintang, native lutes like buktot/kudyapi, flutes like lantoy/tulali, or jaw harps). You must verify their real-world latitude and longitude coordinates in the Philippines. Return the list in JSON matching the requested schema.`;
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

          const prompt = `Find up to 5 real museums, cultural heritage hubs, or historic exhibits in the Philippines closest to coordinates [latitude: ${position.coords.latitude}, longitude: ${position.coords.longitude}] that house or display traditional Philippine indigenous musical instruments (e.g. kulintang, gongs, native lutes, bamboo flutes). Ensure the coordinates are accurate. Return the list in JSON.`;
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
    <div className="min-h-screen bg-obsidian flex flex-col relative pb-safe">
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
      <div className="flex-1 relative z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Render Museums */}
          {museums.map(museum => (
            <Marker key={museum.id} position={[museum.lat, museum.lng]}>
              <Popup className="custom-popup">
                <div className="p-1 max-w-[200px]">
                  <h3 className="font-orbitron font-bold text-obsidian text-[13px] leading-tight mb-1">{museum.name}</h3>
                  <p className="font-space-mono text-[9px] text-obsidian/70 mb-2 uppercase">{museum.region}</p>
                  <p className="text-[10px] font-bold text-crimson mb-0.5">Exhibited Instruments:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {museum.instruments.map((inst: string) => (
                      <span key={inst} className="bg-obsidian/5 px-1.5 py-0.5 rounded text-[9px] text-obsidian border border-obsidian/10">
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
            <Marker position={userLocation} icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}>
              <Popup>You are here</Popup>
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
