import scenarioData from "../json_scenarios/scenario2_silent_beacon.json";

const SCENARIO = {
  nodes: [
    {
      id: "externalDns",
      nodeType: "external",
      hostname: "UPDATE-CHECK-DDNS",
      label: "C2 DNS\nupdate-check.ddns.net",
      ip: "203.0.113.77",
      user: null,
      criticality: "high",
      zone: "untrusted-external",
      role: "Suspicious external DNS/C2 domain used by the beacon",
      lastActivity: "Repeated TXT query responses observed",
      position: { x: 640, y: 40 },

      securityProfile: {
        firewall: {
          present: false,
          product: "Unknown",
          baselineState: "untrusted",
        },
        monitoring: ["DNS telemetry", "Threat intelligence", "Firewall logs"],
        trustLevel: "untrusted",
        restrictions: [
          "No trusted relationship with internal assets",
          "Should not receive regular workstation TXT queries",
        ],
      },

      networkProfile: {
        segment: "internet",
        allowedInbound: ["N/A"],
        allowedOutbound: ["DNS responses"],
        exposedServices: ["DNS authoritative behavior"],
        expectedPeers: ["firewall"],
      },

      accessProfile: {
        accessLevel: "none",
        limitations: ["Should never control internal workstations"],
      },
    },

    {
      id: "firewall",
      nodeType: "router",
      hostname: "FW-01",
      label: "FW-01\nPERIMETER",
      ip: "10.0.1.1",
      user: null,
      criticality: "high",
      zone: "perimeter",
      role: "Perimeter firewall and egress control point",
      lastActivity: "Outbound DNS policy active",
      position: { x: 420, y: 40 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Perimeter Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Firewall logs", "DNS egress policy", "NetFlow"],
        trustLevel: "controlled",
        restrictions: [
          "Only approved outbound services should pass",
          "DNS should route through internal resolver",
        ],
      },

      networkProfile: {
        segment: "perimeter",
        allowedInbound: ["Approved inbound traffic only"],
        allowedOutbound: ["DNS forwarding", "HTTP/HTTPS", "approved business egress"],
        exposedServices: ["Egress filtering", "Routing"],
        expectedPeers: ["dnsServer", "externalDns"],
      },

      accessProfile: {
        accessLevel: "admin-only",
        limitations: ["Should not be bypassed by direct workstation DNS"],
      },
    },

    {
      id: "dnsServer",
      nodeType: "server",
      hostname: "CORP-DNS01",
      label: "DNS-SRV\n10.0.1.5",
      ip: "10.0.1.5",
      user: null,
      criticality: "high",
      zone: "core-services",
      role: "Internal DNS resolver and forwarding point",
      lastActivity: "Forwarding workstation DNS queries",
      position: { x: 420, y: 175 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Server Firewall",
          baselineState: "enabled",
        },
        monitoring: ["DNS debug logs", "Query analytics", "Forwarder logs"],
        trustLevel: "internal-service",
        restrictions: [
          "Workstations should query this resolver, not external DNS directly",
          "High-volume TXT queries are unusual",
        ],
      },

      networkProfile: {
        segment: "core-services",
        allowedInbound: ["DNS from internal clients"],
        allowedOutbound: ["DNS forwarding to approved resolvers"],
        exposedServices: ["DNS"],
        expectedPeers: ["workstationSales", "workstationDecoy", "firewall"],
      },

      accessProfile: {
        accessLevel: "service-controlled",
        limitations: ["No endpoint-like process execution expected"],
      },
    },

    {
      id: "workstationSales",
      nodeType: "workstation",
      hostname: "WS-SALES-01",
      label: "WS-SALES-01\n10.0.1.105",
      ip: "10.0.1.105",
      user: "jsmith",
      criticality: "medium",
      zone: "user-vlan-10",
      role: "Sales workstation and primary compromised host",
      lastActivity: "Normal sales user browsing baseline",
      position: { x: 145, y: 175 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Defender Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Endpoint telemetry", "Sysmon-style process logs", "Auth logs"],
        trustLevel: "internal-user",
        restrictions: [
          "No scheduled encoded PowerShell expected",
          "No high-volume DNS TXT beaconing expected",
          "No HR share access expected from sales workstation",
        ],
      },

      networkProfile: {
        segment: "user-vlan-10",
        allowedInbound: ["Managed admin only"],
        allowedOutbound: ["DNS", "HTTP/HTTPS", "internal auth", "approved SMB"],
        exposedServices: ["Client services only"],
        expectedPeers: ["dnsServer", "domainController", "fileServer"],
      },

      accessProfile: {
        accessLevel: "standard-user",
        limitations: [
          "Should not perform domain enumeration",
          "Should not stage sensitive HR archives",
        ],
      },
    },

    {
      id: "workstationDecoy",
      nodeType: "workstation",
      hostname: "WS-MKT-02",
      label: "WS-MKT-02\n10.0.1.112",
      ip: "10.0.1.112",
      user: "mgarcia",
      criticality: "medium",
      zone: "user-vlan-10",
      role: "Benign workstation used as comparison baseline",
      lastActivity: "Normal workstation DNS and web activity",
      position: { x: 650, y: 175 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Defender Firewall",
          baselineState: "enabled",
        },
        monitoring: ["Endpoint telemetry", "Auth logs", "DNS logs"],
        trustLevel: "internal-user",
        restrictions: ["No high-volume DNS TXT behavior expected"],
      },

      networkProfile: {
        segment: "user-vlan-10",
        allowedInbound: ["Managed admin only"],
        allowedOutbound: ["DNS", "HTTP/HTTPS", "internal auth"],
        exposedServices: ["Client services only"],
        expectedPeers: ["dnsServer"],
      },

      accessProfile: {
        accessLevel: "standard-user",
        limitations: ["No privileged data access expected"],
      },
    },

    {
      id: "domainController",
      nodeType: "server",
      hostname: "CORP-DC01",
      label: "DC-01\n10.0.1.10",
      ip: "10.0.1.10",
      user: null,
      criticality: "critical",
      zone: "core-services",
      role: "Domain controller and directory service target",
      lastActivity: "Normal authentication and directory activity",
      position: { x: 145, y: 330 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Server Firewall + AD auditing",
          baselineState: "enabled",
        },
        monitoring: ["Directory service logs", "Authentication logs", "LDAP query analytics"],
        trustLevel: "critical-internal",
        restrictions: [
          "Workstations should not perform high-volume directory enumeration",
        ],
      },

      networkProfile: {
        segment: "core-services",
        allowedInbound: ["Kerberos", "LDAP", "domain services"],
        allowedOutbound: ["Domain replication", "approved management"],
        exposedServices: ["LDAP", "Kerberos", "DNS support"],
        expectedPeers: ["workstationSales"],
      },

      accessProfile: {
        accessLevel: "domain-controlled",
        limitations: ["Bulk enumeration should be monitored and investigated"],
      },
    },

    {
      id: "fileServer",
      nodeType: "server",
      hostname: "CORP-FS01",
      label: "FS-01\n10.0.1.20",
      ip: "10.0.1.20",
      user: null,
      criticality: "critical",
      zone: "server-vlan-20",
      role: "File server containing sensitive HR documents",
      lastActivity: "Normal departmental file access",
      position: { x: 420, y: 330 },

      securityProfile: {
        firewall: {
          present: true,
          product: "Windows Server Firewall + file audit policy",
          baselineState: "enabled",
        },
        monitoring: ["SMB audit logs", "File access monitoring", "DLP telemetry"],
        trustLevel: "high-value-internal",
        restrictions: [
          "HR share access should be limited to HR-approved users",
          "Bulk archive creation from sales workstation is suspicious",
        ],
      },

      networkProfile: {
        segment: "server-vlan-20",
        allowedInbound: ["Approved SMB and file-service traffic"],
        allowedOutbound: ["Controlled internal services"],
        exposedServices: ["SMB", "File shares"],
        expectedPeers: ["workstationSales"],
      },

      accessProfile: {
        accessLevel: "restricted-data",
        limitations: ["Bulk file reads and archive staging should be investigated"],
      },
    },
  ],

  connections: [
    { id: "sb-fw-ext", from: "firewall", to: "externalDns" },
    { id: "sb-fw-dns", from: "firewall", to: "dnsServer" },
    { id: "sb-dns-ws", from: "dnsServer", to: "workstationSales" },
    { id: "sb-dns-decoy", from: "dnsServer", to: "workstationDecoy" },
    { id: "sb-ws-dc", from: "workstationSales", to: "domainController" },
    { id: "sb-ws-fs", from: "workstationSales", to: "fileServer" }
  ],
};

const MENTOR_IDLE_HINTS = [
  "DNS can be a command channel when query type, frequency, and destination do not match workstation baseline.",
  "Do not treat allowed protocols as automatically safe. Attackers often hide inside normal egress paths.",
  "Trace the sequence: DNS beacon, host persistence, internal reconnaissance, staging, containment.",
  "Before response, confirm which node, path, and evidence dimension supports your conclusion.",
];

const STAGE_NODE_CONTEXT = {
  dns_beaconing: {
    workstationSales: {
      status: "suspicious",
      controlState: "firewall-active-dns-beaconing",
      evidenceScore: 72,
      confidence: "medium",
      activity: "Repeated DNS TXT queries to rare dynamic DNS subdomains",
      interpretation:
        "The workstation is suspicious because its DNS pattern is repetitive, high-volume, and directed toward a rare external domain.",
    },
    dnsServer: {
      status: "suspicious",
      controlState: "resolver-forwarding-suspicious-domain",
      evidenceScore: 64,
      confidence: "medium",
      activity: "Forwarding unusual TXT queries from a single workstation",
      interpretation:
        "The DNS server is not compromised, but it is the visible path used by the suspicious beacon traffic.",
    },
    externalDns: {
      status: "suspicious",
      controlState: "outside-control-c2-domain",
      evidenceScore: 78,
      confidence: "high",
      activity: "Receiving repeated TXT queries from the internal resolver",
      interpretation:
        "The external domain is suspicious because the query pattern resembles command-and-control beaconing.",
    },
  },

  workstation_activity: {
    workstationSales: {
      status: "compromised",
      controlState: "scheduled-task-persistence-active",
      evidenceScore: 88,
      confidence: "high",
      activity: "Scheduled task and encoded PowerShell execution observed",
      interpretation:
        "The workstation is treated as compromised because host evidence shows persistence and script execution, not only network anomaly.",
    },
  },

  internal_recon: {
    workstationSales: {
      status: "compromised",
      controlState: "beacon-controlled-internal-recon",
      evidenceScore: 91,
      confidence: "high",
      activity: "Compromised workstation performing high-volume directory queries",
      interpretation:
        "The workstation is now being used as an internal reconnaissance platform.",
    },
    domainController: {
      status: "suspicious",
      controlState: "directory-service-under-enumeration",
      evidenceScore: 76,
      confidence: "medium",
      activity: "Domain controller receiving unusual LDAP-style enumeration from a workstation",
      interpretation:
        "The domain controller is suspicious as a target of enumeration, not necessarily compromised.",
    },
  },

  data_staging: {
    workstationSales: {
      status: "compromised",
      controlState: "staging-sensitive-data",
      evidenceScore: 94,
      confidence: "high",
      activity: "Compressed HR archive created after file share access",
      interpretation:
        "The workstation remains compromised and is now being used to stage data before outbound transfer.",
    },
    fileServer: {
      status: "suspicious",
      controlState: "restricted-share-accessed",
      evidenceScore: 83,
      confidence: "high",
      activity: "Sensitive HR share accessed by a sales workstation outside baseline",
      interpretation:
        "The file server is suspicious as a high-value source of staged data.",
    },
  },

  containment: {
    workstationSales: {
      status: "compromised",
      controlState: "active-c2-and-staged-data",
      evidenceScore: 97,
      confidence: "high",
      activity: "Beacon and staged archive remain active pending containment",
      interpretation:
        "The workstation is the primary containment target because it hosts persistence and staged data.",
    },
    dnsServer: {
      status: "suspicious",
      controlState: "control-point-for-domain-block",
      evidenceScore: 70,
      confidence: "medium",
      activity: "Can enforce DNS block against malicious domain",
      interpretation:
        "The DNS server is a containment control point, not the compromised asset.",
    },
    externalDns: {
      status: "suspicious",
      controlState: "active-c2-domain",
      evidenceScore: 94,
      confidence: "high",
      activity: "Active C2 domain receiving beacon queries",
      interpretation:
        "The external domain is the active command path and should be blocked after validation.",
    },
    fileServer: {
      status: "suspicious",
      controlState: "data-source-exposed",
      evidenceScore: 82,
      confidence: "high",
      activity: "Sensitive files were accessed and staged through the compromised workstation",
      interpretation:
        "The file server remains relevant because it defines data exposure scope.",
    },
  },
};

const STAGE_ATTACK_EDGES = {
  dns_beaconing: ["sb-fw-dns", "sb-fw-ext"],
  workstation_activity: ["sb-dns-ws"],
  internal_recon: ["sb-ws-dc"],
  data_staging: ["sb-ws-fs"],
  containment: ["sb-dns-ws", "sb-fw-dns", "sb-fw-ext", "sb-ws-fs"],
};

const STAGE_SUSPICIOUS_NODES = {
  dns_beaconing: ["dnsServer", "externalDns"],
  workstation_activity: ["workstationSales"],
  internal_recon: ["domainController"],
  data_staging: ["fileServer"],
  containment: ["dnsServer", "externalDns", "fileServer"],
};

const KILL_CHAIN_STAGES = [
  {
    id: "dns_beaconing",
    label: "Suspicious DNS Beaconing",
    short: "DNS",
    number: 1,
    description:
      "Suspicious DNS beaconing indicates the attacker may be using DNS queries as a command-and-control channel. Validate DNS-SRV and the external C2 domain before applying a perimeter or DNS block.",
    guidance:
      "Start with DNS-SRV, confirm the suspicious external domain, then apply the DNS or perimeter block after evidence is validated.",
    alertExplanation:
      "The alert points to a DNS beaconing path, not just a single compromised workstation. Treat DNS-SRV and the external domain as key evidence.",
    logExplanation:
      "Look for repeated TXT queries, near-regular timing, unusual domain reputation, and workstation DNS volume above baseline.",
  },
  {
    id: "workstation_activity",
    label: "Compromised Workstation Activity",
    short: "HOST",
    number: 2,
    description:
      "Compromised workstation activity means host evidence now supports the network suspicion. Scheduled task creation and encoded PowerShell suggest persistence on WS-SALES-01.",
    guidance:
      "Inspect WS-SALES-01 user context, process activity, and scheduled task behavior before host containment.",
    alertExplanation:
      "The alert is host-centered. It should be validated through user/process evidence rather than only network traffic.",
    logExplanation:
      "Look for scheduled task creation, suspicious PowerShell execution, encoded commands, and whether the user context is expected.",
  },
  {
    id: "internal_recon",
    label: "Internal Reconnaissance",
    short: "RECON",
    number: 3,
    description:
      "Internal reconnaissance shows abnormal directory-service queries against DC-01 to map users, groups, service accounts, and possible data targets.",
    guidance:
      "Start with DC-01 and inspect directory query activity before disrupting the reconnaissance path.",
    alertExplanation:
      "The alert points to DC-01 as the reconnaissance target. The workstation is the source, but DC-01 explains what the attacker is trying to learn.",
    logExplanation:
      "Look for high-volume LDAP-style queries, enumeration timing, and whether the activity follows the DNS beacon or host compromise evidence.",
  },
  {
    id: "data_staging",
    label: "File Server Data Staging",
    short: "STAGE",
    number: 4,
    description:
      "Data staging activity shows suspicious access to sensitive files and archive creation on the file server before possible exfiltration.",
    guidance:
      "Start with the file server and validate sensitive file access and archive creation before containment.",
    alertExplanation:
      "The alert points to FS-01 because sensitive data access is the main risk. The workstation matters as the staging location.",
    logExplanation:
      "Look for abnormal SMB access, restricted share names, unusual user context, archive creation, and timing after reconnaissance.",
  },
  {
    id: "containment",
    label: "C2 Blocking and Host Containment",
    short: "CONTAIN",
    number: 5,
    description:
      "Final containment requires validating the active DNS C2 path and staged data exposure before blocking outbound communication.",
    guidance:
      "Focus on DNS-SRV, the external domain, and FS-01 before applying final containment.",
    alertExplanation:
      "The alert indicates a critical containment window. The correct response should be evidence-backed, not a blind block.",
    logExplanation:
      "Look for active beaconing, transfer instructions, staged archive presence, and whether outbound exfiltration has completed.",
  },
];

const scenario2SilentBeaconBundle = {
  id: scenarioData.scenario_id,
  gameplayName: "Silent Beacon",
  descriptiveName: scenarioData.name,
  difficulty: "Normal",

  scenarioData,
  mapScenario: SCENARIO,

  mentorIdleHints: MENTOR_IDLE_HINTS,
  stageAttackEdges: STAGE_ATTACK_EDGES,
  stageNodeContext: STAGE_NODE_CONTEXT,
  stageSuspiciousNodes: STAGE_SUSPICIOUS_NODES,
  killChainStages: KILL_CHAIN_STAGES,
};

export default scenario2SilentBeaconBundle;