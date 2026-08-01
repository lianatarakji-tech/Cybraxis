// ─── SCENARIO / NETWORK MODEL ────────────────────────────────────────────────
// This file now contains both:
// 1) static asset profiles (what each node IS)
// 2) stage runtime context (what each node is DOING / what controls look like now)

export const SCENARIO = {
  nodes: [
    {
      id: 'external',
      nodeType: 'external',
      hostname: 'EXT-HOST-01',
      label: 'EXTERNAL\n45.33.32.156',
      ip: '45.33.32.156',
      user: null,
      criticality: 'medium',
      zone: 'untrusted-external',
      role: 'External source / suspected attacker infrastructure',
      lastActivity: 'Initial perimeter contact observed',
      position: { x: 490, y: 30 },

      securityProfile: {
        firewall: {
          present: false,
          product: 'Unknown',
          baselineState: 'untrusted',
        },
        monitoring: ['Perimeter firewall', 'IDS', 'NetFlow visibility'],
        trustLevel: 'untrusted',
        restrictions: [
          'No direct trust with internal assets',
          'Internet-facing only',
        ],
      },

      networkProfile: {
        segment: 'internet',
        allowedInbound: ['N/A'],
        allowedOutbound: ['Internet routes only'],
        exposedServices: ['Unknown'],
        expectedPeers: ['router'],
      },

      accessProfile: {
        accessLevel: 'none',
        limitations: [
          'Should never obtain privileged internal access',
        ],
      },
    },

    {
      id: 'router',
      nodeType: 'router',
      hostname: 'ROUTER-01',
      label: 'ROUTER\n192.168.1.1',
      ip: '192.168.1.1',
      user: null,
      criticality: 'high',
      zone: 'perimeter',
      role: 'Perimeter gateway and routing enforcement point',
      lastActivity: 'Firewall rule checked',
      position: { x: 280, y: 30 },

      securityProfile: {
        firewall: {
          present: true,
          product: 'Cisco Zone-Based Firewall',
          baselineState: 'enabled',
        },
        monitoring: ['Firewall logs', 'IDS mirror feed', 'ACL audit'],
        trustLevel: 'controlled',
        restrictions: [
          'Only approved ingress/egress flows',
          'Perimeter filtering enforced',
        ],
      },

      networkProfile: {
        segment: 'perimeter',
        allowedInbound: ['Approved inbound edge traffic'],
        allowedOutbound: ['Internal routing', 'Internet egress'],
        exposedServices: ['Routing', 'ACL enforcement'],
        expectedPeers: ['external', 'workstation1', 'workstation2'],
      },

      accessProfile: {
        accessLevel: 'admin-only',
        limitations: [
          'No workstation-level user activity expected',
          'Should not execute endpoint-like behavior',
        ],
      },
    },

    {
      id: 'workstation1',
      nodeType: 'workstation',
      hostname: 'WS-04',
      label: 'WS-04\n10.0.0.12',
      ip: '10.0.0.12',
      user: 'jsmith',
      criticality: 'medium',
      zone: 'user-lan',
      role: 'User workstation',
      lastActivity: 'Normal user activity baseline',
      position: { x: 60, y: 150 },

      securityProfile: {
        firewall: {
          present: true,
          product: 'Windows Defender Firewall',
          baselineState: 'enabled',
        },
        monitoring: ['Sysmon-style process telemetry', 'EDR alerting', 'Auth logs'],
        trustLevel: 'internal-user',
        restrictions: [
          'No direct internet-admin exposure expected',
          'Lateral admin access should be restricted',
        ],
      },

      networkProfile: {
        segment: 'user-vlan-10',
        allowedInbound: ['Managed admin channels only'],
        allowedOutbound: ['DNS', 'HTTP/HTTPS', 'internal auth', 'approved business traffic'],
        exposedServices: ['Client services only'],
        expectedPeers: ['router', 'server'],
      },

      accessProfile: {
        accessLevel: 'standard-user',
        limitations: [
          'No privileged service account usage expected',
          'No sustained C2-style outbound beaconing expected',
        ],
      },
    },

    {
      id: 'workstation2',
      nodeType: 'workstation',
      hostname: 'WS-07',
      label: 'WS-07\n10.0.0.15',
      ip: '10.0.0.15',
      user: 'mdavis',
      criticality: 'medium',
      zone: 'user-lan',
      role: 'User workstation',
      lastActivity: 'Normal user activity',
      position: { x: 280, y: 150 },

      securityProfile: {
        firewall: {
          present: true,
          product: 'Windows Defender Firewall',
          baselineState: 'enabled',
        },
        monitoring: ['Endpoint telemetry', 'Auth logs'],
        trustLevel: 'internal-user',
        restrictions: [
          'Should not receive lateral admin connections from peer workstations',
        ],
      },

      networkProfile: {
        segment: 'user-vlan-10',
        allowedInbound: ['Managed admin channels only'],
        allowedOutbound: ['DNS', 'HTTP/HTTPS', 'internal auth'],
        exposedServices: ['Client services only'],
        expectedPeers: ['router'],
      },

      accessProfile: {
        accessLevel: 'standard-user',
        limitations: [
          'No privileged or server-admin behavior expected',
        ],
      },
    },

    {
      id: 'server',
      nodeType: 'server',
      hostname: 'SRV-PROD-01',
      label: 'SRV-PROD-01\n10.0.0.20',
      ip: '10.0.0.20',
      user: null,
      criticality: 'high',
      zone: 'server-lan',
      role: 'Application / file service host',
      lastActivity: 'Normal internal service delivery',
      position: { x: 60, y: 290 },

      securityProfile: {
        firewall: {
          present: true,
          product: 'Windows Server Firewall + ACL',
          baselineState: 'enabled',
        },
        monitoring: ['Server logs', 'SMB monitoring', 'Authentication audit'],
        trustLevel: 'internal-service',
        restrictions: [
          'Only approved internal service traffic',
          'No unusual workstation-initiated admin behavior expected',
        ],
      },

      networkProfile: {
        segment: 'server-vlan-20',
        allowedInbound: ['Approved SMB/app traffic', 'Managed admin traffic'],
        allowedOutbound: ['Database communications', 'approved internal services'],
        exposedServices: ['SMB', 'Application services'],
        expectedPeers: ['workstation1', 'database'],
      },

      accessProfile: {
        accessLevel: 'service-controlled',
        limitations: [
          'Should not authenticate laterally with stolen privileged credentials',
        ],
      },
    },

    {
      id: 'database',
      nodeType: 'database',
      hostname: 'DB-SERVER-01',
      label: 'DB-SERVER\n10.0.0.21',
      ip: '10.0.0.21',
      user: null,
      criticality: 'critical',
      zone: 'data-vlan-30',
      role: 'Sensitive data store',
      lastActivity: 'Normal database service activity',
      position: { x: 280, y: 290 },

      securityProfile: {
        firewall: {
          present: true,
          product: 'Host-based DB ACL + network firewall policy',
          baselineState: 'enabled',
        },
        monitoring: ['DB audit logs', 'DLP visibility', 'network telemetry'],
        trustLevel: 'high-value-internal',
        restrictions: [
          'Only approved server-side access expected',
          'Direct user workstation access should be highly limited',
        ],
      },

      networkProfile: {
        segment: 'data-vlan-30',
        allowedInbound: ['Approved application/server traffic only'],
        allowedOutbound: ['Minimal controlled outbound'],
        exposedServices: ['Database listener'],
        expectedPeers: ['server'],
      },

      accessProfile: {
        accessLevel: 'highly-restricted',
        limitations: [
          'Bulk data access should be tightly monitored',
          'Unexpected large query/export behavior is suspicious',
        ],
      },
    },
  ],

  connections: [
    { id: 'e-r-w1', from: 'router', to: 'workstation1' },
    { id: 'e-r-w2', from: 'router', to: 'workstation2' },
    { id: 'e-w1-s', from: 'workstation1', to: 'server' },
    { id: 'e-s-db', from: 'server', to: 'database' },
    { id: 'e-r-ex', from: 'router', to: 'external' },
  ],
};

// ─── STAGE-AWARE NODE CONTEXT ────────────────────────────────────────────────
// This drives realistic runtime state rather than pure color changes.

export const STAGE_NODE_CONTEXT = {
  recon: {
    external: {
      status: 'suspicious',
      controlState: 'outside-control',
      evidenceScore: 50,
      confidence: 'medium',
      activity: 'Repeated probing against perimeter services',
      interpretation:
        'Suspicious because the host is conducting reconnaissance against the perimeter. It is not trusted and is actively gathering target information.',
    },
    router: {
      status: 'suspicious',
      controlState: 'firewall-active-under-probe',
      evidenceScore: 35,
      confidence: 'low',
      activity: 'Perimeter firewall registering probe and DNS-enumeration attempts',
      interpretation:
        'The router is suspicious as a monitored target, not because it is confirmed breached. Defensive controls appear active, but they are under pressure.',
    },
  },

  access: {
    workstation1: {
      status: 'suspicious',
      controlState: 'firewall-active-policy-bypassed-via-valid-access',
      evidenceScore: 68,
      confidence: 'medium',
      activity: 'Anomalous remote access behavior observed on user workstation',
      interpretation:
        'The workstation is suspicious because access patterns violate its normal baseline. Controls are present, but the attacker appears to be using a route that resembles legitimate access.',
    },
    external: {
      status: 'suspicious',
      controlState: 'outside-control',
      evidenceScore: 60,
      confidence: 'medium',
      activity: 'Suspected origin of remote access activity',
      interpretation:
        'The external node remains suspicious as the likely source of the access attempt.',
    },
  },

  execution: {
    workstation1: {
      status: 'compromised',
      controlState: 'firewall-active-host-behavior-malicious',
      evidenceScore: 88,
      confidence: 'high',
      activity: 'Malicious execution and outbound command-channel behavior detected',
      interpretation:
        'The workstation is now treated as compromised because multiple correlated indicators show active malicious behavior, not just isolated anomalies.',
    },
  },

  lateral: {
    workstation1: {
      status: 'compromised',
      controlState: 'firewall-active-lateral-abuse',
      evidenceScore: 92,
      confidence: 'high',
      activity: 'Compromised endpoint initiating internal movement',
      interpretation:
        'This endpoint is serving as the attacker foothold for movement across trust boundaries.',
    },
    server: {
      status: 'suspicious',
      controlState: 'firewall-active-trust-path-under-abuse',
      evidenceScore: 76,
      confidence: 'medium',
      activity: 'Receiving unusual internal authentication and service access patterns',
      interpretation:
        'The server is suspicious because allowed internal trust paths appear to be abused. This does not automatically mean the firewall is off; it may mean valid channels are being misused.',
    },
    database: {
      status: 'suspicious',
      controlState: 'restricted-sensitive-target',
      evidenceScore: 55,
      confidence: 'low',
      activity: 'Potential downstream target of internal pivot',
      interpretation:
        'The database is not yet fully compromised, but it is at increased risk because upstream systems are under attack.',
    },
  },

  exfil: {
    workstation1: {
      status: 'compromised',
      controlState: 'firewall-active-compromised-host',
      evidenceScore: 94,
      confidence: 'high',
      activity: 'Compromised endpoint involved in multi-stage attack chain',
      interpretation:
        'The original foothold remains compromised and continues to support the broader campaign.',
    },
    server: {
      status: 'compromised',
      controlState: 'service-trust-abused',
      evidenceScore: 90,
      confidence: 'high',
      activity: 'Internal pivot completed through service-tier host',
      interpretation:
        'The server appears compromised because attacker activity progressed beyond mere probing into active trust abuse and onward movement.',
    },
    database: {
      status: 'compromised',
      controlState: 'sensitive-access-abused',
      evidenceScore: 97,
      confidence: 'high',
      activity: 'Large-scale sensitive data access and staging behavior observed',
      interpretation:
        'The database is treated as compromised because high-confidence evidence indicates attacker access to sensitive records.',
    },
    external: {
      status: 'suspicious',
      controlState: 'outside-control-exfil-channel',
      evidenceScore: 89,
      confidence: 'high',
      activity: 'Receiving beaconing or exfil-related traffic',
      interpretation:
        'This external host is highly suspicious as a likely command-and-control or exfiltration endpoint.',
    },
  },
};

// ─── MENTOR HINTS ────────────────────────────────────────────────────────────
export const MENTOR_HINTS = {
  recon: [
    'A single external IP is probing your network — this is pre-attack reconnaissance. Investigate the source IP.',
    'DNS enumeration attempts reveal your domain structure. Check if zone transfers are restricted.',
    'OS fingerprinting means the attacker is building a profile of your systems. Review your firewall rules.',
  ],
  access: [
    'Repeated anomalous access from one source suggests the attacker may be exploiting valid-looking pathways. Compare the activity to the workstation baseline.',
    'A firewall being enabled does not guarantee safety if the attacker is operating through allowed trust paths or valid credentials.',
    'Investigate the workstation context before taking containment action.',
  ],
  execution: [
    'The key question is no longer whether the host is suspicious, but whether evidence now confirms compromise.',
    'Check whether outbound behavior violates the workstation’s expected traffic profile.',
    'Containment should follow after you validate the malicious communication pattern.',
  ],
  lateral: [
    'Lateral movement often abuses internal trust, not just exposed ports. Review which connections should normally exist.',
    'A server can become suspicious even when its firewall remains enabled, if valid trust paths are being misused.',
    'Track how the attacker is moving from user VLAN to server and then toward sensitive systems.',
  ],
  exfil: [
    'Large outbound data transfer plus sensitive record access is a strong sign of exfiltration.',
    'The database is critical — compare observed behavior to its tightly restricted baseline.',
    'Block the external channel only after confirming its role in the campaign.',
  ],
};

export const MENTOR_IDLE_HINTS = [
  'Remember: investigate the node in layers — identity, connectivity, controls, activity, then interpretation.',
  'A node can be suspicious because its trust path is being abused, even if the firewall is still enabled.',
  'Compare observed activity against the node baseline before deciding whether compromise is confirmed.',
  'Each Kill Chain stage changes not just the alert picture, but the meaning of node state and control state.',
];

// ─── EXTRA DYNAMIC LOGS ──────────────────────────────────────────────────────
export const STAGE_EXTRA_LOGS = {
  recon: [
    { id: 'dyn-r1', time: '09:26:44', msg: 'FIREWALL: Continued probe activity — 12 new port attempts from 203.0.113.42', type: 'warn' },
    { id: 'dyn-r2', time: '09:28:01', msg: 'IDS: Automated scan signature confirmed — Nmap detected', type: 'info' },
    { id: 'dyn-r3', time: '09:31:19', msg: 'FIREWALL: 203.0.113.42 probing service banners on ports 22, 3389', type: 'warn' },
  ],
  access: [
    { id: 'dyn-a1', time: '10:35:02', msg: 'AUTH: jsmith account — first login from external IP in 180 days', type: 'warn' },
    { id: 'dyn-a2', time: '10:37:44', msg: 'SESSION: Unusual remote session established on WORKSTATION-04', type: 'danger' },
    { id: 'dyn-a3', time: '10:40:18', msg: 'AUTH: Lateral authentication attempt baseline deviation on WORKSTATION-04', type: 'danger' },
  ],
  execution: [
    { id: 'dyn-e1', time: '11:14:55', msg: 'PROCESS: Suspicious process chain observed on WORKSTATION-04', type: 'danger' },
    { id: 'dyn-e2', time: '11:17:30', msg: 'NETWORK: Outbound encrypted command-channel pattern established to 45.33.32.156:4444', type: 'danger' },
    { id: 'dyn-e3', time: '11:20:08', msg: 'TELEMETRY: Host behavior diverges sharply from workstation baseline', type: 'danger' },
  ],
  lateral: [
    { id: 'dyn-l1', time: '12:00:44', msg: 'AUTH: Unusual privileged access pattern observed on SRV-PROD-01', type: 'danger' },
    { id: 'dyn-l2', time: '12:03:15', msg: 'NETWORK: Internal trust relationship appears to be under abuse', type: 'danger' },
    { id: 'dyn-l3', time: '12:05:50', msg: 'SMB: Additional shares enumerated on DB-SERVER-01', type: 'warn' },
  ],
  exfil: [
    { id: 'dyn-x1', time: '12:44:12', msg: 'NETWORK: Second exfil session started — 800MB additional transfer', type: 'danger' },
    { id: 'dyn-x2', time: '12:47:30', msg: 'DB: Additional tables accessed — payment_info, employee_records', type: 'danger' },
    { id: 'dyn-x3', time: '12:50:05', msg: 'DLP: CRITICAL — breach notification threshold exceeded', type: 'danger' },
  ],
};

// ─── KILL CHAIN STAGES ───────────────────────────────────────────────────────
export const KILL_CHAIN_STAGES = [
  { id: 'recon', label: 'Reconnaissance', short: 'RECON' },
  { id: 'access', label: 'Initial Access', short: 'ACCESS' },
  { id: 'execution', label: 'Execution', short: 'EXEC' },
  { id: 'lateral', label: 'Lateral Movement', short: 'LATERAL' },
  { id: 'exfil', label: 'Data Exfiltration', short: 'EXFIL' },
];

// ─── INITIAL NODE STATUSES PER STAGE ─────────────────────────────────────────
// Kept for compatibility with any existing components that still reference it.
export const STAGE_NODE_STATUSES = {
  recon: { router: 'suspicious', external: 'suspicious' },
  access: { workstation1: 'suspicious', external: 'suspicious' },
  execution: { workstation1: 'compromised' },
  lateral: { workstation1: 'compromised', server: 'suspicious', database: 'suspicious' },
  exfil: { workstation1: 'compromised', server: 'compromised', database: 'compromised', external: 'suspicious' },
};

export const NODE_LAST_ACTIVITY = {
  external: 'Perimeter probing observed',
  router: 'Firewall and ACL enforcement events',
  workstation1: 'User workstation baseline activity',
  workstation2: 'Idle — no recent suspicious activity',
  server: 'Normal service communications',
  database: 'Normal query processing',
};

export const STAGE_SUSPICIOUS_NODES = {
  recon: ['router', 'external'],
  access: ['workstation1', 'external'],
  execution: ['workstation1'],
  lateral: ['workstation1', 'server', 'database'],
  exfil: ['database', 'external', 'server'],
};

export const STAGE_ATTACK_EDGES = {
  recon: ['e-r-ex'],
  access: ['e-r-ex', 'e-r-w1'],
  execution: ['e-r-w1'],
  lateral: ['e-r-w1', 'e-w1-s', 'e-s-db'],
  exfil: ['e-w1-s', 'e-s-db', 'e-r-ex'],
};

// ─── AI TUTOR RESPONSES ──────────────────────────────────────────────────────
export const TUTOR_RESPONSES = {
  hint: {
    recon: 'Look at the source IP making repeated probes. The key lesson in this stage is that suspicious does not always mean compromised — it may mean a protected asset is being tested.',
    access: 'Compare the workstation’s observed activity to its baseline. The interesting question is whether the attacker is bypassing controls through allowed paths rather than by turning those controls off.',
    execution: 'At this stage, evidence is strong enough to move from anomaly discussion to compromise confirmation. Focus on correlated indicators and outbound behavior.',
    lateral: 'The attacker is now abusing internal trust. Review which node relationships are allowed and which of those are being misused.',
    exfil: 'Large data access plus external communications means you should evaluate both the criticality of the asset and the role of the external endpoint.',
  },
  alert: {
    recon: 'Recon alerts indicate intelligence gathering. They usually mark an attacker trying to understand services, routes, and defensive exposure before deeper intrusion.',
    access: 'Initial access alerts become meaningful when they conflict with the node baseline. A firewall may remain enabled while access still succeeds through a valid-looking route.',
    execution: 'Execution-stage alerts suggest the attacker has moved beyond access and is actively operating through the host or its network pathways.',
    lateral: 'Lateral alerts indicate trust abuse across the internal network. This often relies on legitimate protocols used in illegitimate ways.',
    exfil: 'Exfiltration alerts usually combine sensitive asset behavior with suspicious outbound transfer or beaconing patterns.',
  },
  log: {
    recon: 'These logs show perimeter probing and service discovery behavior. The defensive question is whether controls are resisting or being bypassed.',
    access: 'The logs matter because they show baseline deviation. The host is not suspicious merely because something happened, but because what happened should not normally occur there.',
    execution: 'Correlated network and host-adjacent telemetry now support a stronger compromise assessment.',
    lateral: 'The sequence of internal connections is the important signal. Allowed relationships can still become attacker pathways.',
    exfil: 'The logs combine asset-value context with transfer behavior. That combination is what makes exfiltration so serious.',
  },
  killchain: {
    recon: 'Stage 1 — Reconnaissance: the attacker maps the target environment and tests the perimeter.',
    access: 'Stage 2 — Initial Access: the attacker obtains a foothold, often through exposed or weakly protected access paths.',
    execution: 'Stage 3 — Execution: the attacker begins actively operating after foothold establishment.',
    lateral: 'Stage 4 — Lateral Movement: the attacker abuses internal trust relationships to reach more valuable assets.',
    exfil: 'Stage 5 — Data Exfiltration: the attacker extracts or prepares to extract valuable data while maintaining communications.',
  },
};