import type { Metadata } from 'next';
import {
  LegalPolicyPage,
  LegalPolicyUnavailable,
} from '@/components/layout/LegalPolicyPage';
import { getStorefrontLegalPolicy } from '@/data/commerce/legal-policies';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Noel & Jane E-bike Trading handles account and order information.',
};

export default async function PrivacyPage() {
  const { data, error } = await getStorefrontLegalPolicy('privacy');
  return data
    ? <LegalPolicyPage policy={data} />
    : <LegalPolicyUnavailable message={error ?? 'Please refresh the page and try again.'} />;
}
