import type { Metadata } from 'next';
import {
  LegalPolicyPage,
  LegalPolicyUnavailable,
} from '@/components/layout/LegalPolicyPage';
import { getStorefrontLegalPolicy } from '@/data/commerce/legal-policies';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms for using the Noel & Jane E-bike Trading storefront and placing orders.',
};

export default async function TermsPage() {
  const { data, error } = await getStorefrontLegalPolicy('terms');
  return data
    ? <LegalPolicyPage policy={data} />
    : <LegalPolicyUnavailable message={error ?? 'Please refresh the page and try again.'} />;
}
