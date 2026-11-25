import type { CrmFunctions } from './crm';
import type { DatabaseCommerceFunctions } from './database-functions-commerce';
import type { DatabaseDiscountFunctions } from './database-functions-discounts';
import type { DatabaseCoreFunctions } from './database-functions-core';
import type { DatabaseStorefrontFunctions } from './database-functions-storefront';
import type { DatabaseReceiptFunctions } from './database-functions-receipts';
import type { DatabaseSupportChatFunctions } from './database-functions-support-chat';
import type { DatabaseProductReviewFunctions } from './database-functions-product-reviews';
import type { DatabasePhoneVerificationFunctions } from './database-functions-phone-verification';

export type DatabaseFunctions =
  & CrmFunctions
  & DatabaseCommerceFunctions
  & DatabaseDiscountFunctions
  & DatabaseStorefrontFunctions
  & DatabaseCoreFunctions
  & DatabaseReceiptFunctions
  & DatabaseSupportChatFunctions
  & DatabaseProductReviewFunctions
  & DatabasePhoneVerificationFunctions
