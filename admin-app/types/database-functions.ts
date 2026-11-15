import type { DatabaseCommerceFunctions } from './database-functions-commerce';
import type { DatabaseCoreFunctions } from './database-functions-core';
import type { DatabaseStorefrontFunctions } from './database-functions-storefront';
import type { DatabaseReceiptFunctions } from './database-functions-receipts';

export type DatabaseFunctions =
  & DatabaseCommerceFunctions
  & DatabaseStorefrontFunctions
  & DatabaseCoreFunctions
  & DatabaseReceiptFunctions;
