# Cybraxis Backend Plan

## Purpose

The backend will eventually support persistent scenario sessions, learner actions, investigation events, stage results, mentor guidance state, adaptive escalation history, and final scenario reports.

At the current stage, the backend is introduced as local contracts and mock APIs inside the frontend project. This avoids breaking the current React runtime while preparing the system for real persistence later.

---

## Current Frontend Responsibilities

The frontend currently controls:

- scenario loading
- stage progression
- timer behavior
- action handling
- investigation coverage tracking
- scoring summary generation
- mentor hint triggering
- node runtime updates
- UI rendering

This should not be moved all at once.

---

## Future Backend Responsibilities

The backend will eventually handle:

- loading available scenarios
- creating user sessions
- saving action events
- saving investigation events
- saving stage results
- saving timeout/escalation outcomes
- generating or storing final scenario reports
- storing mentor guidance profile history
- supporting AI mentor requests
- supporting analytics and thesis evaluation data

---

## Migration Strategy

### Phase 1 — Local Contracts

Create model files and mock API modules.

Goal:

- standardize data shapes
- avoid backend decisions too early
- keep the frontend stable

### Phase 2 — Local Mock Persistence

Save session data in memory or localStorage through backend-like API functions.

Goal:

- test session creation
- test stage result saving
- test final report object generation

### Phase 3 — Real Backend Server

Introduce Express/FastAPI/Firebase/Supabase/etc.

Goal:

- persist sessions outside browser memory
- store scenario attempts
- support real report retrieval

### Phase 4 — Backend-Assisted Runtime

Move selected runtime logic to backend only after frontend logic is stable.

Possible backend-controlled logic:

- scoring validation
- adaptive escalation history
- mentor AI context generation
- final report generation

---

## Data We Need to Persist

### Session

- session id
- scenario id
- started at
- ended at
- current stage
- completed stages
- final status

### Events

- investigation events
- response action events
- mentor events
- timer events
- system/stage events

### Stage Results

- stage id
- stage index
- passed/timed out
- score
- investigation coverage
- sequence quality
- time remaining
- wrong actions
- guidance profile
- escalation state

### Final Report

- total score
- stage-by-stage breakdown
- strengths
- weaknesses
- recommendations
- guidance dependency
- timing efficiency
- investigation coverage
- response quality
- final rounded feedback

---

## Important Constraint

Do not overcomplicate Scenario 1 before the runtime, scoring, mentor, backend, and graph logic are stable.

Scenario depth should be improved slowly in stages.