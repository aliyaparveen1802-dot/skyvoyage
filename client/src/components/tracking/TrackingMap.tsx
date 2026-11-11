import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/utils/cn';

export interface LatLng {
  lat: number;
  lng: number;
}

interface TrackingMapProps {
  route: LatLng[];
  origin: { label: string; position?: LatLng | null };
  destination: { label: string; position?: LatLng | null };
  aircraftPosition?: LatLng | null;
  simulated?: boolean;
  className?: string;
}

function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds.pad(0.15), { animate: false });
  }, [map, bounds]);
  return null;
}

export function TrackingMap({
  route,
  origin,
  destination,
  aircraftPosition,
  simulated,
  className,
}: TrackingMapProps) {
  const [tileError, setTileError] = useState(false);

  const positions = useMemo(
    () => route.map((p) => [p.lat, p.lng] as [number, number]),
    [route],
  );

  const bounds = useMemo(() => {
    const pts: LatLng[] = [...route];
    if (origin.position) pts.push(origin.position);
    if (destination.position) pts.push(destination.position);
    if (aircraftPosition) pts.push(aircraftPosition);
    if (pts.length === 0) return null;
    return new LatLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number]));
  }, [route, origin.position, destination.position, aircraftPosition]);

  const center = useMemo<LatLng>(() => {
    if (route.length > 0) return route[Math.floor(route.length / 2)];
    if (aircraftPosition) return aircraftPosition;
    if (origin.position) return origin.position;
    if (destination.position) return destination.position;
    return { lat: 0, lng: 0 };
  }, [route, aircraftPosition, origin.position, destination.position]);

  if (positions.length === 0 && !aircraftPosition) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-card border border-line bg-canvas px-4 text-center text-sm text-muted sm:h-80',
          className,
        )}
      >
        No route coordinates available for this flight yet.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-64 w-full overflow-hidden rounded-card border border-line sm:h-80',
        className,
      )}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={4}
        scrollWheelZoom={false}
        className="leaflet-container"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />
        <FitBounds bounds={bounds} />
        {positions.length >= 2 && (
          <Polyline
            positions={positions}
            pathOptions={{
              color: '#E6FF19',
              weight: 3,
              opacity: 0.85,
              dashArray: '8 8',
            }}
          />
        )}
        {origin.position && (
          <CircleMarker
            center={[origin.position.lat, origin.position.lng]}
            radius={7}
            color="#142b4d"
            weight={3}
            fillColor="#ffffff"
            fillOpacity={1}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {origin.label}
            </Tooltip>
          </CircleMarker>
        )}
        {destination.position && (
          <CircleMarker
            center={[destination.position.lat, destination.position.lng]}
            radius={7}
            color="#19a66a"
            weight={3}
            fillColor="#ffffff"
            fillOpacity={1}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {destination.label}
            </Tooltip>
          </CircleMarker>
        )}
        {aircraftPosition && (
          <CircleMarker
            center={[aircraftPosition.lat, aircraftPosition.lng]}
            radius={9}
            color="#ffffff"
            weight={3}
            fillColor="#E6FF19"
            fillOpacity={1}
            className="sv-aircraft-pulse"
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {simulated ? 'Simulated position' : 'Aircraft position'}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      <style>{`
        @keyframes sv-aircraft-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .sv-aircraft-pulse {
          animation: sv-aircraft-pulse 1.6s ease-in-out infinite;
          transform-origin: center;
        }
      `}</style>
      {tileError && (
        <p className="absolute bottom-2 left-2 rounded-lg bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-muted shadow-card">
          Map tiles unavailable — plain background shown
        </p>
      )}
    </div>
  );
}
