# Cybraxis Scenario Authoring Template

## Purpose

This document defines the standard authoring structure for Cybraxis scenarios.

Cybraxis scenarios must remain focused on SOC analyst investigation of network attacks. Each scenario should train the learner to investigate alerts, inspect network nodes, review logs, connect evidence, choose defensive actions, and progress through a staged attack lifecycle.

The goal is not to create random cybersecurity quizzes or disconnected labs. Each scenario must feel like a network-centered SOC investigation campaign.

---

## Core Scenario Rule

Every playable Cybraxis scenario must be:

- network-focused
- SOC analyst oriented
- staged through an attack lifecycle
- evidence-driven
- rule-evaluated
- scoreable
- compatible with the network map, alerts, logs, actions, mentor guidance, backend persistence, and final report

A scenario should not be accepted if it is only:

- a phishing inbox exercise
- a password quiz
- a generic web vulnerability lab
- a static reading task
- a malware description exercise
- a scenario without network evidence or network-path reasoning

If a topic such as phishing, malware, or credential abuse is used, it must still be represented through network/SOC evidence such as suspicious authentication, endpoint activity, traffic patterns, lateral movement, command-and-control communication, data staging, or exfiltration behavior.

---

## Required Scenario Structure

Each scenario should include the following major sections:

1. Scenario metadata
2. Learning goals
3. Network topology
4. Attack lifecycle stages
5. Alerts
6. Logs
7. Investigation requirements
8. Expected actions
9. Wrong or risky actions
10. Runtime consequences
11. Scoring rules
12. Mentor guidance
13. Final report interpretation support
14. Adaptive progression role

---

## Scenario Metadata

Each scenario must define:

- scenario id
- scenario name
- difficulty level
- recommended learner level
- scenario category
- estimated duration
- number of stages
- main attack pattern
- primary learning objective

Example:

Scenario ID: network_c2_lateral_movement_1  
Scenario Name: Command-and-Control Beaconing to Internal Pivot  
Difficulty: Normal  
Category: Network SOC Investigation  
Stages: 5  
Estimated Duration: 8–12 minutes  
Primary Objective: Investigate suspicious network activity, identify the compromised host, trace attacker movement, and contain the attack path.

---

## Difficulty Categories

### Foundational

Used for first exposure and baseline practice.

Characteristics:

- clear attack path
- limited number of suspicious nodes
- moderate number of logs
- simple evidence correlation
- forgiving timing
- direct mentor support

### Normal

Used for standard progression after the foundational scenario.

Characteristics:

- full attack lifecycle
- moderate evidence volume
- some ambiguity
- moderate timing pressure
- multiple investigation targets
- standard mentor support

### Hard / Advanced

Used when the learner performs strongly.

Characteristics:

- more nodes
- more network paths
- more subtle suspicious behavior
- misleading but plausible evidence
- stricter action order requirements
- higher timing pressure
- stronger penalties for premature containment

### Remediation

Used when the learner performs weakly.

Characteristics:

- same SOC investigation structure
- targeted practice based on weakness
- simpler or slower scenario conditions
- clearer evidence
- more structured mentor support
- fewer distractions

Remediation should not simply mean “easy.” It should address the learner’s weakest performance dimension.

---

## Adaptive Progression Logic

Future adaptive scenario routing should follow this baseline:

- Score 85+ -> unlock or move to a harder scenario
- Score 60–84 -> move to the next normal/recommended scenario
- Score below 60 -> recommend replay, remediation, or easier practice before progressing

This routing may also consider dimension-level weaknesses from the final report, such as timing, investigation coverage, sequence quality, response quality, and guidance dependency.

---

## Remediation Adaptation Rules

The remediation scenario should be targeted to the learner’s actual weakness.

### Weak Timing Efficiency

If the learner struggles with timing:

- increase stage timers
- reduce simultaneous alerts
- slow down escalation pressure
- make urgent evidence clearer
- train faster triage in a lower-pressure environment

### Weak Investigation Coverage

If the learner misses required evidence:

- reduce total node count
- reduce suspicious candidates
- make required investigation targets clearer
- provide mentor nudges toward missed nodes
- emphasize checking all relevant assets before response

### Weak Sequence Quality

If the learner acts in the wrong order:

- focus on investigate-before-contain practice
- warn before premature containment
- require interpretation before final response
- repeat the correct SOC action order across stages

### Weak Response Quality

If the learner chooses wrong or harmful actions:

- reduce the number of response choices
- clarify response consequences
- highlight the stage objective more clearly
- train correct containment level selection

### High Guidance Dependency

If the learner requests many hints:

- provide structured guidance early
- gradually reduce hint specificity
- encourage independent evidence interpretation
- score improvement based on reduced reliance over time

---

## Attack Lifecycle Structure

Every scenario should follow a staged attack lifecycle.

The exact stage names can differ, but the scenario should preserve progressive attacker movement and SOC investigation logic.

Recommended lifecycle structure:

1. Detection or Reconnaissance
2. Initial Access or Foothold
3. Execution / Establishment / Command-and-Control
4. Lateral Movement / Internal Pivot
5. Exfiltration / Impact / Final Containment

Example stage structures:

Foundational scenario:

- Reconnaissance
- Initial Access
- Execution
- Lateral Movement
- Data Exfiltration

C2-based network scenario:

- Suspicious Perimeter Traffic
- Initial Foothold
- Command-and-Control Beaconing
- Internal Pivot
- Data Staging and Exfiltration Attempt

Advanced scenario:

- Low-Noise External Probe
- Compromised Endpoint Activity
- Credentialed Internal Access
- Multi-Hop Lateral Movement
- Stealthy Data Staging

Remediation scenario:

- Alert Triage
- Suspicious Host Identification
- Evidence Confirmation
- Controlled Containment
- Review and Reinforcement

The lifecycle should be educationally controlled, not random.

---

## Network Topology Requirements

Each scenario must define a network topology with:

- nodes
- node types
- node positions
- IP addresses or hostnames
- zones or segments
- criticality levels
- connections
- trust relationships
- expected communication paths
- suspicious or attack paths

Node types may include:

- external source
- router / firewall / gateway
- workstation
- server
- database
- internal service
- security monitoring node

The topology should support investigation reasoning. It should not be decorative only.

---

## Node Authoring Requirements

Each node should define:

- id
- label
- node type
- hostname
- IP address
- zone
- role
- criticality
- network profile
- security profile
- access profile
- expected peers
- exposed services
- interpretation text

Example JSON shape:

{
  "id": "web-server",
  "label": "Web Server",
  "nodeType": "server",
  "hostname": "WEB-01",
  "ip": "10.0.2.15",
  "zone": "DMZ",
  "role": "Public-facing application server",
  "criticality": "medium"
}

---

## Connection Authoring Requirements

Each connection should define:

- id
- source node
- target node
- connection type
- expected or suspicious status
- whether it can become highlighted
- whether it can be blocked or removed
- whether it belongs to the attack path

Example JSON shape:

{
  "id": "edge-external-router",
  "from": "external",
  "to": "router",
  "type": "internet-facing",
  "expected": true
}

---

## Stage Authoring Requirements

Each stage must define:

- stage id
- stage name
- stage index
- learning objective
- time limit
- active alerts
- active logs
- suspicious nodes
- attack edges
- required investigation dimensions
- required target coverage
- expected action sequence
- wrong or risky actions
- progression conditions
- mentor hints
- consequences

Example:

Stage ID: c2_beaconing  
Stage Name: Command-and-Control Beaconing  
Learning Objective: Identify the compromised internal host by correlating repeated outbound beaconing with endpoint activity.  
Time Limit: 60 seconds  
Required Coverage: workstation activity, outbound connectivity, alert review  
Expected Actions: investigate alert, inspect workstation, review logs, block C2 destination

---

## Alerts Requirements

Each alert should support investigation, not just decoration.

Each alert should define:

- id
- stage id
- title
- severity
- related node
- related log
- description
- analyst relevance
- whether selecting it should highlight map evidence

Good alerts should make the learner ask:

- Which node is involved?
- What changed?
- Is this expected behavior?
- What evidence supports action?
- What should be investigated next?

---

## Logs Requirements

Logs should provide evidence for SOC reasoning.

Each log should define:

- id
- stage id
- timestamp
- source node
- destination node
- event type
- message
- severity
- related alert
- analyst interpretation

Log types may include:

- firewall
- DNS
- proxy
- endpoint
- authentication
- EDR
- IDS/IPS
- data transfer

Logs should be readable enough for beginner learners but realistic enough to support SOC-style reasoning.

---

## Investigation Dimensions

Each stage should require one or more investigation dimensions.

Possible dimensions:

- identity
- connectivity
- controls
- activity
- interpretation
- alert review
- log review
- path analysis
- containment validation

These dimensions connect learner investigation actions to scoring and progression.

A stage should not be passable only by guessing response actions. Required investigation coverage should force evidence review before containment.

---

## Expected Action Sequence

Each stage must define a preferred action sequence.

Typical sequence:

1. Review alert
2. Inspect related node
3. Review supporting logs
4. Interpret evidence
5. Apply correct response

The exact actions can vary by stage.

Correct actions in the wrong order may still pass partially but should reduce sequence quality.

Premature containment should be penalized if the learner acts before required evidence coverage is complete.

---

## Wrong and Risky Actions

Each stage should include wrong or risky actions.

Examples:

- blocking the wrong IP
- isolating a clean host
- ignoring the suspicious node
- containing before investigation coverage is complete
- escalating too early
- treating external scanning as internal compromise
- focusing on the wrong segment
- choosing host containment when network containment is required

Wrong actions should support learning by creating meaningful feedback and score consequences.

---

## Runtime Consequences

Scenario actions should visibly affect the environment.

Examples:

- suspicious node becomes compromised
- compromised node becomes isolated
- attack edge becomes highlighted
- blocked connection disappears
- new log appears
- mentor gives corrective feedback
- stage locks after success or timeout
- escalation appears after delay or failure

Consequences should make the network map feel meaningful.

---

## Scoring Requirements

Each scenario should support scoring through:

- base action score
- investigation coverage
- sequence quality
- timing efficiency
- wrong action penalties
- timeout or escalation penalties
- premature containment penalties
- response quality
- wrong abstraction-level penalties

Final scenario scoring should support:

- total score
- stage breakdown
- strengths
- weaknesses
- recommendations
- guidance dependency
- timing efficiency
- investigation coverage
- response quality
- sequence quality

---

## Mentor Guidance Requirements

Mentor guidance should be rule-selected first.

Each scenario should include:

- stage hint
- wrong order feedback
- correct sequence feedback
- coverage incomplete feedback
- wrong action feedback
- timeout feedback
- stage secured feedback

Later AI integration may improve the wording, but the decision about which feedback appears should remain deterministic.

---

## Scenario Difference Criteria

A new scenario should differ from previous scenarios in several meaningful ways.

A scenario should vary at least three of these:

- attack path
- entry point
- network topology
- critical asset
- evidence pattern
- alert type
- log type
- required investigation targets
- response strategy
- wrong-action traps
- timing pressure
- mentor support level
- scoring emphasis

A scenario should not be treated as different if it only changes labels while keeping the same reasoning pattern.

---

## Scenario Set Plan

### Scenario 1 — Foundational Network Intrusion Campaign

Purpose:

- teach full SOC investigation loop
- introduce staged attack lifecycle
- introduce evidence-before-response reasoning

Status:

- implemented

### Scenario 2 — Standard Network Intrusion Variant

Purpose:

- provide normal progression after Scenario 1
- introduce a different network attack pattern
- preserve full lifecycle structure
- add moderate ambiguity

Recommended focus:

- command-and-control beaconing
- internal pivot
- suspicious outbound traffic
- data staging attempt

### Scenario 3 — Advanced Network Intrusion Campaign

Purpose:

- challenge high-performing learners
- increase ambiguity and pressure
- require stronger prioritization

Recommended focus:

- stealthy multi-hop lateral movement
- misleading benign traffic
- stricter containment choices
- more subtle data staging

### Scenario 4 — Adaptive Remediation Scenario

Purpose:

- support low-performing learners
- adapt to weakness profile
- train the weakest skill dimension

Recommended focus:

- timing remediation
- coverage remediation
- sequence remediation
- response-quality remediation
- guidance-dependency reduction

---

## Scenario Design Checklist

Before accepting a scenario, confirm:

- It is network-focused.
- It fits SOC analyst investigation.
- It uses staged attack lifecycle progression.
- It has meaningful network topology.
- It has clear alerts and logs.
- It requires investigation before response.
- It has expected action order.
- It has wrong/risky actions.
- It has runtime consequences.
- It supports scoring.
- It supports final report dimensions.
- It supports mentor guidance.
- It feels meaningfully different from previous scenarios.
- It can be implemented using the existing Cybraxis scenario structure.

---

## HackerAI Brainstorming Use

External AI tools such as HackerAI may be used for brainstorming scenario ideas only.

Rules for using external AI responses:

- do not copy responses directly
- do not accept off-scope ideas
- do not allow the scenario to drift away from network SOC investigation
- use the response only for inspiration
- rewrite all accepted ideas into the Cybraxis scenario structure
- check every idea against the scenario design checklist
- reject anything that does not support staged network attack investigation

Recommended use:

1. Ask for network SOC scenario ideas.
2. Ask for attack lifecycle stages.
3. Ask for alert/log evidence ideas.
4. Ask for possible wrong actions and learning traps.
5. Extract useful parts.
6. Rewrite into Cybraxis format manually.
