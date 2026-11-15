import { PDFDocument, TextAlignment } from 'pdf-lib';
import type { SalesReceiptImage } from '@/data/commerce/sales-receipt-images';
import {
  SALES_RECEIPT_TEMPLATE_FIELDS,
  SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS,
} from '@/data/commerce/sales-receipt-template-config';

export type SalesReceiptData = {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  receiptNumber: string;
  orderNumber: string;
  issuedAt: string;
  purchaseDate: string;
  customerName: string;
  contactNumber: string;
  ownerName: string;
  ownerAddress: string;
  branchName: string;
  storeBranch: string;
  fulfillment: string;
  productType: string;
  modelType: string;
  color: string;
  serialNumber: string;
  motorNumber: string;
  invoiceNumber: string;
  paymentMode: string;
  homeCreditAccountNumber: string;
  downpayment: string;
  terms: string;
  monthlyPayment: string;
  certificateNumber: string;
  salesInvoiceNumber: string;
  items: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  paymentMethod: string;
  payments: string;
  amountPaid: string;
  balanceDue: string;
};

export class SalesReceiptTemplateError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SalesReceiptTemplateError';
  }
}

function oneLine(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function multiline(value: string) {
  return value
    .split(/\r?\n/)
    .map(oneLine)
    .filter(Boolean)
    .join('\n');
}

export async function buildSalesReceiptFromTemplate(
  templateBytes: Uint8Array,
  data: SalesReceiptData,
  images: {
    businessLogo?: SalesReceiptImage | null;
    variantImage?: SalesReceiptImage | null;
  } = {}
): Promise<Uint8Array> {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(templateBytes);
  } catch (error) {
    throw new SalesReceiptTemplateError(
      'The configured sales receipt template could not be read as a PDF.',
      error
    );
  }

  let form: ReturnType<typeof document.getForm>;
  try {
    form = document.getForm();
  } catch (error) {
    throw new SalesReceiptTemplateError(
      'The sales receipt PDF does not contain a usable AcroForm.',
      error
    );
  }
  if (form.hasXFA()) {
    throw new SalesReceiptTemplateError(
      'The sales receipt template must use standard AcroForm fields, not XFA.'
    );
  }

  const fields = Object.values(SALES_RECEIPT_TEMPLATE_FIELDS);
  const availableFields = new Set(form.getFields().map((field) => field.getName()));
  const missingFields = fields.filter((fieldName) => !availableFields.has(fieldName));
  if (missingFields.length) {
    throw new SalesReceiptTemplateError(
      `The sales receipt template is missing these fields: ${missingFields.join(', ')}.`
    );
  }
  const imageFieldNames = Object.values(SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS);
  for (const fieldName of imageFieldNames) {
    if (!availableFields.has(fieldName)) continue;
    try {
      form.getTextField(fieldName);
    } catch (error) {
      throw new SalesReceiptTemplateError(
        `The optional "${fieldName}" image area must be a text field.`,
        error
      );
    }
  }

  const values = [
    [SALES_RECEIPT_TEMPLATE_FIELDS.businessName, data.businessName],
    [SALES_RECEIPT_TEMPLATE_FIELDS.businessAddress, data.businessAddress],
    [SALES_RECEIPT_TEMPLATE_FIELDS.businessPhone, data.businessPhone],
    [SALES_RECEIPT_TEMPLATE_FIELDS.businessEmail, data.businessEmail],
    [SALES_RECEIPT_TEMPLATE_FIELDS.receiptNumber, data.receiptNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.orderNumber, data.orderNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.issuedAt, data.issuedAt],
    [SALES_RECEIPT_TEMPLATE_FIELDS.purchaseDate, data.purchaseDate],
    [SALES_RECEIPT_TEMPLATE_FIELDS.customerName, data.customerName],
    [SALES_RECEIPT_TEMPLATE_FIELDS.contactNumber, data.contactNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.ownerName, data.ownerName],
    [SALES_RECEIPT_TEMPLATE_FIELDS.ownerAddress, data.ownerAddress],
    [SALES_RECEIPT_TEMPLATE_FIELDS.branchName, data.branchName],
    [SALES_RECEIPT_TEMPLATE_FIELDS.storeBranch, data.storeBranch],
    [SALES_RECEIPT_TEMPLATE_FIELDS.fulfillment, data.fulfillment],
    [SALES_RECEIPT_TEMPLATE_FIELDS.productType, data.productType],
    [SALES_RECEIPT_TEMPLATE_FIELDS.modelType, data.modelType],
    [SALES_RECEIPT_TEMPLATE_FIELDS.color, data.color],
    [SALES_RECEIPT_TEMPLATE_FIELDS.serialNumber, data.serialNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.motorNumber, data.motorNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.invoiceNumber, data.invoiceNumber],
    [SALES_RECEIPT_TEMPLATE_FIELDS.paymentMode, data.paymentMode],
    [
      SALES_RECEIPT_TEMPLATE_FIELDS.homeCreditAccountNumber,
      data.homeCreditAccountNumber,
    ],
    [SALES_RECEIPT_TEMPLATE_FIELDS.downpayment, data.downpayment],
    [SALES_RECEIPT_TEMPLATE_FIELDS.terms, data.terms],
    [SALES_RECEIPT_TEMPLATE_FIELDS.monthlyPayment, data.monthlyPayment],
    [
      SALES_RECEIPT_TEMPLATE_FIELDS.certificateNumber,
      data.certificateNumber,
    ],
    [
      SALES_RECEIPT_TEMPLATE_FIELDS.salesInvoiceNumber,
      data.salesInvoiceNumber,
    ],
    [SALES_RECEIPT_TEMPLATE_FIELDS.items, data.items],
    [SALES_RECEIPT_TEMPLATE_FIELDS.subtotal, data.subtotal],
    [SALES_RECEIPT_TEMPLATE_FIELDS.deliveryFee, data.deliveryFee],
    [SALES_RECEIPT_TEMPLATE_FIELDS.total, data.total],
    [SALES_RECEIPT_TEMPLATE_FIELDS.paymentMethod, data.paymentMethod],
    [SALES_RECEIPT_TEMPLATE_FIELDS.payments, data.payments],
    [SALES_RECEIPT_TEMPLATE_FIELDS.amountPaid, data.amountPaid],
    [SALES_RECEIPT_TEMPLATE_FIELDS.balanceDue, data.balanceDue],
  ] as const;
  const multilineFields = new Set<string>([
    SALES_RECEIPT_TEMPLATE_FIELDS.items,
    SALES_RECEIPT_TEMPLATE_FIELDS.payments,
  ]);

  for (const [fieldName, value] of values) {
    let field: ReturnType<typeof form.getTextField>;
    try {
      field = form.getTextField(fieldName);
    } catch (error) {
      throw new SalesReceiptTemplateError(
        `The "${fieldName}" sales receipt field must be a text field.`,
        error
      );
    }
    if (multilineFields.has(fieldName) && !field.isMultiline()) {
      throw new SalesReceiptTemplateError(
        `The ${fieldName} sales receipt field must be multiline.`
      );
    }
    try {
      field.setText(multilineFields.has(fieldName) ? multiline(value) : oneLine(value));
    } catch (error) {
      throw new SalesReceiptTemplateError(
        `The "${fieldName}" sales receipt field could not accept its value.`,
        error
      );
    }
  }

  try {
    form.updateFieldAppearances();
    const imageFields = [
      [SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS.businessLogo, images.businessLogo],
      [SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS.variantImage, images.variantImage],
    ] as const;
    for (const [fieldName, image] of imageFields) {
      if (!image) continue;
      if (!availableFields.has(fieldName)) {
        throw new SalesReceiptTemplateError(
          `Add a text field named "${fieldName}" to the template to display this image.`
        );
      }
      const field = form.getTextField(fieldName);
      field.setText('');
      field.setAlignment(TextAlignment.Center);
      const embeddedImage = await document.embedJpg(image.bytes);
      field.setImage(embeddedImage);
    }
    form.flatten();
    return await document.save();
  } catch (error) {
    if (error instanceof SalesReceiptTemplateError) throw error;
    throw new SalesReceiptTemplateError(
      'The sales receipt values could not be placed in this template.',
      error
    );
  }
}

export async function validateSalesReceiptTemplate(
  templateBytes: Uint8Array
): Promise<void> {
  await buildSalesReceiptFromTemplate(templateBytes, {
    businessName: 'Sample business',
    businessAddress: 'Sample address',
    businessPhone: '0000000000',
    businessEmail: 'sample@example.com',
    receiptNumber: 'SAMPLE-000001',
    orderNumber: 'NJET-000001',
    issuedAt: '15 November 2026',
    purchaseDate: '15 November 2026',
    customerName: 'Sample customer',
    contactNumber: '0000000000',
    ownerName: 'Sample customer',
    ownerAddress: 'Sample address',
    branchName: 'Sample branch',
    storeBranch: 'Sample branch',
    fulfillment: 'Pickup',
    productType: 'Electric Bicycle',
    modelType: 'Sample model',
    color: 'Black',
    serialNumber: 'SAMPLE-SERIAL',
    motorNumber: 'SAMPLE-MOTOR',
    invoiceNumber: 'SAMPLE-000001',
    paymentMode: 'Home Credit',
    homeCreditAccountNumber: 'SAMPLE-ACCOUNT',
    downpayment: 'PHP 0.00',
    terms: '12 months',
    monthlyPayment: 'PHP 1,000.00',
    certificateNumber: 'CO-NJET-000001',
    salesInvoiceNumber: 'SAMPLE-000001',
    items: '1 x Sample product - PHP 1,000.00',
    subtotal: 'PHP 1,000.00',
    deliveryFee: 'PHP 0.00',
    total: 'PHP 1,000.00',
    paymentMethod: 'Cash',
    payments: 'Collection - Cash: PHP 1,000.00',
    amountPaid: 'PHP 1,000.00',
    balanceDue: 'PHP 0.00',
  });
}
