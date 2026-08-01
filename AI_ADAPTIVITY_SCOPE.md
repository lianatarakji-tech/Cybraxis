# Cybraxis AI and Adaptivity Scope

## Purpose

This document clarifies the role of AI and adaptivity in Cybraxis after mentor feedback.

The key idea is:

Backend decides. AI explains and tutors.

Cybraxis should not present AI as a system that randomly chooses scenarios or directly controls gameplay. Instead, AI is used as a bounded adaptive tutoring layer that supports learning while the backend remains the authoritative decision-maker.

## Core distinction

Cybraxis has two connected but separate adaptive layers:

1. Backend-driven gameplay adaptivity
2. AI-supported tutoring adaptivity

## 1. Backend-driven gameplay adaptivity

The backend is responsible for actual gameplay decisions.

The backend may adapt:

- stage timing pressure
- warning messages
- alert/log pacing
- mentor support level
- stage result evaluation
- score calculation
- pass/fail decisions
- stage progression
- final scenario result
- weakness detection
- remedy recommendation
- replay/variant recommendation

This means adaptivity is part of the gameplay engine, not something AI is allowed to freely decide.

Examples:

- If the player is overwhelmed, the system can reduce pressure or increase guidance.
- If the player responds too early, the system can mark premature containment and recommend a targeted remedy.
- If the player repeatedly chooses the wrong node, the system can identify host pivot weakness.
- If the player fails Scenario 1, the system can recommend a remedy scenario before replaying a Scenario 1 variant.

## 2. AI-supported tutoring adaptivity

AI is used to improve the educational layer, not to control gameplay.

AI may help with:

- adaptive mentor hints
- personalized explanation of mistakes
- final report narrative wording
- dashboard summary wording
- explanation of why a remedy was recommended
- scenario drafting support for developer review

AI receives only safe backend-approved fact packs.

AI should not receive unrestricted raw gameplay state when a smaller safe fact pack is enough.

## What AI must not do

AI must not:

- decide whether an action is correct
- decide whether a stage is passed or failed
- decide the player's score
- unlock or lock stages
- choose progression directly
- select remedies directly
- invent evidence
- invent node states
- reveal exact answers too early
- override backend rules
- call itself the gameplay authority

## Why AI is still useful

The AI role is useful because the system is educational, not only mechanical.

A deterministic backend can calculate:

- what the player did wrong
- which evidence was missing
- which weakness was triggered
- which remedy is appropriate

But AI can explain this in a more human, supportive, and adaptive way.

For example:

Backend fact:
The player attempted to block the external IP before confirming the suspicious path.

AI mentor explanation:
You are close, but the response is early. First confirm the source and path so the block is supported by evidence.

This helps the learner understand the reasoning, not just receive a right/wrong result.

## Why variant selection does not need AI

Scenario and variant selection should be backend rule-based.

A simple rule is enough:

- select an eligible variant
- avoid loading the same variant twice in a row
- prefer a replay variant after a remedy
- keep progression aligned with score thresholds and weakness mapping

Using AI for variant selection would add complexity without adding much educational value.

Therefore:

Variant selection = backend rule-based/no-repeat logic
AI = adaptive explanation and tutoring support

## How this strengthens the project

This framing makes Cybraxis stronger because it combines:

- interactive SOC gameplay
- deterministic backend evaluation
- continuous adaptivity
- targeted remedy scenarios
- controlled scenario variants
- AI-supported educational feedback

The AI is not included just for decoration. It supports the learning experience while remaining safe, bounded, and explainable.

## Final summary

Cybraxis is an adaptive cybersecurity training simulator.

The backend tracks player behavior and adapts gameplay, scoring, progression, and remedies.

AI supports the adaptive tutoring layer by turning backend-approved facts into clearer hints, explanations, reports, and learning recommendations.

The backend remains authoritative at all times.
