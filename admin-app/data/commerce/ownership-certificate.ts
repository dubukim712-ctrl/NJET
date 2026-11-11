import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';
import { OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS } from './ownership-certificate-template-config';

export interface OwnershipCertificateRow {
  productName: string;
  variantName: string;
  sku: string;
  serialNumber: string;
  motorNumber: string;
}

export interface OwnershipCertificateData {
  customerName: string;
  orderNumber: string;
  issuedAt: string;
  rows: OwnershipCertificateRow[];
}

const ROWS_PER_PAGE = 24;
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
  const customerNameField = getTextField(
    OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.customerName
  );
  const orderNumberField = getTextField(
    OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.orderNumber
  );
  const issuedAtField = getTextField(
    OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.issuedAt
  );
  const ebikeDetailsField = getTextField(
    OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS.ebikeDetails
  );

  if (!ebikeDetailsField.isMultiline()) {
    throw new OwnershipCertificateTemplateError(
      'The ebike_details field must be a multiline text field.'
    );
  }

  const singleLine = (value: string) => value.replace(/\s+/g, ' ').trim();
  customerNameField.setText(singleLine(data.customerName));
  orderNumberField.setText(singleLine(data.orderNumber));
  issuedAtField.setText(singleLine(data.issuedAt));
  ebikeDetailsField.setText(
    data.rows
      .map((row) => [
        `${singleLine(row.productName)} ${singleLine(row.variantName)} (${singleLine(row.sku)})`,
        `Serial: ${singleLine(row.serialNumber)}`,
        `Motor: ${singleLine(row.motorNumber)}`,
      ].join(' | '))
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
    orderNumber: '',
    issuedAt: '',
    rows: [],
  });
}

export async function buildOwnershipCertificate(
  data: OwnershipCertificateData
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(`Certificate of Ownership - ${data.orderNumber}`);
  document.setSubject(SAMPLE_NOTICE);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages = Math.ceil(data.rows.length / ROWS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const page = document.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const rows = data.rows.slice(
      pageIndex * ROWS_PER_PAGE,
      (pageIndex + 1) * ROWS_PER_PAGE
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
    page.drawText(`Order: ${data.orderNumber}`, {
      x: 48,
      y: height - 118,
      size: 11,
      font: regular,
    });
    page.drawText(`Owner: ${data.customerName}`, {
      x: 48,
      y: height - 137,
      size: 11,
      font: regular,
      maxWidth: width - 96,
    });
    page.drawText(`Issued: ${data.issuedAt}`, {
      x: 48,
      y: height - 156,
      size: 11,
      font: regular,
    });
    page.drawText(
      'This sample records the ownership details for the e-bike units listed below.',
      {
        x: 48,
        y: height - 178,
        size: 9,
        font: regular,
        maxWidth: width - 96,
      }
    );

    const headerY = height - 202;
    page.drawText('E-BIKE', { x: 48, y: headerY, size: 9, font: bold });
    page.drawText('SERIAL NUMBER', { x: 245, y: headerY, size: 9, font: bold });
    page.drawText('MOTOR NUMBER', { x: 400, y: headerY, size: 9, font: bold });
    page.drawLine({
      start: { x: 48, y: headerY - 6 },
      end: { x: width - 48, y: headerY - 6 },
      thickness: 0.7,
      color: rgb(0.65, 0.69, 0.67),
    });

    rows.forEach((row, rowIndex) => {
      const y = headerY - 24 - rowIndex * 21;
      page.drawText(`${row.productName} ${row.variantName} (${row.sku})`, {
        x: 48,
        y,
        size: 8,
        font: regular,
        maxWidth: 188,
      });
      page.drawText(row.serialNumber, {
        x: 245,
        y,
        size: 8,
        font: regular,
        maxWidth: 145,
      });
      page.drawText(row.motorNumber, {
        x: 400,
        y,
        size: 8,
        font: regular,
        maxWidth: width - 448,
      });
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
