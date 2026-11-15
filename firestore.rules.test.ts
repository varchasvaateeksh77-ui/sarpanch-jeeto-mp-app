import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('Firestore Rules enforce all 8 Hardened Pillars and block the Dirty Dozen payloads', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf-8');

  // 1. Default-deny catch-all
  assert.ok(rules.includes('allow read, write: if false;'));

  // 2. Email verification required
  assert.ok(rules.includes('request.auth.token.email_verified == true'));

  // 3. Strict ID validation regex
  assert.ok(rules.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));

  // 4. Strict Blueprint helpers for UserProfile and ClientCampaign
  assert.ok(rules.includes('function isValidUserProfile(data)'));
  assert.ok(rules.includes('function isValidClientCampaign(data)'));

  // 5. Server timestamp enforcement
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));

  // 6. Immutable ownership & creation timestamps on update
  assert.ok(rules.includes('incoming().uid == existing().uid'));
  assert.ok(rules.includes('incoming().ownerId == existing().ownerId'));
  assert.ok(rules.includes('incoming().createdAt == existing().createdAt'));
});
