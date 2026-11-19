const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, PageSizes, StandardFonts, rgb } = require('pdf-lib');

const ink = rgb(0.13, 0.18, 0.17);
const muted = rgb(0.36, 0.42, 0.4);
const line = rgb(0.76, 0.8, 0.78);
const values = {
  business_name: 'Sample E-Bike Trading',
  business_address: '123 Sample Street, Imus, Cavite',
  business_phone: '0917 000 0000',
  business_email: 'receipts@example.com',
  receipt_number: 'SI-000042',
  order_number: 'NJET-000042',
  issued_at: 'November 15, 2026',
  purchase_date: 'November 15, 2026',
  customer_name: 'Sample Buyer',
  contact_number: '0917 111 1111',
  owner_name: 'Sample Buyer',
  owner_address: '45 Sample Road, Imus, Cavite 4103',
  branch_name: 'Imus Branch',
  store_branch: 'Imus Branch',
  branch_address: '123 Sample Street, Imus, Cavite',
  fulfillment: 'Branch pickup',
  product_type: 'Electric Bicycle',
  model_type: 'Cruiser',
  color: 'Matte Blue',
  serial_number: 'SER-SAMPLE-0001',
  motor_number: 'MOT-SAMPLE-0001',
  invoice_number: 'SI-000042',
  payment_mode: 'Home Credit',
  home_credit_account_number: 'HC-SAMPLE-0042',
  downpayment: 'PHP 2,000.00',
  terms: '15 months',
  monthly_payment: 'PHP 3,200.00',
  certificate_of_ownership_number: 'CO-NJET-000042',
  sales_invoice_number: 'SI-000042',
  items: '1 x Cruiser - Matte Blue (CR-BL-01) - PHP 50,000.00',
  subtotal: 'PHP 50,000.00',
  delivery_fee: 'PHP 0.00',
  total: 'PHP 50,000.00',
  payment_method: 'Home Credit',
  payments: 'Downpayment - Home Credit: PHP 2,000.00\nFinancing - Home Credit: PHP 48,000.00',
  amount_paid: 'PHP 50,000.00',
  balance_due: 'PHP 0.00',
};

async function main() {
  const document = await PDFDocument.create();
  document.setTitle('Sample Fillable Sales Receipt');
  document.setSubject('Sample AcroForm template for NJET sales receipts');
  const page = document.addPage(PageSizes.A4);
  const { width } = page.getSize();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const form = document.getForm();
  let y = 746;

  page.drawRectangle({
    x: 0,
    y: 782,
    width,
    height: 60,
    color: rgb(0.93, 0.96, 0.94),
  });
  page.drawText('SAMPLE SALES RECEIPT', {
    x: 38,
    y: 814,
    size: 15,
    font: bold,
    color: ink,
  });
  page.drawText('FILLABLE TEMPLATE - SAMPLE DATA ONLY', {
    x: 38,
    y: 797,
    size: 7,
    font: bold,
    color: muted,
  });
  addImageField('Business logo', 'business_logo', width - 113, 790, 75, 38);

  function addField(label, name, x, fieldY, fieldWidth, height = 17) {
    page.drawText(label.toUpperCase(), {
      x,
      y: fieldY + height + 3,
      size: 6,
      font: bold,
      color: muted,
    });
    const field = form.createTextField(name);
    if (name === 'items' || name === 'payments') field.enableMultiline();
    field.setText(values[name] ?? '');
    field.addToPage(page, {
      x,
      y: fieldY,
      width: fieldWidth,
      height,
      font,
      fontSize: 7.5,
      textColor: ink,
      borderColor: line,
      borderWidth: 0.6,
      backgroundColor: rgb(1, 1, 1),
    });
  }

  function addRow(fields, height = 17) {
    const margin = 38;
    const gap = 8;
    const availableWidth = width - margin * 2 - gap * (fields.length - 1);
    const totalWeight = fields.reduce((sum, field) => sum + (field.weight ?? 1), 0);
    let x = margin;
    for (const field of fields) {
      const fieldWidth = availableWidth * (field.weight ?? 1) / totalWeight;
      addField(field.label, field.name, x, y, fieldWidth, height);
      x += fieldWidth + gap;
    }
    y -= height + 15;
  }

  function addImageField(label, name, x, fieldY, fieldWidth, height) {
    page.drawText(label.toUpperCase(), {
      x,
      y: fieldY + height + 3,
      size: 6,
      font: bold,
      color: muted,
    });
    const field = form.createTextField(name);
    field.setText('');
    field.addToPage(page, {
      x,
      y: fieldY,
      width: fieldWidth,
      height,
      font,
      fontSize: 7.5,
      textColor: ink,
      borderColor: line,
      borderWidth: 0.6,
      backgroundColor: rgb(1, 1, 1),
    });
  }

  addRow([{ label: 'Business name', name: 'business_name' }]);
  addRow([{ label: 'Business address', name: 'business_address' }]);
  addRow([
    { label: 'Phone', name: 'business_phone' },
    { label: 'Email', name: 'business_email' },
  ]);
  addRow([
    { label: 'Receipt no.', name: 'receipt_number' },
    { label: 'Invoice no.', name: 'invoice_number' },
    { label: 'Sales invoice no.', name: 'sales_invoice_number' },
  ]);
  addRow([
    { label: 'Order no.', name: 'order_number' },
    { label: 'Issued at', name: 'issued_at' },
    { label: 'Date of purchase', name: 'purchase_date' },
  ]);
  addRow([
    { label: 'Product type', name: 'product_type' },
    { label: 'Model type', name: 'model_type' },
    { label: 'Color / variant', name: 'color' },
  ]);
  addRow([
    { label: 'Serial no.', name: 'serial_number' },
    { label: 'Motor no.', name: 'motor_number' },
  ]);
  addRow([
    { label: 'Customer name', name: 'customer_name' },
    { label: 'Name of owner', name: 'owner_name' },
    { label: 'Contact no.', name: 'contact_number' },
  ]);
  addRow([{ label: 'Postal address', name: 'owner_address' }]);
  addRow([
    { label: 'Branch', name: 'branch_name' },
    { label: 'Store branch', name: 'store_branch' },
    { label: 'Fulfillment', name: 'fulfillment' },
  ]);
  addRow([{ label: 'Branch address', name: 'branch_address' }]);
  addRow([
    { label: 'Payment method', name: 'payment_method' },
    { label: 'Mode of payment', name: 'payment_mode' },
    { label: 'Home Credit account no.', name: 'home_credit_account_number', weight: 1.5 },
  ]);
  addRow([
    { label: 'Downpayment', name: 'downpayment' },
    { label: 'Terms', name: 'terms' },
    { label: 'Monthly payment', name: 'monthly_payment' },
  ]);
  addRow([{ label: 'Certificate of ownership no.', name: 'certificate_of_ownership_number' }]);
  addField('Items', 'items', 38, y, width - 38 * 2 - 132, 58);
  addImageField('Variant image', 'variant_image', width - 38 - 124, y, 124, 58);
  y -= 73;
  addRow([
    { label: 'Subtotal', name: 'subtotal' },
    { label: 'Delivery fee', name: 'delivery_fee' },
    { label: 'Total', name: 'total' },
  ]);
  addRow([{ label: 'Payments', name: 'payments' }], 35);
  addRow([
    { label: 'Amount paid', name: 'amount_paid' },
    { label: 'Balance due', name: 'balance_due' },
  ]);

  const signatureY = Math.max(32, y - 6);
  for (const x of [48, width / 2 + 20]) {
    page.drawLine({
      start: { x, y: signatureY },
      end: { x: x + 190, y: signatureY },
      thickness: 0.7,
      color: line,
    });
  }
  page.drawText('BUYER SIGNATURE', {
    x: 48,
    y: signatureY - 12,
    size: 6,
    font: bold,
    color: muted,
  });
  page.drawText('AUTHORIZED DEALER', {
    x: width / 2 + 20,
    y: signatureY - 12,
    size: 6,
    font: bold,
    color: muted,
  });
  page.drawText('SAMPLE ONLY - NOT A VALID SALES DOCUMENT', {
    x: 38,
    y: 18,
    size: 6,
    font: bold,
    color: muted,
  });

  form.updateFieldAppearances(font);
  const output = path.join(__dirname, '..', 'public', 'sales-receipt-sample.pdf');
  await fs.writeFile(output, await document.save());
  console.log(`Created ${output}`);
}

main().catch((error) => {
  console.error('Could not generate the sample sales receipt PDF.', error);
  process.exitCode = 1;
});
