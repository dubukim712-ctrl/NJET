'use client';

import { useState } from 'react';
import { PhilippineAddressAutofill } from '@/components/admin/commerce/PhilippineAddressAutofill';
import { Input } from '@/components/ui/Input';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/SearchableSelect';
import {
  usePhilippineBarangaysQuery,
  usePhilippineCitiesQuery,
  usePhilippineProvincesQuery,
} from '@/data/philippine-locations-client';

export type PhilippineAddressValues = {
  addressLine1: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
};

function toOptions(
  locations: { code: string; name: string }[]
): SearchableSelectOption[] {
  return locations.map(({ code, name }) => ({ value: code, label: name }));
}

export function PhilippineAddressFields({
  values,
  onChange,
  disabled,
  required = false,
  enableLocationAutofill = true,
}: {
  values: PhilippineAddressValues;
  onChange: (values: PhilippineAddressValues) => void;
  disabled: boolean;
  required?: boolean;
  enableLocationAutofill?: boolean;
}) {
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const provincesQuery = usePhilippineProvincesQuery();
  const citiesQuery = usePhilippineCitiesQuery(provinceCode);
  const barangaysQuery = usePhilippineBarangaysQuery(cityCode);
  const provinces = toOptions(provincesQuery.data ?? []);
  const cities = toOptions(citiesQuery.data ?? []);
  const barangays = toOptions(barangaysQuery.data ?? []);
  const provinceLoading = provincesQuery.isFetching;
  const cityLoading = Boolean(provinceCode) && citiesQuery.isFetching;
  const barangayLoading = Boolean(cityCode) && barangaysQuery.isFetching;
  const provinceError = provincesQuery.error?.message ?? null;
  const cityError = citiesQuery.error?.message ?? null;
  const barangayError = barangaysQuery.error?.message ?? null;

  const selectedProvince = (code: string) => {
    if (code === provinceCode) return;
    setProvinceCode(code);
    setCityCode('');
    setBarangayCode('');
    const province = provinces.find((option) => option.value === code);
    onChange({
      ...values,
      province: province?.label ?? '',
      city: '',
      barangay: '',
    });
  };

  const selectedCity = (code: string) => {
    if (code === cityCode) return;
    setCityCode(code);
    setBarangayCode('');
    const city = cities.find((option) => option.value === code);
    onChange({ ...values, city: city?.label ?? '', barangay: '' });
  };

  const retryButton = (label: string, onRetry: () => void) => (
    <button
      type="button"
      className="text-sm font-medium text-primary underline underline-offset-2"
      onClick={onRetry}
    >
      Retry loading {label}
    </button>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {required ? 'Address' : 'Address (optional)'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {required
              ? 'Enter the complete address to continue.'
              : 'Add an address if available. Search and select a province, city, and barangay.'}
          </p>
        </div>
        {enableLocationAutofill && (
          <PhilippineAddressAutofill
            provinces={provinces}
            disabled={disabled || provinceLoading || Boolean(provinceError)}
            onAddressFound={(location) => {
              setProvinceCode(location.provinceCode);
              setCityCode(location.cityCode);
              setBarangayCode(location.barangayCode);
              onChange({
                ...values,
                province: location.province,
                city: location.city,
                barangay: location.barangay,
                postalCode: location.postalCode,
              });
            }}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Street address"
          helperText="Enter the house or building number and street."
          containerClassName="sm:col-span-2"
          required={required}
          value={values.addressLine1}
          onChange={(event) => onChange({ ...values, addressLine1: event.target.value })}
        />
        <SearchableSelect
          label="Province"
          value={provinceCode}
          options={provinces}
          disabled={disabled || provinceLoading || Boolean(provinceError)}
          helperText={provinceLoading ? 'Loading provinces…' : 'Choose the province for this address.'}
          emptyMessage="No matching province."
          required={required}
          onChange={selectedProvince}
        />
        <SearchableSelect
          label="City / municipality"
          value={cityCode}
          options={cities}
          disabled={disabled || !provinceCode || cityLoading || Boolean(cityError)}
          helperText={cityLoading ? 'Loading cities and municipalities…' : 'Choose the city or municipality.'}
          emptyMessage="No matching city or municipality."
          required={required}
          onChange={selectedCity}
        />
        <SearchableSelect
          label="Barangay"
          value={barangayCode}
          options={barangays}
          disabled={disabled || !cityCode || barangayLoading || Boolean(barangayError)}
          helperText={barangayLoading ? 'Loading barangays…' : 'Choose the barangay.'}
          emptyMessage="No matching barangay."
          required={required}
          onChange={(code) => {
            const barangay = barangays.find((option) => option.value === code);
            setBarangayCode(code);
            onChange({ ...values, barangay: barangay?.label ?? '' });
          }}
        />
        <Input
          label="Postal code (optional)"
          helperText="Enter the postal code if you know it."
          maxLength={20}
          value={values.postalCode}
          onChange={(event) => onChange({ ...values, postalCode: event.target.value })}
        />
      </div>
      {provinceError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{provinceError}</p>
          {retryButton('provinces', () => { void provincesQuery.refetch(); })}
        </div>
      )}
      {cityError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{cityError}</p>
          {retryButton('cities', () => { void citiesQuery.refetch(); })}
        </div>
      )}
      {barangayError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{barangayError}</p>
          {retryButton('barangays', () => { void barangaysQuery.refetch(); })}
        </div>
      )}
    </section>
  );
}
