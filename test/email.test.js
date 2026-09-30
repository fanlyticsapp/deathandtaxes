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

test('skips sending when no Resend API key is configured', async () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    assert.equal(await sendNotification(data, { NOTIFY_EMAIL: 'owner@example.com' }), 'skipped');
  } finally {
    console.log = originalLog;
  }
});

test('sends through Resend with reply-to set to the visitor', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response('{"id":"abc"}', { status: 200 });
  };
  try {
    const env = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'owner@example.com', MAIL_FROM: 'Site <site@example.com>' };
    assert.equal(await sendNotification(data, env, { idempotencyKey: 'submission-7' }), 'sent');
    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.init.headers.Authorization, 'Bearer re_test');
    assert.equal(request.init.headers['Idempotency-Key'], 'submission-7');
    const body = JSON.parse(request.init.body);
    assert.deepEqual(body.to, ['owner@example.com']);
    assert.equal(body.reply_to, 'jane@example.com');
    assert.equal(body.from, 'Site <site@example.com>');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports failure when Resend rejects the email', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = async () => new Response('{"message":"invalid from"}', { status: 422 });
  console.error = () => {};
  try {
    const env = { RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'owner@example.com', MAIL_FROM: 'bad' };
    assert.equal(await sendNotification(data, env), 'failed');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
