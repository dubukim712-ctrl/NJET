---
name: contract-validation
description: Safeguard runtime application boundaries against corrupt data payloads or malicious manipulation.
---

# Skill 03: Runtime Contract Validation

## Core Directives

- _Zero-Trust Inbound Gateways:_ Parse, validate, and verify all external inbound request variables (API route elements, request body JSON blocks, search parameters, Webhook notifications) using robust runtime checking tools (Zod, Pydantic, ArkType) before execution.
- _Strict Object Cleanse:_ Automatically discard all unvetted, unmapped, or extraneous object parameters during runtime validation parsing to actively mitigate mass-assignment or prototype pollution attack surfaces.
- _Structured Error Aggregation:_ Transform contract evaluation exceptions into human-readable field errors (e.g., matching { fieldName: errorMessage } configurations) to streamline instantaneous input error rendering on frontend layouts.
