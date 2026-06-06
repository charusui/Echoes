import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronLeft, MapPin, Search, Navigation } from 'lucide-react';
import L from 'leaflet';

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

const MOCK_MUSEUMS = [
  { id: 1, name: 'Museo de Iloilo', lat: 10.7022, lng: 122.5539, instruments: ['Tultugan', 'Buktot'], region: 'Western Visayas' },
  { id: 2, name: 'Casa Gorordo Museum', lat: 10.2985, lng: 123.9048, instruments: ['Bandurria', 'Laud'], region: 'Central Visayas' },
  { id: 3, name: 'Silliman Anthropology Museum', lat: 9.3101, lng: 123.3082, instruments: ['Agong', 'Babandil'], region: 'Negros' },
  { id: 4, name: 'Bohol National Museum', lat: 9.6465, lng: 123.8569, instruments: ['Litguit', 'Kudyapi'], region: 'Central Visayas' },
];

export function LocationServicesScreen({ onBack }: { onBack: () => void }) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.5, 123.5]); // Default Visayas center
  const [mapZoom, setMapZoom] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const handleUseMyLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setMapZoom(10);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please check your permissions.");
          setIsLocating(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.toLowerCase();
    const found = MOCK_MUSEUMS.find(m => m.name.toLowerCase().includes(query) || m.region.toLowerCase().includes(query));
    if (found) {
      setMapCenter([found.lat, found.lng]);
      setMapZoom(12);
    } else {
      alert("No matching museums found in our database for that search.");
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col relative pb-safe">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-[1000] p-4 bg-gradient-to-b from-obsidian via-obsidian/80 to-transparent flex justify-between items-start pointer-events-none">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-dark-slate/80 border border-light-gray/20 flex items-center justify-center text-light-gray backdrop-blur-md pointer-events-auto active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ChangeView center={mapCenter} zoom={mapZoom} />
          {/* Using a dark themed map tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Render Museums */}
          {MOCK_MUSEUMS.map(museum => (
            <Marker key={museum.id} position={[museum.lat, museum.lng]}>
              <Popup className="custom-popup">
                <div className="p-1">
                  <h3 className="font-orbitron font-bold text-obsidian text-sm">{museum.name}</h3>
                  <p className="font-space-mono text-xs text-obsidian/70 mb-2">{museum.region}</p>
                  <p className="text-xs font-bold text-crimson">Scannable Instruments:</p>
                  <ul className="text-xs list-disc pl-4 text-obsidian">
                    {museum.instruments.map(inst => (
                      <li key={inst}>{inst}</li>
                    ))}
                  </ul>
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
      <div className="absolute bottom-0 inset-x-0 z-[1000] p-4 bg-gradient-to-t from-obsidian via-obsidian/90 to-transparent">
        <div className="glass-card p-4 rounded-2xl border border-pale-pink/20 shadow-2xl">
          <h2 className="font-orbitron font-bold text-light-gray mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-crimson" /> Instrument Radar
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-gray/40" />
              <input
                type="text"
                placeholder="Search region or museum..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-dark-slate border border-light-gray/10 rounded-xl py-2 pl-9 pr-3 text-sm text-light-gray focus:border-crimson/50 focus:ring-1 focus:ring-crimson/50 transition-all outline-none font-space-mono"
              />
            </div>
            <button type="submit" className="bg-dark-slate border border-light-gray/20 text-light-gray px-4 rounded-xl text-sm font-space-mono active:scale-95">
              FIND
            </button>
          </form>

          <button
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="w-full py-3 rounded-xl bg-crimson/10 border border-crimson/40 text-crimson font-space-mono text-sm flex items-center justify-center gap-2 hover:bg-crimson/20 active:scale-95 transition-all"
          >
            {isLocating ? (
              <div className="w-4 h-4 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation size={16} />
            )}
            {isLocating ? 'LOCATING...' : 'USE MY LOCATION'}
          </button>
        </div>
      </div>

      {/* Global CSS for the Leaflet popup to override its white background slightly if needed, though CartoDB dark mostly styles tiles */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background-color: #FDEBD0;
          color: #0f0c0c;
          border-radius: 12px;
          border: 2px solid #da2d46;
        }
        .leaflet-popup-tip {
          background-color: #da2d46;
        }
      `}</style>
    </div>
  );
}
