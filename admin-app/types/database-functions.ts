import type { DatabaseCommerceFunctions } from './database-functions-commerce';
import type { DatabaseDiscountFunctions } from './database-functions-discounts';
import type { DatabaseCoreFunctions } from './database-functions-core';
import type { DatabaseStorefrontFunctions } from './database-functions-storefront';
import type { DatabaseReceiptFunctions } from './database-functions-receipts';
import type { DatabaseSupportChatFunctions } from './database-functions-support-chat';

export type DatabaseFunctions =
  & DatabaseCommerceFunctions
  & DatabaseDiscountFunctions
  & DatabaseStorefrontFunctions
  & DatabaseCoreFunctions
  & DatabaseReceiptFunctions
  & DatabaseSupportChatFunctions;
