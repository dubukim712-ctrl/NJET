import type { DatabaseCommerceFunctions } from './database-functions-commerce';
import type { DatabaseCoreFunctions } from './database-functions-core';
import type { DatabaseStorefrontFunctions } from './database-functions-storefront';

export type DatabaseFunctions =
  & DatabaseCommerceFunctions
  & DatabaseStorefrontFunctions
  & DatabaseCoreFunctions;
