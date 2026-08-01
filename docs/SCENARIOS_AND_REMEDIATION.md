# Scenarios and Remediation

## Scenario Design

Cybraxis scenarios model attacks as staged investigations.

A typical cycle includes:

1. Reconnaissance
2. Initial access
3. Execution
4. Lateral movement
5. Exfiltration or impact

Each stage introduces new alerts, evidence, network state, and allowed learner actions.

## Scenario 1A

Scenario 1A is the baseline multi-stage investigation.

## Scenario 1B — South Bridge Pivot

Scenario 1B is a replay variant with changed topology, node identities, IP addresses, evidence, logs, and attack path. Variants test transferable investigation skills instead of memorization.

## Scenario 2 — Silent Beacon

Silent Beacon provides a separate investigation path and expands the learner’s exposure to different evidence and network behavior.

## Stage Replay

A stage may be replayed only after it has been passed. This prevents replay from bypassing failed work while allowing deliberate review.

## Remediation Flow

```text
Low-score report
      ↓
Learning review
      ↓
Short remediation module
      ↓
Playable remedy scenario
      ↓
Remedy evaluation
      ↓
Progression recommendation
```

The current remedies target premature containment and incomplete evidence collection.
