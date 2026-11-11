---
name: using-superpowers
description: Use when starting any conversation or software development task - establishes how to find and use mandatory engineering skills (brainstorming, TDD, systematic debugging, code review), requiring skill invocation before ANY response including clarifying questions.
---

# Superpowers: Mandatory Engineering Methodology

## Core Principle

If you have a skill to do something, you must use it. This is a mandatory process rather than optional documentation.

- **The Rule:** Invoke relevant skills **BEFORE** any response, action, or clarifying question.
- **Announce First:** State clearly: `"Using [skill] to [purpose]"` before proceeding.
- **Checklists:** Create a todo item for each step if the skill includes a checklist.

---

## Red Flags (Stop Rationalizing)

Do not rationalize skipping a required skill for simple questions, exploratory tasks, or perceived minor actions—if a skill exists, check for and use it first.

---

## Workflow Sequence

1. **Scan & Match:** Evaluate prompts against available skills like brainstorming, TDD, debugging, and code reviews.
2. **Invoke:** Trigger the relevant skill prior to outputting text or commands.
3. **Execute & Verify:** Follow deterministic skill steps and ensure evidence supports success before finishing.

---

## Subagent & Override Rules

Subagents ignore this enforcement gate unless requested. User directives and explicit instructions take precedence over general skills, which override default assistant behavior.
