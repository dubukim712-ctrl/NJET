'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';

const DEFAULT_CENTER: LatLngTuple = [12.8797, 121.774];
const LOCATION_ICON = L.divIcon({
  className: 'branch-location-marker',
  html: '<span class="branch-location-marker__dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click: ({ latlng }) => onPick(latlng.lat, latlng.lng),
  });
  return null;
}

function SyncMapView({ position }: { position: LatLngTuple | null }) {
  const map = useMap();

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        if (position) {
          map.setView(position, Math.max(map.getZoom(), 15), { animate: false });
        }
      });
    };
    const observer = new ResizeObserver(sync);
    observer.observe(map.getContainer());
    sync();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map, position]);

  return null;
}

export default function BranchLocationMap({
  position,
  onPick,
  interactive = true,
}: {
  position: LatLngTuple | null;
  onPick?: (latitude: number, longitude: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="h-72 overflow-hidden rounded-lg border sm:h-96">
      <MapContainer
        aria-label="Branch location map"
        center={position ?? DEFAULT_CENTER}
        zoom={position ? 15 : 6}
        scrollWheelZoom={false}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SyncMapView position={position} />
        {interactive && onPick && <MapClickHandler onPick={onPick} />}
        {position && <Marker position={position} icon={LOCATION_ICON} />}
      </MapContainer>
    </div>
  );
}
