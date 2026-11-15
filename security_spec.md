# Phase 0: Payload-First Security TDD Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Ownership (`UserProfile`)**: A `/users/{userId}` document can only be read, created, updated, or deleted by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: User email addresses inside `/users/{userId}` are never readable by other signed-in users (`allow get: if isOwner(userId)`). Blanket `list` is forbidden on `/users`.
3. **Per-Client Campaign Isolation (`ClientCampaign`)**: A `/campaigns/{campaignId}` document belongs exclusively to `ownerId == request.auth.uid`. Rival candidates in the same Gram Panchayat cannot read, list, update, or delete each other's `/campaigns/{campaignId}` documents.
4. **Immutable Ownership & Creation Timestamps**: `uid`, `ownerId`, and `createdAt` can never change on `update`. `createdAt` and `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Create `/users/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Create `/users/user_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on User Create**: Authenticated as `user_2`, create `/users/user_1` with `uid: "user_1"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on User**: Create `/users/user_1` with extra key `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Role Escalation**: Create `/users/user_1` with `role: "superadmin"` (outside `['candidate', 'worker']`) -> `PERMISSION_DENIED`.
6. **PII Blanket Read**: Authenticated as `user_2`, `get` `/users/user_1` -> `PERMISSION_DENIED`.
7. **Resource Poisoning (Oversized ID / String)**: Create `/campaigns/camp_1` with `panchayatName` length > 120 chars -> `PERMISSION_DENIED`.
8. **Cross-Tenant Campaign Hijack**: Authenticated as `user_2`, `get` or `update` `/campaigns/camp_1` owned by `user_1` -> `PERMISSION_DENIED`.
9. **Owner Mutation on Update**: Update `/campaigns/camp_1` changing `ownerId` from `user_1` to `user_2` -> `PERMISSION_DENIED`.
10. **Forged Client Timestamp**: Create `/campaigns/camp_1` with `createdAt` not matching server `request.time` -> `PERMISSION_DENIED`.
11. **Update Gap (Unlisted Field)**: Update `/campaigns/camp_1` modifying an undeclared field `hacked: 1` -> `PERMISSION_DENIED`.
12. **Unauthorized Blanket List**: Query `/campaigns` without filtering `where('ownerId', '==', request.auth.uid)` -> `PERMISSION_DENIED`.
