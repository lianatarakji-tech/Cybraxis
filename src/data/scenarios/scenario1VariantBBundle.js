import scenarioData from "../json_scenarios/scenario1_variant_b.json";

const SCENARIO = {
  nodes: [
    {
      id: "external",
      nodeType: "external",
      hostname: "EXT-RELAY-42",
      label: "EXTERNAL\n203.0.113.42",
      ip: "203.0.113.42",
      user: null,
      criticality: "medium",
      zone: "untrusted-external",
      role: "External attacker relay and possible exfiltration destination",
      lastActivity: "Repeated remote-service contact and later outbound transfer observed",
      position: { x: 680, y: 120 },

      securityProfile: {
        firewall: {
          present: false,
          product: "Unknown",
          baselineState: "untrusted",
        },
        monitoring: ["Firewall logs", "IDS alerts", "NetFlow"],
        trustLevel: "untrusted",
        restrictions: [
          "No trusted relationship with internal assets",
          "Should not receive repeated internal uploads",
        ],
      },

      networkProfile: {
        segment: "internet",
        allowedInbound: ["N/A"],
        allowedOutbound: ["Internet routes only"],
        exposedServices: ["Unknown remote endpoint"],
        expectedPeers: ["router"],
      },

      accessProfile: {
        accessLevel: "none",
        limitations: ["Should never control internal workstations or servers"],
      },
    },

    {
      id: "router",
      nodeType: "router",
      hostname: "RTR-EDGE-02",
      label: "EDGE RTR\n10.10.0.1",
      ip: "10.10.0.1",
      user: null,
      criticality: "high",
      zone: "perimeter",
      role: "Perimeter routing and firewall control point",
      lastActivity: "Remote-service probing and policy events observed",
      position: { x: 420, y: 90 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Edge Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Firewall logs", "IDS", "Connection tracking"],
        trustLevel: "controlled",
        restrictions: [
          "Only approved external services should be reachable",
          "Suspicious repeated external probing should be validated before blocking",
        ],
      },

      networkProfile: {
        segment: "perimeter",
        allowedInbound: ["Approved remote services only"],
        allowedOutbound: ["Internal routing", "approved internet egress"],
        exposedServices: ["Routing", "Firewall policy enforcement"],
        expectedPeers: ["external", "workstation4", "workstation7"],
      },

      accessProfile: {
        accessLevel: "admin-only",
        limitations: ["Should not be treated as compromised without evidence"],
      },
    },

    {
      id: "workstation4",
      nodeType: "workstation",
      hostname: "WS-FIN-04",
      label: "WS-FIN-04\n10.10.20.44",
      ip: "10.10.20.44",
      user: "afinley",
      criticality: "medium",
      zone: "finance-vlan",
      role: "Primary suspicious workstation in the replay variant",
      lastActivity: "Suspicious authentication, beaconing, and internal discovery activity",
      position: { x: 260, y: 230 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Defender Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Endpoint telemetry", "Authentication logs", "Process telemetry"],
        trustLevel: "internal-user",
        restrictions: [
          "No repeated external command-channel activity expected",
          "No broad internal discovery expected from this user workstation",
        ],
      },

      networkProfile: {
        segment: "finance-vlan",
        allowedInbound: ["Managed admin only"],
        allowedOutbound: ["DNS", "HTTP/HTTPS", "internal authentication", "approved SMB"],
        exposedServices: ["Client workstation services"],
        expectedPeers: ["router", "server", "database"],
      },

      accessProfile: {
        accessLevel: "standard-user",
        limitations: [
          "Should not perform internal discovery",
          "Should not stage or upload sensitive data",
        ],
      },
    },

    {
      id: "workstation3",
      nodeType: "workstation",
      hostname: "WS-ENG-03",
      label: "WS-ENG-03\n10.10.20.77",
      ip: "10.10.20.77",
      user: "rwalker",
      criticality: "low",
      zone: "operations-vlan",
      role: "Nearby workstation included as a comparison and decoy node",
      lastActivity: "Normal user activity baseline",
      position: { x: 580, y: 230 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Defender Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Endpoint telemetry", "Authentication logs"],
        trustLevel: "internal-user",
        restrictions: [
          "Should not be assumed compromised without direct evidence",
        ],
      },

      networkProfile: {
        segment: "operations-vlan",
        allowedInbound: ["Managed admin only"],
        allowedOutbound: ["DNS", "HTTP/HTTPS", "approved internal services"],
        exposedServices: ["Client workstation services"],
        expectedPeers: ["router", "server"],
      },

      accessProfile: {
        accessLevel: "standard-user",
        limitations: ["No privileged internal access expected"],
      },
    },

    {
      id: "server",
      nodeType: "server",
      hostname: "SRV-APP-02",
      label: "APP-SRV-02\n10.10.10.5",
      ip: "10.10.10.5",
      user: null,
      criticality: "high",
      zone: "core-services",
      role: "Internal DNS resolver and command-channel visibility point",
      lastActivity: "Unusual encrypted beacon pattern associated with workstation4",
      position: { x: 420, y: 350 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Server Firewall",
          baselineState: "enabled",
        },
        monitoring: ["DNS logs", "Query analytics", "Network telemetry"],
        trustLevel: "internal-service",
        restrictions: [
          "Workstations should show normal DNS patterns",
          "Repeated suspicious command-channel timing should be investigated",
        ],
      },

      networkProfile: {
        segment: "core-services",
        allowedInbound: ["DNS from internal clients"],
        allowedOutbound: ["DNS forwarding to approved resolvers"],
        exposedServices: ["DNS"],
        expectedPeers: ["workstation4", "workstation7", "router"],
      },

      accessProfile: {
        accessLevel: "service-controlled",
        limitations: ["No endpoint-style user activity expected"],
      },
    },

    {
      id: "database",
      nodeType: "server",
      hostname: "DB-FIN-01",
      label: "DB-FIN-01\n10.10.10.10",
      ip: "10.10.10.10",
      user: null,
      criticality: "high",
      zone: "identity-core",
      role: "Domain controller and authentication evidence source",
      lastActivity: "Suspicious authentication and internal discovery evidence observed",
      position: { x: 420, y: 460 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Server Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Authentication logs", "Directory service logs", "Security events"],
        trustLevel: "critical-internal",
        restrictions: [
          "Unusual authentication patterns must be validated",
          "Directory discovery from a workstation is suspicious",
        ],
      },

      networkProfile: {
        segment: "identity-core",
        allowedInbound: ["Authentication", "Directory services"],
        allowedOutbound: ["Domain service replication", "security telemetry"],
        exposedServices: ["Kerberos", "LDAP", "Directory services"],
        expectedPeers: ["workstation4", "database"],
      },

      accessProfile: {
        accessLevel: "privileged-service",
        limitations: ["Should not be directly manipulated by standard workstation users"],
      },
    },

  ],

  connections: [
  { id: "s1b-r-ext", from: "router", to: "external" },
  { id: "s1b-r-w3", from: "router", to: "workstation3" },
  { id: "s1b-r-w4", from: "router", to: "workstation4" },
  { id: "s1b-w4-s", from: "workstation4", to: "server" },
  { id: "s1b-s-db", from: "server", to: "database" },
],
};

const STAGE_SUSPICIOUS_NODES = {
  recon: ["router", "external"],
  access: ["workstation4", "external"],
  execution: ["workstation4"],
  lateral: ["workstation4", "server", "database"],
  exfil: ["workstation4", "server", "database", "external"],
};

const STAGE_ATTACK_EDGES = {
  recon: ["s1b-r-ext"],
  access: ["s1b-r-ext", "s1b-r-w4"],
  execution: ["s1b-r-w4", "s1b-w4-s"],
  lateral: ["s1b-r-w4", "s1b-w4-s", "s1b-s-db"],
  exfil: ["s1b-w4-s", "s1b-s-db", "s1b-r-ext"],
};

const STAGE_NODE_CONTEXT = {
  recon: {
    router: {
      status: "suspicious",
      controlState: "perimeter-service-under-probe",
      evidenceScore: 45,
      confidence: "medium",
      activity: "Perimeter probing is visible at the edge router.",
      interpretation:
        "The router is suspicious as the monitored perimeter point. It should be investigated before applying a block.",
    },
    external: {
      status: "suspicious",
      controlState: "outside-control",
      evidenceScore: 50,
      confidence: "medium",
      activity: "External relay is associated with repeated contact attempts.",
      interpretation:
        "The external node may be hostile infrastructure, but the internal path should be validated before blocking.",
    },
  },

  access: {
    workstation4: {
      status: "suspicious",
      controlState: "authentication-anomaly-observed",
      evidenceScore: 70,
      confidence: "medium",
      activity: "Suspicious authentication activity is tied to WS-FIN-04.",
      interpretation:
        "The workstation is the primary host to investigate because the authentication evidence points there.",
    },
    external: {
      status: "suspicious",
      controlState: "possible-origin",
      evidenceScore: 40,
      confidence: "low",
      activity: "The external relay remains linked to the access path.",
      interpretation:
        "External activity matters, but the host and access evidence should be confirmed first.",
    },
  },

  execution: {
    workstation4: {
      status: "compromised",
      controlState: "command-channel-active",
      evidenceScore: 86,
      confidence: "high",
      activity: "Command-channel style behavior is associated with WS-FIN-04.",
      interpretation:
        "The workstation now has stronger compromise evidence and should be contained after sufficient investigation.",
    },
    server: {
      status: "suspicious",
      controlState: "service-telemetry-evidence",
      evidenceScore: 60,
      confidence: "medium",
      activity: "Application server telemetry helps confirm unusual communication timing.",
      interpretation:
        "The server provides supporting evidence for the path rather than being confirmed compromised at this stage.",
    },
  },

  lateral: {
    workstation4: {
      status: "compromised",
      controlState: "internal-discovery-source",
      evidenceScore: 84,
      confidence: "high",
      activity: "WS-FIN-04 is performing internal discovery and reaching sensitive services.",
      interpretation:
        "The compromised workstation appears to be the source of lateral movement behavior.",
    },
    server: {
      status: "suspicious",
      controlState: "internal-service-path-under-abuse",
      evidenceScore: 72,
      confidence: "medium",
      activity: "The application server is receiving unusual internal access from the compromised workstation.",
      interpretation:
        "The server matters because the attacker is using it as part of the internal movement path.",
    },
    database: {
      status: "suspicious",
      controlState: "sensitive-data-target",
      evidenceScore: 70,
      confidence: "medium",
      activity: "Database access appears in the lateral movement path.",
      interpretation:
        "The database matters because attacker movement is approaching sensitive data.",
    },
  },

  exfil: {
    workstation4: {
      status: "compromised",
      controlState: "staging-source",
      evidenceScore: 86,
      confidence: "high",
      activity: "WS-FIN-04 is associated with staged data and outbound transfer behavior.",
      interpretation:
        "The compromised workstation remains central because it links staging and outbound communication.",
    },
    server: {
      status: "suspicious",
      controlState: "transfer-path",
      evidenceScore: 76,
      confidence: "medium",
      activity: "The application server appears in the outbound transfer path.",
      interpretation:
        "The server helps explain how internal access connects to the final outbound path.",
    },
    database: {
      status: "compromised",
      controlState: "sensitive-data-accessed",
      evidenceScore: 82,
      confidence: "high",
      activity: "Sensitive database access and staging evidence are present.",
      interpretation:
        "The database confirms data risk and should be investigated before final blocking.",
    },
    external: {
      status: "suspicious",
      controlState: "exfiltration-destination",
      evidenceScore: 78,
      confidence: "high",
      activity: "External endpoint receives suspicious outbound upload traffic.",
      interpretation:
        "The external node is the likely exfiltration destination and is appropriate to block after validating the path.",
    },
  },
};

const MENTOR_IDLE_HINTS = {
  recon:
    "Start with the perimeter and the external source. Confirm what is being probed before blocking anything.",
  access:
    "Authentication evidence should connect the suspicious user or host to the activity. Check WS-FIN-04 and DC-CORE-01.",
  execution:
    "Execution is stronger than access suspicion. Look for host activity and command-channel evidence before containment.",
  lateral:
    "Follow the internal path from the compromised workstation toward identity and file services.",
  exfil:
    "Confirm the staged data and outbound destination before applying the final block.",
};

const KILL_CHAIN_STAGES = [
  {
    id: "recon",
    label: "Reconnaissance",
    short: "RECON",
    number: 1,
    description:
      "External reconnaissance tests the perimeter and identifies reachable services.",
    guidance:
      "Validate the external source, router evidence, and affected internal path before response.",
    alertExplanation:
      "The alert indicates probing against exposed remote service paths.",
    logExplanation:
      "Look for repeated connection attempts, service exposure, and whether internal assets appear in the path.",
  },
  {
    id: "access",
    label: "Initial Access",
    short: "ACCESS",
    number: 2,
    description:
      "Suspicious authentication suggests the attacker may have obtained a foothold.",
    guidance:
      "Investigate the affected workstation and identity evidence before isolating.",
    alertExplanation:
      "The alert points to abnormal authentication activity tied to WS-FIN-04.",
    logExplanation:
      "Look for unusual login source, user context, and authentication timing.",
  },
  {
    id: "execution",
    label: "Execution",
    short: "EXEC",
    number: 3,
    description:
      "Command-channel evidence suggests active attacker operation from the compromised workstation.",
    guidance:
      "Confirm command-channel evidence through workstation and DNS telemetry before containment.",
    alertExplanation:
      "The alert suggests encrypted beacon behavior rather than normal outbound traffic.",
    logExplanation:
      "Look for beacon timing, external peer consistency, and abnormal host behavior.",
  },
  {
    id: "lateral",
    label: "Lateral Movement",
    short: "LATERAL",
    number: 4,
    description:
      "Internal discovery and sensitive service access indicate movement toward higher-value assets.",
    guidance:
      "Trace activity from WS-FIN-04 to domain and file services.",
    alertExplanation:
      "The alert indicates the attacker is moving beyond the first host.",
    logExplanation:
      "Look for directory queries, SMB access, and abnormal internal service paths.",
  },
  {
    id: "exfil",
    label: "Data Exfiltration",
    short: "EXFIL",
    number: 5,
    description:
      "Sensitive data staging and outbound upload behavior indicate possible exfiltration.",
    guidance:
      "Validate staged data, upload path, and external destination before final blocking.",
    alertExplanation:
      "The alert combines sensitive data risk with outbound transfer behavior.",
    logExplanation:
      "Look for staged archives, sensitive share access, and outbound upload events.",
  },
];

const scenario1VariantBBundle = {
  id: scenarioData.scenario_id,
  gameplayName: "South Bridge Pivot",
  descriptiveName: scenarioData.name,
  difficulty: "Replay Variant",

  scenarioData,
  mapScenario: SCENARIO,

  mentorIdleHints: MENTOR_IDLE_HINTS,
  stageAttackEdges: STAGE_ATTACK_EDGES,
  stageNodeContext: STAGE_NODE_CONTEXT,
  stageSuspiciousNodes: STAGE_SUSPICIOUS_NODES,
  killChainStages: KILL_CHAIN_STAGES,
};

export default scenario1VariantBBundle;



