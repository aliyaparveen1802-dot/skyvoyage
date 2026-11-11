import { useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/utils/cn';

const AIRPORT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  MAA: { lat: 12.9941, lng: 80.1709 },
  DEL: { lat: 28.5562, lng: 77.1 },
  DXB: { lat: 25.2532, lng: 55.3657 },
  SIN: { lat: 1.3644, lng: 103.9915 },
  LHR: { lat: 51.47, lng: -0.4543 },
};

interface AirportMapProps {
  iata: string;
  label: string;
  className?: string;
}

export function AirportMap({ iata, label, className }: AirportMapProps) {
  const [tileErrors, setTileErrors] = useState(0);
  const coords = AIRPORT_COORDINATES[iata];

  if (!coords) {
    return (
      <div
        className={cn(
          'flex h-56 items-center justify-center rounded-card border border-line bg-canvas px-4 text-center text-sm text-muted sm:h-64',
          className,
        )}
      >
        Map unavailable for {iata}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-56 w-full overflow-hidden rounded-card border border-line sm:h-64',
        className,
      )}
    >
      <MapContainer
        key={iata}
        center={[coords.lat, coords.lng]}
        zoom={11}
        scrollWheelZoom={false}
        className="leaflet-container"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          eventHandlers={{
            tileerror: () => setTileErrors((n) => n + 1),
          }}
        />
        <CircleMarker
          center={[coords.lat, coords.lng]}
          radius={9}
          color="#2671d9"
          weight={3}
          fillColor="#E6FF19"
          fillOpacity={0.9}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {label}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
      {tileErrors >= 4 && (
        <p className="absolute bottom-2 left-2 rounded-lg bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-muted shadow-card">
          Map tiles unavailable — plain background shown
        </p>
      )}
    </div>
  );
}
