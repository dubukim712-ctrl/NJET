import type { Metadata } from 'next';
import {
  LegalPolicyPage,
  LegalPolicyUnavailable,
} from '@/components/layout/LegalPolicyPage';
import { getStorefrontLegalPolicy } from '@/data/commerce/legal-policies';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Return Policy',
  description: 'Order issue, warranty service, return, and refund information for NJET customers.',
};

export default async function ReturnPolicyPage() {
  const { data, error } = await getStorefrontLegalPolicy('return-policy');
  return data
    ? <LegalPolicyPage policy={data} />
    : <LegalPolicyUnavailable message={error ?? 'Please refresh the page and try again.'} />;
}
