# Scenario 1 Replay Variants Design Notes

## Purpose

Scenario 1 replay variants are controlled alternatives to Scenario 1A. They exist so a player who fails Scenario 1A, completes a targeted remedy scenario, and returns for replay cannot simply memorize the original sequence.

Ideal flow:

Failed Scenario 1A
-> targeted remedy scenario
-> replay Scenario 1B
-> progress based on replay score

## Variant rule

Scenario variants must preserve:

- same 5-stage structure
- same learning objectives
- same action model
- same beginner/foundational difficulty
- same evidence-before-response philosophy
- same backend scoring concepts
- same weakness/remedy mapping

Scenario variants may change:

- asset names
- suspicious IPs/domains
- decoy nodes
- first evidence source
- log wording
- alert wording
- affected host
- exfiltration destination
- evidence placement
- timing profile

## Scenario 1B decision

Scenario 1B is approved for adaptation.

Working name:

South Bridge Pivot - Replay Variant B

Approved high-level flow:

1. External perimeter/RDP-style scanning
2. Credential-stuffing style suspicious authentication
3. Encrypted outbound beacon-like traffic
4. Internal discovery / SMB-style access pattern
5. Outbound upload / exfiltration path

This is suitable because it remains network/security-monitoring based and preserves the Scenario 1A learning sequence.

## Scenario 1B network-only adaptation notes

Use:

- firewall logs
- IDS alerts
- authentication summaries
- DNS logs
- proxy logs
- network flow summaries
- SMB/data-access summaries
- DLP/outbound transfer summaries
- SOC-facing endpoint status summaries

Avoid:

- Shodan references
- raw PowerShell details
- OS process analysis
- command-line forensics
- raw malware/beacon internals
- exact reused password disclosure
- cloud console actions
- SFTP/S3 confusion; describe cloud/object-storage style exfiltration as proxy/firewall-visible outbound upload

## Scenario 1C decision

The current Scenario 1C concept is not approved for implementation yet.

Reason:

The proposed database/web-shell idea contains too many mechanics that drift toward OS/web exploitation and command-level investigation, including web shell paths, command examples, and database-specific exploitation details.

Plan:

After Scenario 1B is fully converted and validated, ask HackerAI for a fresh Scenario 1C idea with stricter network-only constraints.

## Scenario 1C future requirements

Scenario 1C should be:

- fully network-based
- beginner/foundational
- 5 stages only
- compatible with existing Cybraxis actions
- no web shell commands
- no raw exploit commands
- no OS/process/registry/forensic analysis
- no social engineering
- no cloud-console/admin UI actions

## Implementation priority

1. Convert Scenario 1B into Cybraxis JSON draft.
2. Add AI metadata to every Scenario 1B stage.
3. Validate JSON.
4. Validate AI-safe fact packs.
5. Add topology/registry support later.
6. Only after 1B is stable, redesign Scenario 1C.
