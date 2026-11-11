import { z } from 'zod';
import { homeCreditProcessingSchema } from '@/lib/validations/home-credit-processing';

const addressField = z.string().trim().max(200).nullable();

export const walkInSaleSchema = z
  .object({
    customerName: z.string().trim().min(2).max(100),
    contactNumber: z.string().trim().regex(/^[+0-9][0-9 ()-]{6,19}$/),
    branchId: z.string().uuid(),
    paymentMethod: z.enum(['cash', 'online', 'home_credit']),
    paymentProvider: z.enum(['gcash', 'bank_transfer', 'card']).nullable(),
    paymentReference: z.string().trim().max(120).nullable(),
    cashTenderedMinor: z.number().int().min(0).max(2147483647).nullable(),
    addressLine1: addressField,
    barangay: addressField,
    city: addressField,
    province: addressField,
    postalCode: z.string().trim().max(20).nullable(),
    homeCreditDetails: homeCreditProcessingSchema.nullable(),
    items: z
      .array(
        z.object({
          variantId: z.string().uuid(),
          quantity: z.number().int().min(1).max(99),
        })
      )
      .min(1)
      .max(30),
  })
  .superRefine((sale, context) => {
    const addIssue = (path: string, message: string) =>
      context.addIssue({ code: 'custom', path: [path], message });

    if (new Set(sale.items.map((item) => item.variantId)).size !== sale.items.length) {
      addIssue('items', 'Remove duplicate products from the cart.');
    }

    if (sale.paymentMethod === 'cash') {
      if (sale.cashTenderedMinor === null) {
        addIssue('cashTenderedMinor', 'Enter the cash tendered.');
      }
      if (sale.paymentProvider || sale.paymentReference) {
        addIssue('paymentMethod', 'Remove online payment details for cash.');
      }
    } else if (sale.paymentMethod === 'online') {
      if (!sale.paymentProvider) {
        addIssue('paymentProvider', 'Choose an online payment provider.');
      }
      if (!sale.paymentReference) {
        addIssue('paymentReference', 'Enter the online payment reference.');
      }
      if (sale.cashTenderedMinor !== null) {
        addIssue('cashTenderedMinor', 'Cash tendered is only used for cash sales.');
      }
    } else {
      if (
        sale.paymentProvider ||
        sale.paymentReference ||
        sale.cashTenderedMinor !== null
      ) {
        addIssue('paymentMethod', 'Remove payment details that do not match Home Credit.');
      }
    }

    if (sale.paymentMethod === 'home_credit' && !sale.homeCreditDetails) {
      addIssue('homeCreditDetails', 'Enter the Home Credit agreement details.');
    } else if (sale.paymentMethod !== 'home_credit' && sale.homeCreditDetails) {
      addIssue('homeCreditDetails', 'Home Credit details are only used for Home Credit sales.');
    }

  });

export type WalkInSaleInput = z.infer<typeof walkInSaleSchema>;
