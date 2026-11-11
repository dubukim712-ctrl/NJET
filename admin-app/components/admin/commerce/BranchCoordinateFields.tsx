'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';

function parseCoordinate(value: string, minimum: number, maximum: number) {
  if (!value.trim()) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

export default function BranchCoordinateFields({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}) {
  const [latitudeInput, setLatitudeInput] = useState(latitude?.toString() ?? '');
  const [longitudeInput, setLongitudeInput] = useState(longitude?.toString() ?? '');
  const inputChange = useRef(false);
  const hasCoordinates = Boolean(latitudeInput || longitudeInput);

  useEffect(() => {
    if (inputChange.current) {
      inputChange.current = false;
      return;
    }
    setLatitudeInput(latitude?.toString() ?? '');
    setLongitudeInput(longitude?.toString() ?? '');
  }, [latitude, longitude]);

  const changeCoordinate = (axis: 'latitude' | 'longitude', value: string) => {
    const nextLatitudeInput = axis === 'latitude' ? value : latitudeInput;
    const nextLongitudeInput = axis === 'longitude' ? value : longitudeInput;
    setLatitudeInput(nextLatitudeInput);
    setLongitudeInput(nextLongitudeInput);

    if (!nextLatitudeInput && !nextLongitudeInput) {
      onChange(null, null);
      return;
    }

    const nextLatitude = parseCoordinate(nextLatitudeInput, -90, 90);
    const nextLongitude = parseCoordinate(nextLongitudeInput, -180, 180);
    if (nextLatitude === null || nextLongitude === null) return;
    if (nextLatitude === latitude && nextLongitude === longitude) return;

    inputChange.current = true;
    onChange(nextLatitude, nextLongitude);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        id="branch-latitude"
        label="Latitude"
        type="number"
        min={-90}
        max={90}
        step="any"
        required={hasCoordinates}
        value={latitudeInput}
        onChange={(event) => changeCoordinate('latitude', event.target.value)}
      />
      <Input
        id="branch-longitude"
        label="Longitude"
        type="number"
        min={-180}
        max={180}
        step="any"
        required={hasCoordinates}
        value={longitudeInput}
        onChange={(event) => changeCoordinate('longitude', event.target.value)}
      />
    </div>
  );
}
