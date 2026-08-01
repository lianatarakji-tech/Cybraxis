# Cybraxis Implementation Status

## Current Stable Branch

Active working branch: `react-flow-final-polish`

This branch contains the current stable frontend, backend connection, PostgreSQL persistence, React Flow visualization polish, final report UI, and documented visualization decision.

---

## Completed Implementation Areas

### Frontend Gameplay

The current prototype supports the full Scenario 1 gameplay flow:

- staged campaign progression
- alerts panel
- logs panel
- network map
- action panel
- investigation actions
- response actions
- stage locking
- stage result overlay
- timeout handling
- SOC advisor panel
- final scenario report screen

The final stage no longer jumps directly to the final report. Instead, the learner sees the final stage result first, then deliberately opens the final scenario report using the completion button.

---

### Visualization Layer

React Flow is retained as the final active visualization implementation for the prototype.

Cytoscape.js was tested through multiple draft attempts but rejected for the active prototype because it did not match the visual quality, interaction stability, selected-node clarity, and gameplay usability of the React Flow implementation.

Current React Flow improvements include:

- non-draggable investigation nodes
- improved cyber/SOC node styling
- stronger selected-node glow
- selected-node centering when the drawer opens
- minimap hidden while the investigation drawer is active
- improved attack-path direction indicators
- responsive stage result overlay
- better runtime visual feedback for node status

The visualization decision is documented in `docs/VISUALIZATION_DECISION.md`.

---

### Backend and Database

The Express backend is active under `server/`.

The PostgreSQL database is connected and supports learner-data persistence.

Implemented backend/database areas include:

- health route
- PostgreSQL connection check
- session creation
- event persistence
- stage result persistence
- final report persistence

The database currently stores:

- learner sessions
- gameplay events
- stage results
- final scenario reports

The final report persistence flow has been tested successfully through full gameplay.

---

### Final Scenario Report

The final scenario report now includes:

- total score
- performance band
- stage completion summary
- timeout count
- wrong action count
- hints requested
- analyst summary
- primary improvement area
- evaluation dimensions
- compact stage-by-stage breakdown
- strengths
- weaknesses
- recommendations
- final feedback
- restart scenario button
- recommended next scenario button placeholder

The report is generated deterministically for now. Later AI integration may improve the wording and naturalness of feedback, but AI should not control scoring, progression, or correctness.

---

## Prepared but Not Fully Implemented Yet

### Adaptive Scenario Progression

The final report includes a prepared “Recommended Next Scenario” button.

The intended future routing logic is:

- Score 85+ → unlock or move to a harder scenario
- Score 60–84 → move to the next normal/recommended scenario
- Score below 60 → recommend replay, remediation, or easier practice before progressing

This logic is not fully active yet because additional scenarios have not been implemented.

---

### AI-Supported Feedback

AI integration is planned for later.

The intended AI role is bounded support:

- improve feedback wording
- make mentor explanations more natural
- help summarize learner performance
- support hint phrasing

AI should not:

- decide correctness
- assign scores
- control progression
- replace deterministic evaluation logic

---

## Current Main Limitations

The current prototype still has these limitations:

- only Scenario 1 is implemented
- scenario progression routing is prepared but not active
- final feedback wording is deterministic and may sound generic
- AI wording support is not connected yet
- advanced scenario variety is not implemented yet
- user accounts/authentication are not implemented
- saved-session replay/hydration is not fully implemented as a user-facing feature

---

## Recommended Next Development Areas

The next major development area should be scenario expansion.

Suggested order:

1. Define scenario writing framework and difficulty criteria
2. Create a reusable scenario authoring template
3. Build Scenario 2 as the normal next scenario
4. Build a harder scenario for high-performing learners
5. Build an adaptive remediation scenario for low-performing learners
6. Connect adaptive progression routing
7. Later connect AI-supported feedback wording

---

## Scenario Expansion Direction

Cybraxis scenarios should remain focused on SOC analyst investigation of network attacks.

Future scenarios should preserve the attack-lifecycle structure used in Scenario 1, but vary the attack pattern, evidence, topology, investigation pressure, and response requirements.

The intended scenario set is:

1. Scenario 1 — foundational network attack campaign
2. Scenario 2 — normal next network attack scenario
3. Scenario 3 — harder network attack scenario for strong performers
4. Scenario 4 — adaptive remediation scenario for learners who need targeted practice

The remediation scenario should not be generic. It should adapt to the learner’s weakness:

- weak timing → slower alert pace, longer timers, clearer triage flow
- weak coverage → fewer suspicious nodes and clearer required investigation targets
- weak sequence quality → repeated investigate-before-contain practice
- high wrong-action count → clearer action consequences and response selection practice
- high guidance dependency → more structured but gradually reduced mentor support

---

## Current Conclusion

Cybraxis now has a stable Scenario 1 prototype with working frontend gameplay, React Flow visualization, Express backend integration, PostgreSQL persistence, and final learner report generation.

The next major step is expanding the scenario library and connecting adaptive progression.