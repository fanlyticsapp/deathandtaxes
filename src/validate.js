// Cleans and validates a contact form submission. Kept free of Worker APIs so it can be unit tested with `node --test`.

export const LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  business: 160,
  message: 5000,
};

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:".]{2,}$/;
const PHONE_RE = /^[0-9+().\-\s]{7,}$/;

function clean(value, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  let v = value.normalize('NFC');
  if (multiline) {
    v = v
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\n{4,}/g, '\n\n\n');
  } else {
    // Single-line fields: control characters (including newlines) become spaces so they can't break email headers.
    v = v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  }
  return v.trim();
}

export function validateSubmission(input = {}) {
  const data = {
    name: clean(input.name),
    email: clean(input.email),
    phone: clean(input.phone),
    business: clean(input.business),
    message: clean(input.message, { multiline: true }),
  };

  const errors = {};
  if (!data.name) errors.name = 'Please enter your name.';

  if (!data.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';

  if (data.phone && (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, '').length < 7)) {
    errors.phone = 'Please enter a valid phone number.';
  }

  if (!data.message) errors.message = 'Please enter a message.';

  for (const [field, max] of Object.entries(LIMITS)) {
    if (data[field].length > max) errors[field] = `Please keep this under ${max} characters.`;
  }

  return { data, errors, valid: Object.keys(errors).length === 0 };
}
