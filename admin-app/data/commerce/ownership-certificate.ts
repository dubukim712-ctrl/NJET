import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS } from './ownership-certificate-template-config';

export interface OwnershipCertificateProduct {
  productName: string;
  variantName: string;
  quantity: number;
}

export interface OwnershipCertificateData {
  customerName: string;
  customerAddress: string;
  products: OwnershipCertificateProduct[];
  branchName: string;
  certificateNumber: string;
}

const PRODUCTS_PER_PAGE = 24;
const SAMPLE_NOTICE = 'SAMPLE - NOT AN OFFICIAL DOCUMENT';

export class OwnershipCertificateTemplateError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'OwnershipCertificateTemplateError';
  }
}

export async function buildOwnershipCertificateFromTemplate(
  templateBytes: Uint8Array,
  data: OwnershipCertificateData
): Promise<Uint8Array> {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(templateBytes);
  } catch (error) {
    throw new OwnershipCertificateTemplateError(
      'The configured ownership certificate template could not be read as a PDF.',
      error
    );
  }

  const form = document.getForm();
  if (form.hasXFA()) {
    throw new OwnershipCertificateTemplateError(
      'The ownership certificate template must use standard AcroForm fields, not XFA.'
    );
  }

  const fields = Object.values(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS);
  const availableFields = new Set(form.getFields().map((field) => field.getName()));
  const missingFields = fields.filter((fieldName) => !availableFields.has(fieldName));
  if (missingFields.length) {
    throw new OwnershipCertificateTemplateError(
      `The ownership certificate template is missing these fields: ${missingFields.join(', ')}.`
    );
  }

  const getTextField = (fieldName: string) => {
    try {
      return form.getTextField(fieldName);
    } catch (error) {
      throw new OwnershipCertificateTemplateError(
        `The "${fieldName}" ownership certificate field must be a text field.`,
        error
      );
    }
  };
  const customerNameField = getTextField(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.customerName);
  const customerAddressField = getTextField(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.customerAddress);
  const productDetailsField = getTextField(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.productDetails);
  const branchNameField = getTextField(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.branchName);
  const certificateNumberField = getTextField(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.certificateNumber);

  if (!productDetailsField.isMultiline()) {
    throw new OwnershipCertificateTemplateError(
      'The product_details field must be a multiline text field.'
    );
  }

  const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();
  customerNameField.setText(singleLine(data.customerName));
  customerAddressField.setText(singleLine(data.customerAddress));
  branchNameField.setText(singleLine(data.branchName));
  certificateNumberField.setText(singleLine(data.certificateNumber));
  productDetailsField.setText(
    data.products
      .map((product) => `${singleLine(product.productName)} - ${singleLine(product.variantName)}${product.quantity > 1 ? ` x ${product.quantity}` : ''}`)
      .join('\n')
  );

  form.updateFieldAppearances();
  form.flatten();
  return document.save();
}

export async function validateOwnershipCertificateTemplate(
  templateBytes: Uint8Array
): Promise<void> {
  await buildOwnershipCertificateFromTemplate(templateBytes, {
    customerName: '',
    customerAddress: '',
    products: [],
    branchName: '',
    certificateNumber: '',
  });
}

export async function buildOwnershipCertificate(
  data: OwnershipCertificateData
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Certificate of Ownership - ${data.certificateNumber}`);
  document.setSubject(SAMPLE_NOTICE);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = Math.max(1, Math.ceil(data.products.length / PRODUCTS_PER_PAGE));

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const page = document.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const products = data.products.slice(
      pageIndex * PRODUCTS_PER_PAGE,
      (pageIndex + 1) * PRODUCTS_PER_PAGE
    );

    page.drawText('CERTIFICATE OF OWNERSHIP', {
      x: 48,
      y: height - 58,
      size: 19,
      font: bold,
      color: rgb(0.08, 0.18, 0.15),
    });
    page.drawText(SAMPLE_NOTICE, {
      x: 48,
      y: height - 82,
      size: 10,
      font: bold,
      color: rgb(0.72, 0.2, 0.12),
    });
    page.drawText(`Certificate No: ${data.certificateNumber}`, {
      x: 48,
      y: height - 118,
      size: 11,
      font: regular,
    });
    page.drawText(`Customer: ${data.customerName}`, {
      x: 48,
      y: height - 137,
      size: 11,
      font: regular,
    });
    page.drawText(`Address: ${data.customerAddress}`, {
      x: 48,
      y: height - 156,
      size: 11,
      font: regular,
      maxWidth: width - 96,
    });
    page.drawText(`Branch: ${data.branchName}`, {
      x: 48,
      y: height - 175,
      size: 11,
      font: regular,
    });

    const headerY = height - 205;
    page.drawText('PRODUCT + VARIANT', { x: 48, y: headerY, size: 9, font: bold });
    page.drawLine({
      start: { x: 48, y: headerY - 6 },
      end: { x: width - 48, y: headerY - 6 },
      thickness: 0.7,
      color: rgb(0.65, 0.69, 0.67),
    });

    products.forEach((product, productIndex) => {
      const y = headerY - 24 - productIndex * 21;
      page.drawText(
        `${product.productName} - ${product.variantName}${product.quantity > 1 ? ` x ${product.quantity}` : ''}`,
        {
        x: 48,
        y,
        size: 9,
        font: regular,
        maxWidth: width - 96,
        }
      );
    });

    page.drawText(`Page ${pageIndex + 1} of ${pages}`, {
      x: width - 102,
      y: 34,
      size: 9,
      font: regular,
      color: rgb(0.35, 0.38, 0.36),
    });
  }

  return document.save();
}
