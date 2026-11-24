import type { PhilippineAddressValues } from '@/components/admin/commerce/PhilippineAddressFields';
import type { Database } from '@/types/database';

export const savedAddressColumns =
  'street_address, province_code, province_name, city_code, city_name, barangay_code, barangay_name, postal_code';

type SavedAddress = Pick<Database['public']['Tables']['users']['Row'],
  'street_address' | 'province_code' | 'province_name' | 'city_code' | 'city_name'
  | 'barangay_code' | 'barangay_name' | 'postal_code'>;

export function resolveCheckoutAddress(address?: SavedAddress | null): PhilippineAddressValues {
  return {
    addressLine1: address?.street_address?.trim() ?? '',
    provinceCode: address?.province_code?.trim() ?? '',
    province: address?.province_name?.trim() ?? '',
    cityCode: address?.city_code?.trim() ?? '',
    city: address?.city_name?.trim() ?? '',
    barangayCode: address?.barangay_code?.trim() ?? '',
    barangay: address?.barangay_name?.trim() ?? '',
    postalCode: address?.postal_code?.trim() ?? '',
  };
}
