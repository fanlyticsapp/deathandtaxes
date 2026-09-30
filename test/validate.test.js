import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission, LIMITS } from '../src/validate.js';

const valid = {
  name: 'Jane Creator',
  email: 'jane@example.com',
  phone: '(772) 555-0123',
  business: 'Jane Makes Videos LLC',
  message: 'I started getting brand deals this year and need help with taxes.',
};

test('accepts a complete submission', () => {
  const result = validateSubmission(valid);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.data, valid);
});

test('phone and business name are optional', () => {
  const result = validateSubmission({ ...valid, phone: '', business: undefined });
  assert.equal(result.valid, true);
  assert.equal(result.data.phone, '');
  assert.equal(result.data.business, '');
});

test('requires name, email, and message', () => {
  const result = validateSubmission({ name: '  ', email: '', message: '\n\n' });
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['email', 'message', 'name']);
});

test('rejects malformed emails', () => {
  for (const email of ['jane', 'jane@', 'jane@example', 'jane example@test.com', 'a@b.c', '<x>@evil.com']) {
    assert.ok(validateSubmission({ ...valid, email }).errors.email, `expected ${email} to be rejected`);
  }
});

test('rejects phone numbers without enough digits', () => {
  assert.ok(validateSubmission({ ...valid, phone: 'call me' }).errors.phone);
  assert.ok(validateSubmission({ ...valid, phone: '123' }).errors.phone);
  assert.equal(validateSubmission({ ...valid, phone: '+1 772.555.0123' }).errors.phone, undefined);
});

test('flattens newlines in single-line fields so they cannot inject email headers', () => {
  const result = validateSubmission({ ...valid, name: 'Jane\r\nBcc: attacker@example.com' });
  assert.equal(result.data.name, 'Jane Bcc: attacker@example.com');
  assert.ok(!/[\r\n]/.test(result.data.name));
});

test('keeps line breaks in the message but strips control characters', () => {
  const result = validateSubmission({ ...valid, message: 'Line one\r\nLine two\u0000\n\n\n\n\n\nLine three' });
  assert.equal(result.data.message, 'Line one\nLine two\n\n\nLine three');
});

test('enforces length limits', () => {
  const result = validateSubmission({ ...valid, message: 'x'.repeat(LIMITS.message + 1) });
  assert.ok(result.errors.message);
});

test('ignores non-string input', () => {
  const result = validateSubmission({ name: ['Jane'], email: { a: 1 }, message: 42 });
  assert.equal(result.valid, false);
  assert.equal(result.data.name, '');
});
