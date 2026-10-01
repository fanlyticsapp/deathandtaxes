import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmail, sendNotification } from '../src/email.js';

const data = {
  name: 'Jane <b>Creator</b>',
  email: 'jane@example.com',
  phone: '',
  business: '',
  message: 'Hi!\n<script>alert(1)</script>',
};

test('escapes submitted text in the HTML email', () => {
  const { html } = buildEmail(data, new Date('2026-09-30T19:14:00Z'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('Jane &lt;b&gt;Creator&lt;/b&gt;'));
});

test('plain-text email lists every field and the Eastern time it arrived', () => {
  const { subject, text } = buildEmail(data, new Date('2026-09-30T19:14:00Z'));
  assert.equal(subject, 'New consultation request from Jane <b>Creator</b>');
  assert.match(text, /Email: jane@example\.com/);
  assert.match(text, /Phone: Not provided/);
  assert.match(text, /Business name: Not provided/);
  assert.match(text, /Received: Sep 30, 2026, 3:14\sPM ET/);
});

test('skips sending when no EMAIL binding is configured', async () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    assert.equal(await sendNotification(data, { NOTIFY_EMAIL: 'owner@example.com' }), 'skipped');
  } finally {
    console.log = originalLog;
  }
});

test('sends through the Cloudflare EMAIL binding with reply-to set to the visitor', async () => {
  let message;
  const env = {
    NOTIFY_EMAIL: 'owner@example.com',
    MAIL_FROM: 'website@example.com',
    MAIL_FROM_NAME: 'Example Website',
    EMAIL: { send: async (msg) => { message = msg; return { messageId: 'abc' }; } },
  };
  assert.equal(await sendNotification(data, env), 'sent');
  assert.equal(message.to, 'owner@example.com');
  assert.deepEqual(message.from, { name: 'Example Website', email: 'website@example.com' });
  assert.deepEqual(message.replyTo, { name: 'Jane <b>Creator</b>', email: 'jane@example.com' });
  assert.equal(message.subject, 'New consultation request from Jane <b>Creator</b>');
  assert.match(message.text, /Message:\nHi!/);
  assert.match(message.html, /&lt;script&gt;/);
});

test('reports failure when Cloudflare rejects the email', async () => {
  const originalError = console.error;
  console.error = () => {};
  const env = {
    NOTIFY_EMAIL: 'owner@example.com',
    MAIL_FROM: 'website@example.com',
    EMAIL: {
      send: async () => {
        throw Object.assign(new Error('sender domain is not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
      },
    },
  };
  try {
    assert.equal(await sendNotification(data, env), 'failed');
  } finally {
    console.error = originalError;
  }
});
