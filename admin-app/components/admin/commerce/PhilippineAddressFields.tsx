'use client';

import { useEffect, useState } from 'react';
import {
  getPhilippineBarangaysAction,
  getPhilippineCitiesAction,
  getPhilippineProvincesAction,
  type PhilippineLocationOption,
} from '@/data/actions/philippine-locations';
import { PhilippineAddressAutofill } from '@/components/admin/commerce/PhilippineAddressAutofill';
import { Input } from '@/components/ui/Input';
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/ui/SearchableSelect';

export type PhilippineAddressValues = {
  addressLine1: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
};

function toOptions(locations: PhilippineLocationOption[]): SearchableSelectOption[] {
  return locations.map(({ code, name }) => ({ value: code, label: name }));
}

export function PhilippineAddressFields({
  values,
  onChange,
  disabled,
  required = false,
}: {
  values: PhilippineAddressValues;
  onChange: (values: PhilippineAddressValues) => void;
  disabled: boolean;
  required?: boolean;
}) {
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const [provinces, setProvinces] = useState<SearchableSelectOption[]>([]);
  const [cities, setCities] = useState<SearchableSelectOption[]>([]);
  const [barangays, setBarangays] = useState<SearchableSelectOption[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(true);
  const [cityLoading, setCityLoading] = useState(false);
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [barangayError, setBarangayError] = useState<string | null>(null);
  const [provinceRetry, setProvinceRetry] = useState(0);
  const [cityRetry, setCityRetry] = useState(0);
  const [barangayRetry, setBarangayRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void getPhilippineProvincesAction()
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setProvinceError(result.error);
          return;
        }
        setProvinces(toOptions(result.data));
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Could not load Philippine provinces.', error);
        setProvinceError('Could not load provinces. Check your connection and retry.');
      })
      .finally(() => {
        if (active) setProvinceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [provinceRetry]);

  useEffect(() => {
    if (!provinceCode) return;
    let active = true;
    void getPhilippineCitiesAction(provinceCode)
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setCityError(result.error);
          return;
        }
        setCities(toOptions(result.data));
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Could not load cities and municipalities.', error);
        setCityError('Could not load cities. Check your connection and retry.');
      })
      .finally(() => {
        if (active) setCityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [provinceCode, cityRetry]);

  useEffect(() => {
    if (!cityCode) return;
    let active = true;
    void getPhilippineBarangaysAction(cityCode)
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setBarangayError(result.error);
          return;
        }
        setBarangays(toOptions(result.data));
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Could not load barangays.', error);
        setBarangayError('Could not load barangays. Check your connection and retry.');
      })
      .finally(() => {
        if (active) setBarangayLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cityCode, barangayRetry]);

  const selectedProvince = (code: string) => {
    if (code === provinceCode) return;
    setProvinceCode(code);
    setCityCode('');
    setBarangayCode('');
    setCities([]);
    setBarangays([]);
    setCityLoading(Boolean(code));
    setBarangayLoading(false);
    setCityError(null);
    setBarangayError(null);
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
    setBarangays([]);
    setBarangayLoading(Boolean(code));
    setBarangayError(null);
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
        <PhilippineAddressAutofill
          provinces={provinces}
          disabled={disabled || provinceLoading || Boolean(provinceError)}
          onAddressFound={(location) => {
            setProvinceCode(location.provinceCode);
            setCityCode(location.cityCode);
            setBarangayCode(location.barangayCode);
            setCities(location.cities);
            setBarangays(location.barangays);
            setCityLoading(false);
            setBarangayLoading(false);
            setCityError(null);
            setBarangayError(null);
            onChange({
              ...values,
              province: location.province,
              city: location.city,
              barangay: location.barangay,
              postalCode: location.postalCode,
            });
          }}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Street address"
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
          helperText={provinceLoading ? 'Loading provinces…' : undefined}
          emptyMessage="No matching province."
          required={required}
          onChange={selectedProvince}
        />
        <SearchableSelect
          label="City / municipality"
          value={cityCode}
          options={cities}
          disabled={disabled || !provinceCode || cityLoading || Boolean(cityError)}
          helperText={cityLoading ? 'Loading cities and municipalities…' : undefined}
          emptyMessage="No matching city or municipality."
          required={required}
          onChange={selectedCity}
        />
        <SearchableSelect
          label="Barangay"
          value={barangayCode}
          options={barangays}
          disabled={disabled || !cityCode || barangayLoading || Boolean(barangayError)}
          helperText={barangayLoading ? 'Loading barangays…' : undefined}
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
          maxLength={20}
          value={values.postalCode}
          onChange={(event) => onChange({ ...values, postalCode: event.target.value })}
        />
      </div>
      {provinceError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{provinceError}</p>
          {retryButton('provinces', () => {
            setProvinceLoading(true);
            setProvinceError(null);
            setProvinceRetry((attempt) => attempt + 1);
          })}
        </div>
      )}
      {cityError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{cityError}</p>
          {retryButton('cities', () => {
            setCityLoading(true);
            setCityError(null);
            setCityRetry((attempt) => attempt + 1);
          })}
        </div>
      )}
      {barangayError && (
        <div className="space-y-1">
          <p className="text-sm text-destructive" role="alert">{barangayError}</p>
          {retryButton('barangays', () => {
            setBarangayLoading(true);
            setBarangayError(null);
            setBarangayRetry((attempt) => attempt + 1);
          })}
        </div>
      )}
    </section>
  );
}
