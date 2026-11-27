import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatSavedPhilippineMobileNumber,
  sanitizePhilippineMobileInput,
  toPhilippineMobileE164,
} from '../lib/phone-number.ts';
import { PHILIPPINE_MOBILE_ERROR, philippineMobileSchema } from '../lib/validations/philippine-mobile.ts';
import { checkoutSchema } from '../lib/validations/commerce.ts';
import { requestPhoneVerificationSchema } from '../lib/validations/phone-verification.ts';
import { profileContactSchema } from '../lib/validations/profile-contact.ts';
import { customerServiceAppointmentRequestSchema } from '../lib/validations/service-appointments.ts';
import { startGuestPhoneChatSchema } from '../lib/validations/support-chat.ts';

test('all storefront phone fields require a strict local Philippine mobile number', () => {
  const requiredFields = [
    philippineMobileSchema,
    checkoutSchema.shape.contactNumber,
    requestPhoneVerificationSchema.shape.phoneNumber,
    customerServiceAppointmentRequestSchema.shape.contactNumber,
    startGuestPhoneChatSchema.shape.phone,
  ];
  const optionalPhone = profileContactSchema.shape.phoneNumber;
  for (const field of [...requiredFields, optionalPhone]) {
    assert.equal(field.parse('09171234567'), '09171234567');
    for (const value of ['+639171234567', '0917 123 4567', ' 09171234567', '09171234567\n', '0917123456', '091712345678', '0917x123456', '08171234567', 9171234567]) {
      const result = field.safeParse(value);
      assert.equal(result.success, false, String(value));
      assert.equal(result.error.issues[0].message, PHILIPPINE_MOBILE_ERROR);
    }
  }
  for (const field of requiredFields) assert.equal(field.safeParse('').success, false);
  assert.equal(optionalPhone.parse(''), null);
});

test('legacy profile and challenge values round-trip without changing their identity', () => {
  const stored = '+639171234567';
  const local = formatSavedPhilippineMobileNumber(stored);
  assert.equal(local, '09171234567');
  assert.equal(toPhilippineMobileE164(local), stored);
  assert.equal(formatSavedPhilippineMobileNumber(local), local);
  assert.equal(formatSavedPhilippineMobileNumber(null), '');
  assert.equal(sanitizePhilippineMobileInput('0917-123 abc4567 99'), local);
});
