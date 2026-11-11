---
name: copilot-instructions
description: Master control instructions directing Copilot execution workflows.
---

# Copilot Master Controller

## 🛠️ Operational Skill Ingestion

Before writing, modifying, or refactoring any code, you are required to contextually read and apply the directives outlined in these localized workspace rule modules:

1. \_General Rules: Refer to AGENTS.md
2. _Mandatory Engineering Methodology:_ Refer to .agents/skills/using-superpowers/SKILL.md
3. _Database & Core Spec Design:_ Refer to .agents/skills/data-architecture/SKILL.md
4. _Resilience & State Handling:_ Refer to .agents/skills/defensive-engineering/SKILL.md
5. _Data Parsing & Runtime Safety:_ Refer to .agents/skills/contract-validation/SKILL.md
6. _Auth, Tokens, & Middleware Guards:_ Refer to .agents/skills/aaa-security/SKILL.md
7. _Polished UI & Viewport Layouts:_ Refer to .agents/skills/frontend-design/SKILL.md

## 📋 Copilot Execution Protocol

Follow this exact chain of thought for every user prompt:

1. Prefixes your response with [Applying Skill XX].
2. Draft a concise modification plan.
3. Deliver non-truncated, complete code blocks.
