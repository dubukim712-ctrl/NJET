const fs = require('node:fs/promises');
const path = require('node:path');
const { PDFDocument, PageSizes, StandardFonts, rgb } = require('pdf-lib');

const ink = rgb(0.13, 0.18, 0.17);
const muted = rgb(0.36, 0.42, 0.4);
const line = rgb(0.76, 0.8, 0.78);
const values = {
  customer_name: 'Sample Buyer',
  customer_address: '45 Sample Road, Imus, Cavite 4103',
  product_details: 'Cruiser - Matte Blue',
  branch_name: 'Imus Branch',
  certificate_number: 'CO-NJET-000042',
};

async function main() {
  const document = await PDFDocument.create();
  document.setTitle('Sample Fillable Certificate of Ownership');
  document.setSubject('Sample AcroForm template for NJET ownership certificates');
  const page = document.addPage(PageSizes.A4);
  const { width } = page.getSize();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const form = document.getForm();

  page.drawRectangle({
    x: 0,
    y: 762,
    width,
    height: 80,
    color: rgb(0.93, 0.96, 0.94),
  });
  page.drawText('CERTIFICATE OF OWNERSHIP', {
    x: 42,
    y: 812,
    size: 17,
    font: bold,
    color: ink,
  });
  page.drawText('FILLABLE TEMPLATE - SAMPLE DATA ONLY', {
    x: 42,
    y: 791,
    size: 7,
    font: bold,
    color: muted,
  });

  function addField(label, name, x, y, fieldWidth, height) {
    page.drawText(label.toUpperCase(), {
      x,
      y: y + height + 4,
      size: 7,
      font: bold,
      color: muted,
    });
    const field = form.createTextField(name);
    if (name === 'product_details') field.enableMultiline();
    field.setText(values[name]);
    field.addToPage(page, {
      x,
      y,
      width: fieldWidth,
      height,
      font,
      fontSize: name === 'product_details' ? 10 : 9,
      textColor: ink,
      borderColor: line,
      borderWidth: 0.7,
      backgroundColor: rgb(1, 1, 1),
    });
  }

  const margin = 42;
  const gap = 12;
  const columnWidth = (width - margin * 2 - gap) / 2;
  addField('Customer name', 'customer_name', margin, 700, width - margin * 2, 24);
  addField('Customer address', 'customer_address', margin, 640, width - margin * 2, 24);
  addField('Branch name', 'branch_name', margin, 580, columnWidth, 22);
  addField(
    'Certificate number',
    'certificate_number',
    margin + columnWidth + gap,
    580,
    columnWidth,
    22
  );

  page.drawText('PRODUCT + VARIANT', {
    x: margin,
    y: 548,
    size: 9,
    font: bold,
    color: ink,
  });
  addField(
    'Product name and variant name',
    'product_details',
    margin,
    430,
    width - margin * 2,
    105
  );
  page.drawText(
    'This sample records ownership information for the product and variant listed above.',
    {
      x: margin,
      y: 440,
      size: 8,
      font,
      color: muted,
    }
  );

  for (const x of [margin, width / 2 + 12]) {
    page.drawLine({
      start: { x, y: 335 },
      end: { x: x + 210, y: 335 },
      thickness: 0.7,
      color: line,
    });
  }
  page.drawText('OWNER SIGNATURE', {
    x: margin,
    y: 321,
    size: 7,
    font: bold,
    color: muted,
  });
  page.drawText('AUTHORIZED DEALER', {
    x: width / 2 + 12,
    y: 321,
    size: 7,
    font: bold,
    color: muted,
  });
  page.drawText('SAMPLE ONLY - NOT AN OFFICIAL DOCUMENT', {
    x: margin,
    y: 28,
    size: 7,
    font: bold,
    color: muted,
  });

  form.updateFieldAppearances(font);
  const output = path.join(__dirname, '..', 'public', 'ownership-certificate-sample.pdf');
  const bytes = await document.save();
  const generatedForm = (await PDFDocument.load(bytes)).getForm();
  for (const name of Object.keys(values)) generatedForm.getTextField(name);
  if (!generatedForm.getTextField('product_details').isMultiline()) {
    throw new Error('The sample product_details field must be multiline.');
  }
  await fs.writeFile(output, bytes);
  console.log(`Created ${output}`);
}

main().catch((error) => {
  console.error('Could not generate the sample ownership certificate PDF.', error);
  process.exitCode = 1;
});
