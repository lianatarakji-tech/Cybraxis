# AI and Adaptivity

## Role of the AI Mentor

The AI mentor supports learning but does not control scenario truth.

It can provide:

- context-aware hints
- investigation focus recommendations
- behavior observations
- learning review
- mentor interventions
- learner-profile feedback
- progression recommendations

## Backend Authority

The backend remains authoritative for actions, investigation requirements, scoring, pass/fail status, progression, and remediation.

## Fact Pack and Validation

Cybraxis builds a limited fact pack from known scenario state before sending an AI request. Returned data is validated against the expected structure and checked by safety guards.

## Providers and Fallback

The current AI layer supports:

- Mistral
- mock provider
- deterministic fallback guidance

Fallback guidance keeps core training usable when an external provider is unavailable or returns invalid output.
