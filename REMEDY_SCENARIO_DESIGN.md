# Cybraxis Remedy Scenario Design Brief

## Core rule

The backend decides. AI explains and humanises.

Remedy scenarios are targeted corrective practice modules. They do not replace the failed scenario and they are not shortcuts to the next normal scenario.

## Remedy progression flow

If a player scores 0-64 on a scenario, the backend recommends a targeted remedy scenario based on the primary detected weakness.

After completing the remedy scenario, the player returns to the failed scenario or an equivalent controlled variant to prove improvement.

Ideal future flow:

Failed Scenario 1A
-> targeted remedy scenario
-> replay Scenario 1B
-> progress to Scenario 2 or advanced path based on replay score

Progression after replay:

- replay score 0-64: recommend another remedy or repeat targeted practice
- replay score 65-85: advance to normal next scenario
- replay score 86-100: advance to advanced path if available

## Why this flow exists

A remedy scenario teaches and practices the weakness, but it does not prove the learner can handle the original incident context. The replay step proves transfer of learning.

## Shared remedy design rules

Remedy scenarios should be:

- short
- targeted
- network-based
- easier than normal scenarios
- focused on one primary weakness
- supported with stronger mentor guidance
- lower time pressure than normal scenarios
- built with the same backend scoring and AI metadata structure
- designed to return the learner to the failed scenario or variant after completion

Remedy scenarios should not be:

- generic easy scenarios
- shortcuts to Scenario 2
- OS/process/forensics scenarios
- social-engineering scenarios
- malware reverse-engineering scenarios
- dependent on AI for correctness or progression

## Network-only evidence boundary

Allowed evidence:

- firewall logs
- DNS logs
- proxy logs
- IDS alerts
- authentication summaries
- network flow summaries
- SOC-facing endpoint status summaries

Avoid:

- command-line investigation
- process trees
- registry analysis
- malware reverse engineering
- phishing/social engineering gameplay
- integrated enterprise system manipulation

## Required remedy scenario metadata

Each remedy scenario should include:

- scenario_id
- name
- description
- difficulty
- primary_weakness
- remedy_focus
- source_failed_scenario_types
- recommended_replay_target
- stages
- stage learning objectives
- required investigation coverage
- expected actions
- wrong actions
- preferred action order
- scoring
- consequences
- ai_metadata
- weakness_codes
- remedy_mapping
- hint_policy
- fact_pack_rules
- variant_design

## Initial remedy families

### 1. remedy_premature_containment_01

Primary weakness:

premature_containment

Player problem:

The player blocks, isolates, or contains before confirming enough evidence.

Training goal:

Teach evidence-before-response order.

Recommended structure:

3 short stages.

Stage 1: Suspicious Perimeter Contact

Objective:
Validate the suspicious external connection before blocking.

Evidence categories:

- external_recon_indicator
- ioc_validation
- containment_readiness

Correct order:

- investigate IP
- block IP

Premature action:

- block IP before required investigation coverage

Stage 2: Suspicious Internal Session

Objective:
Confirm the affected internal asset before isolation.

Evidence categories:

- host_scope_confirmation
- session_anomaly
- containment_readiness

Correct order:

- investigate user or investigate IP
- isolate machine

Premature action:

- isolate machine before confirming affected asset

Stage 3: Response Readiness Check

Objective:
Correlate source, affected asset, and control point before final response.

Evidence categories:

- ioc_validation
- scope_confirmation
- response_action_order

Correct order:

- investigate source/path
- apply matching response

Primary reinforced weakness:

premature_containment

Secondary reinforced weaknesses:

- scope_confirmation
- response_action_order

### 2. remedy_host_pivot_01

Primary weakness:

host_pivot_accuracy

Player problem:

The player chooses the wrong node, asset, user, or containment target.

Training goal:

Teach following the evidence trail across nodes instead of reacting to the loudest alert.

Recommended structure:

3 short stages.

Stage 1: Decoy Alert vs Real Path

Objective:
Compare the alert source with the actual network path before selecting a target.

Evidence categories:

- ioc_validation
- connectivity
- host_scope_confirmation

Correct action:

- investigate IP

Wrong target:

- acting on decoy workstation

Stage 2: Follow the Connection Trail

Objective:
Identify which internal asset is actually communicating with the suspicious endpoint.

Evidence categories:

- connectivity
- network_flow_anomaly
- scope_confirmation

Correct action:

- investigate IP or investigate user

Wrong target:

- isolating unrelated host

Stage 3: Confirm Correct Containment Target

Objective:
Apply containment only to the confirmed affected asset or control point.

Evidence categories:

- containment_readiness
- host_scope_confirmation
- ioc_validation

Correct order:

- investigate correct node
- isolate or block correct target

Wrong target:

- isolate decoy node

Primary reinforced weakness:

host_pivot_accuracy

Secondary reinforced weaknesses:

- scope_confirmation
- overreliance_on_single_node

### 3. remedy_evidence_completion_01

Primary weakness:

evidence_completion

Player problem:

The player acts with partial evidence and misses required investigation coverage.

Training goal:

Teach checking required evidence categories before response.

Recommended structure:

3 short stages.

Stage 1: One Clue Is Not Enough

Objective:
Confirm that one alert alone is insufficient before response.

Evidence categories:

- ioc_validation
- activity_confirmation

Correct action:

- investigate IP

Premature action:

- block IP after seeing only one alert

Stage 2: Complete the Coverage Set

Objective:
Validate source, affected asset, and suspicious behavior before containment.

Evidence categories:

- ioc_validation
- host_scope_confirmation
- activity_confirmation

Correct order:

- investigate source
- investigate affected asset
- response action

Stage 3: Evidence-to-Response Match

Objective:
Choose a response that matches the evidence collected.

Evidence categories:

- response_action_order
- containment_readiness

Correct response logic:

- block network path if evidence confirms external C2/path risk
- isolate host if evidence confirms compromised host risk

Wrong response examples:

- isolate host when only external path is confirmed
- block IP when host compromise is the main confirmed risk

Primary reinforced weakness:

evidence_completion

Secondary reinforced weaknesses:

- scope_confirmation
- response_action_order

## Shared AI metadata policy for remedy stages

Remedy stages should usually use:

default_support_level: medium
increase_after_wrong_attempts: 1
allow_exact_guidance_after_attempts: 3
allow_exact_guidance: false

AI must receive only backend-approved fact packs.

AI must not:

- choose correctness
- choose progression
- decide pass/fail
- change score
- invent evidence
- reveal exact answer unless backend allows it

## Implementation priority

Recommended order:

1. remedy_premature_containment_01
2. remedy_host_pivot_01
3. remedy_evidence_completion_01

The first implemented remedy should be premature containment because it is the most important beginner correction: investigate before responding.
