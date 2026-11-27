import { z } from 'zod';

export const PHILIPPINE_MOBILE_ERROR =
  'Enter a valid 11-digit mobile number (e.g., 09171234567).';

export const PHILIPPINE_MOBILE_PATTERN = /^09\d{9}$/;

export const philippineMobileSchema = z.string({ error: PHILIPPINE_MOBILE_ERROR })
  .regex(PHILIPPINE_MOBILE_PATTERN, PHILIPPINE_MOBILE_ERROR);
