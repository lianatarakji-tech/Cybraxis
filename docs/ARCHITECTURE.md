# System Architecture

## Architectural Principle

Cybraxis separates deterministic platform authority from adaptive AI guidance.

The backend decides valid actions, consequences, stage completion, scoring, pass/fail results, progression, remediation eligibility, and persisted learner results. The AI mentor may explain, guide, and adapt, but it does not override those decisions.

## High-Level Architecture

```text
React frontend
    │
    ▼
Express API
    │
    ├──────────────► Mistral / mock / fallback
    │
    ▼
PostgreSQL
```

## Frontend

Important areas include:

- `src/App.js` — main scenario orchestration
- `src/components/NetworkMap/NetworkMap.js` — active React Flow map
- `src/components/ActionsPanel/` — response actions
- `src/components/AlertsPanel/` — staged alerts
- `src/components/LogsPanel/` — investigation evidence
- `src/components/SocAdvisorPanel/` — adaptive mentor
- `src/components/FinalScenarioReport/` — final evaluation
- `src/components/RemediationTraining/` — targeted learning
- `src/components/PlayableRemedyScenario/` — corrective practice
- `src/components/MainMenu/` — navigation and dashboard

## Backend

The backend follows a route-controller-service structure covering:

- scenario loading
- action evaluation
- runtime decisions
- investigation coverage
- scoring
- progression
- reports
- learner profiles
- AI safety and validation

## AI Request Flow

```text
Scenario state
    ↓
Controlled fact pack
    ↓
Provider request
    ↓
Schema validation
    ↓
Safety guards
    ↓
Accepted mentor response
    └── failure → deterministic fallback
```

The backend remains authoritative when frontend parity helpers are also present.
