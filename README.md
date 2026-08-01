# Cybraxis

**Cybraxis** is an AI-enhanced adaptive learning and investigation platform for beginner Security Operations Center (SOC) analysts. It combines guided cybersecurity scenarios, interactive network investigation, backend-authoritative scoring, learner profiling, remediation, and adaptive mentor guidance in one training environment.

> Academic project developed as part of an Information Technology Engineering degree project.

## Overview

Cybraxis helps learners practice the reasoning process used during network-focused security investigations. Instead of presenting only static lessons or isolated quizzes, the platform places the learner inside structured scenarios where they must inspect alerts, analyze logs, investigate hosts and identities, select response actions, and justify their decisions.

The platform is designed around a staged investigation process:

1. Identity
2. Connectivity
3. Controls
4. Activity and evidence
5. Interpretation and response

The backend remains authoritative for scenario truth, allowed actions, scoring, pass/fail decisions, progression, and remediation. The AI mentor provides adaptive guidance without replacing those deterministic controls.

## Core Features

- Interactive SOC investigation scenarios
- Multi-stage attack progression
- React Flow network visualization
- Alert, log, node, and response-action panels
- Backend-authoritative action validation
- Stage and scenario scoring
- Learner profile and performance dashboard
- Adaptive AI mentor guidance
- Safe fallback guidance when the AI provider is unavailable
- Scenario replay using alternate variants
- Targeted remediation modules and playable remedy scenarios
- PostgreSQL persistence for sessions, events, stage results, reports, and profiles
- Local learner account and profile-management interface

## Implemented Scenario Content

The current release includes:

- **Scenario 1A** — baseline multi-stage network attack
- **Scenario 1B: South Bridge Pivot** — replay variant with changed topology, evidence, addressing, and attack path
- **Scenario 2: Silent Beacon** — a separate investigation scenario
- **Premature containment remedy** — trains evidence collection before containment
- **Evidence completion remedy** — trains complete investigation and evidence coverage

Scenario data is represented primarily through JSON so that scenarios, stages, topology, evidence, and actions can be loaded consistently across the frontend and backend.

## Investigation and Learning Flow

```text
Login / learner selection
        ↓
Main menu
        ↓
Scenario briefing
        ↓
Investigation workspace
        ↓
Stage evaluation and feedback
        ↓
Final report
        ↓
Progression or targeted remediation
        ↓
Learner dashboard
```

A previously passed stage may be replayed for review. Failed or incomplete work is handled through the remediation flow rather than unrestricted stage skipping.

## Scoring

Cybraxis evaluates learner performance using multiple factors, including:

- Action accuracy
- Investigation completeness
- Action sequence
- Wrong-action penalties
- Reaction time
- Hint and assistance usage
- Stage completion quality

A low final score can trigger a targeted remediation recommendation based on the learner’s observed weakness.

## AI Mentor

The AI layer acts as an adaptive mentor rather than the source of system truth.

It can provide:

- Context-aware hints
- Recommended investigation focus
- Observed behavior patterns
- Learning review feedback
- Mentor interventions
- Progression recommendations
- Learner profile updates

Before an AI request is accepted, Cybraxis builds a controlled fact pack from scenario state and validates the returned structure. A fallback guidance path remains available if the external model is unavailable or returns invalid output.

## Technology Stack

### Frontend

- React
- React Flow
- CSS
- JSON scenario bundles

### Backend

- Node.js
- Express
- PostgreSQL
- `pg`
- AJV schema validation

### AI Layer

- Mistral API
- Mock provider for safe testing
- Deterministic fallback guidance
- Structured response validation and safety guards

### Development

- Visual Studio Code
- Git
- Windows Command Prompt / PowerShell
- pgAdmin 4

## Project Structure

```text
cybraxis/
├── public/
├── src/
│   ├── backend/
│   ├── components/
│   ├── data/
│   ├── engine/
│   └── services/
├── server/
│   ├── controllers/
│   ├── data/
│   ├── db/
│   ├── routes/
│   ├── services/
│   └── utils/
├── docs/
├── package.json
└── README.md
```

## Getting Started

See [docs/SETUP.md](docs/SETUP.md) for complete frontend, backend, PostgreSQL, and environment-variable setup instructions.

Basic frontend commands:

```bash
npm install
npm start
```

Basic backend commands:

```bash
cd server
npm install
npm start
```

## Environment Configuration

Create a local file at:

```text
server/.env
```

Use `server/.env.example` as the starting template. Never commit real database passwords or API keys.

The AI layer can run with the mock provider, and real Mistral access can be enabled through environment variables documented in [docs/SETUP.md](docs/SETUP.md).

## Documentation

- [Setup Guide](docs/SETUP.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Scenarios and Remediation](docs/SCENARIOS_AND_REMEDIATION.md)
- [AI and Adaptivity](docs/AI_ADAPTIVITY.md)
- [Scenario Authoring Template](docs/SCENARIO_AUTHORING_TEMPLATE.md)
- [Visualization Decision](docs/VISUALIZATION_DECISION.md)

## Screenshots and Demo

Repository screenshots and a demonstration video will be added to this section.

Suggested screenshots:

- Login screen
- Main menu
- Scenario briefing
- SOC investigation workspace
- Network map and node details
- Stage result
- Final report
- Remediation module
- Playable remedy scenario
- Learner dashboard

## Current Scope

Cybraxis focuses on beginner SOC training for network-based attacks. Operating-system exploitation and embedded-system security are outside the current project scope.

The current implementation is an academic platform release. It is not intended to replace a production SIEM, SOAR, identity provider, or enterprise incident-response system.

## Limitations

- The scenario library is currently limited.
- Larger and continuously updated datasets would improve realism.
- Administrative scenario-authoring tools are not yet integrated.
- Stronger and faster AI models could support richer guidance.
- Some development dependencies may report audit warnings inherited from the current React toolchain.

## Future Work

Planned directions include:

- More attack families and scenario variants
- Administrative scenario management
- Expanded datasets and live log feeds
- Instructor analytics
- Stronger learner modeling
- Additional AI providers
- Improved deployment and automated testing
- More advanced SOC roles and collaborative investigations

## Academic Context

Cybraxis was developed by **Liana Tarakji** under the supervision of **Dr. Kenan Samaan** at Cordoba Private University.

## Disclaimer

This project is intended for education and controlled cybersecurity training. Scenario content should be used only in authorized environments.
