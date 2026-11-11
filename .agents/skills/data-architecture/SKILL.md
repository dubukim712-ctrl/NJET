---
name: data-architecture
description: Enforce a structural, data-first workflow to ensure complete alignment across stack tiers.
---

# Skill 01: Data Architecture & Schema Control

## Core Directives

- _Schema-First Sequencing:_ Generate or thoroughly validate the underlying database schema (Prisma, SQL migrations, Drizzle, Mongoose) or API schema (OpenAPI/Swagger specs) before writing route handlers, business logic, or frontend visual markup.
- _Strict Structural Alignment:_ System endpoints must cleanly map to explicit entity definitions. Never dump unstructured database records directly to client components.
- _Automated Data Redaction:_ Build defensive structural masking at the data-access or serialization layer to instantly strip sensitive attributes (such as password_hash, salt, internal_id, or tracking metadata) before data hits the transmission network.
- _Query Optimization Boundary:_ Restrict arbitrary dataset queries. Ensure every relationship fetch includes a concrete execution parameter constraint (take, limit, explicit pagination indexing) to avoid memory starvation under high load.
