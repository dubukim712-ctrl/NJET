'use client';

import { useCallback, useState } from 'react';
import type { DiscountQuoteRow } from '@/lib/validations/product-discount';

export function useDiscountQuote(signature: string) {
  const [preview, setPreview] = useState<{
    signature: string;
    code: string;
    rows: DiscountQuoteRow[];
  } | null>(null);

  const onApplied = useCallback((code: string, rows: DiscountQuoteRow[]) => {
    setPreview({ signature, code, rows });
  }, [signature]);
  const onCleared = useCallback(() => setPreview(null), []);

  return {
    activePreview: preview?.signature === signature ? preview : null,
    onApplied,
    onCleared,
  };
}
