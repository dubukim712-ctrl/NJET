import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PDFDict, PDFDocument, PDFForm, PDFName, PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import { actionContext } from './helpers/admin-action-test.mjs';

const { generateOrderReceiptAction } = await import('../data/actions/order-receipts.ts');
const { buildSalesReceiptFromTemplate, SalesReceiptTemplateError } = await import('../data/commerce/sales-receipt.ts');
const { SALES_RECEIPT_TEMPLATE_FIELDS } = await import('../data/commerce/sales-receipt-template-config.ts');

const receipt = {
  ...Object.fromEntries(Object.keys(SALES_RECEIPT_TEMPLATE_FIELDS).map((key) => [key, ''])),
  customerName: ' Test Customer ',
  receiptNumber: 'RCPT-123',
  items: 'Test bike\nHelmet',
};

test('receipt action validates permissions and the order ID before DB access', async () => {
  const customer = actionContext({ scope: 'customer', permissions: ['storefront.access'] });
  await assert.rejects(
    () => customer.run(() => generateOrderReceiptAction({ orderId: randomUUID() })),
    { destination: '/dashboard?error=insufficient_permissions' },
  );
  assert.deepEqual(customer.calls, []);

  const staff = actionContext({ scope: 'staff', permissions: ['admin.access', 'orders.manage'] });
  assert.deepEqual(await staff.run(() => generateOrderReceiptAction({ orderId: 'invalid' })), {
    success: false, error: 'Select a valid order.',
  });
  assert.deepEqual(staff.calls, []);
});

test('receipt action rejects incomplete orders before generating PDFs', async () => {
  const staff = actionContext(
    { scope: 'staff', permissions: ['admin.access', 'orders.manage'] },
    {
      from: (table) => {
        assert.equal(table, 'orders');
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { status: 'confirmed' }, error: null }) }),
          }),
        };
      },
    },
  );
  assert.deepEqual(await staff.run(() => generateOrderReceiptAction({ orderId: randomUUID() })), {
    success: false, error: 'Sales receipts can only be generated for completed orders.',
  });
  assert.deepEqual(staff.calls, [{ table: 'orders' }]);
});

test('receipt fills text and centers an aspect-preserving variant image before flattening', async (t) => {
  const template = await PDFDocument.create();
  const page = template.addPage();
  const form = template.getForm();
  form.createTextField('customer_name').addToPage(page, { x: 10, y: 400, width: 200, height: 25 });
  form.createTextField('receipt_number').addToPage(page, { x: 10, y: 370, width: 200, height: 25 });
  const items = form.createTextField('items');
  items.enableMultiline();
  items.addToPage(page, { x: 10, y: 280, width: 200, height: 80 });
  const imageField = form.createTextField('variant_image');
  imageField.addToPage(page, { x: 100, y: 100, width: 100, height: 100 });
  const widget = imageField.acroField.getWidgets()[0].getRectangle();
  const bytes = await template.save();
  const imageBytes = await sharp({
    create: { width: 80, height: 40, channels: 3, background: '#123456' },
  }).jpeg().toBuffer();

  let filledText;
  const originalFlatten = PDFForm.prototype.flatten;
  t.mock.method(PDFForm.prototype, 'flatten', function (options) {
    filledText = ['customer_name', 'receipt_number', 'items'].map((name) => this.getTextField(name).getText());
    return originalFlatten.call(this, options);
  });
  const drawImage = t.mock.method(PDFPage.prototype, 'drawImage');
  const output = await buildSalesReceiptFromTemplate(bytes, receipt, {
    variantImage: { bytes: imageBytes, contentType: 'image/jpeg' },
  });

  assert.deepEqual(filledText, ['TEST CUSTOMER', 'RCPT-123', 'Test bike\nHelmet']);
  assert.equal(drawImage.mock.callCount(), 1);
  const [image, bounds] = drawImage.mock.calls[0].arguments;
  assert.equal(image.width / image.height, 2);
  assert.equal(bounds.width / bounds.height, 2);
  assert.equal(bounds.width, widget.width - 4);
  assert.equal(bounds.x + bounds.width / 2, widget.x + widget.width / 2);
  assert.equal(bounds.y + bounds.height / 2, widget.y + widget.height / 2);

  const flattened = await PDFDocument.load(output);
  assert.deepEqual(flattened.getForm().getFields(), []);
  const objects = flattened.getPages()[0].node.Resources().lookup(PDFName.of('XObject'), PDFDict);
  assert.equal(objects.keys().filter((key) => key.asString().startsWith('/FlatWidget')).length, 4);
  const annotations = flattened.getPages()[0].node.Annots()?.asArray() ?? [];
  for (const reference of annotations) {
    const annotation = flattened.context.lookup(reference);
    assert.ok(!(annotation instanceof PDFDict) || annotation.get(PDFName.of('Subtype')) !== PDFName.of('Widget'));
  }
});

test('receipt rejects invalid text fields, image controls and missing multiline support', async () => {
  for (const [name, fieldType, message] of [
    ['customer_name', 'checkBox', /customer_name.*must be a text field/],
    ['variant_image', 'checkBox', /variant_image.*must be a text field or push-button/],
    ['items', 'text', /items.*must be multiline/],
  ]) {
    const template = await PDFDocument.create();
    const form = template.getForm();
    form[fieldType === 'checkBox' ? 'createCheckBox' : 'createTextField'](name).addToPage(template.addPage());
    await assert.rejects(
      () => template.save().then((bytes) => buildSalesReceiptFromTemplate(bytes, receipt)),
      { name: 'SalesReceiptTemplateError', message },
    );
  }
});

test('receipt reports a template error when a widget has no resolvable page', async () => {
  const template = await PDFDocument.create();
  const page = template.addPage();
  const field = template.getForm().createTextField('receipt_number');
  field.addToPage(page);
  field.acroField.getWidgets()[0].dict.delete(PDFName.of('P'));
  page.node.delete(PDFName.of('Annots'));

  const bytes = await template.save();
  await assert.rejects(() => buildSalesReceiptFromTemplate(bytes, receipt), (error) => {
    assert.ok(error instanceof SalesReceiptTemplateError);
    assert.match(error.message, /could not be placed in this template/);
    assert.match(error.cause.message, /could not find page for PDFRef/i);
    return true;
  });
});
