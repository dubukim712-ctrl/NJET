---
name: aaa-security
description: Enforce ironclad user identity management and granular contextual authorization rules.
---

# Skill 04: AAA Security (Authentication, Authorization, Accounting)

## Core Directives

- _Hermetic Token Storage:_ Cryptographic access keys and application session JWTs must reside strictly inside server-issued, HttpOnly, Secure, SameSite=Strict browser cookies. Writing active authentication payloads directly to browser localStorage or sessionStorage is strictly forbidden.
- _Server-Side Route Guarding:_ Secure app access checks must be rigorously validated at the server edge, API middleware, or server-side layout framework layer. Do not rely entirely on client-side router redirects.
- _Principle of Least Privilege:_ Enforce deterministic route validation boundaries. Verify an identities' assigned role scope (super_admin, workspace_member, guest) at the endpoint ingress layer before initiating data fetches.
