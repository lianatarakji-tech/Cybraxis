const SCENARIO_TOPOLOGY = {
  external_recon_to_exfiltration_1: {
    nodes: [
      { id: "router" },
      { id: "workstation1" },
      { id: "workstation2" },
      { id: "server" },
      { id: "database" },
      { id: "external" },
    ],
    connections: [
      { id: "e-r-w1", from: "router", to: "workstation1" },
      { id: "e-r-w2", from: "router", to: "workstation2" },
      { id: "e-w1-s", from: "workstation1", to: "server" },
      { id: "e-s-db", from: "server", to: "database" },
      { id: "e-r-ex", from: "router", to: "external" },
    ],
  },

  external_recon_to_exfiltration_1b: {
    nodes: [
      { id: "router" },
      { id: "workstation4" },
      { id: "workstation7" },
      { id: "dnsServer" },
      { id: "domainController" },
      { id: "fileServer" },
      { id: "external" }
    ],
    connections: [
      { id: "s1b-r-ext", from: "router", to: "external" },
      { id: "s1b-r-w4", from: "router", to: "workstation4" },
      { id: "s1b-r-w7", from: "router", to: "workstation7" },
      { id: "s1b-w4-dns", from: "workstation4", to: "dnsServer" },
      { id: "s1b-w4-dc", from: "workstation4", to: "domainController" },
      { id: "s1b-w4-fs", from: "workstation4", to: "fileServer" },
      { id: "s1b-fs-ext", from: "fileServer", to: "external" }
    ],
  },

  silent_beacon_1: {
    nodes: [
      { id: "externalDns" },
      { id: "firewall" },
      { id: "dnsServer" },
      { id: "workstationSales" },
      { id: "workstationDecoy" },
      { id: "domainController" },
      { id: "fileServer" },
    ],
    connections: [
      { id: "sb-fw-ext", from: "firewall", to: "externalDns" },
      { id: "sb-fw-dns", from: "firewall", to: "dnsServer" },
      { id: "sb-dns-ws", from: "dnsServer", to: "workstationSales" },
      { id: "sb-dns-decoy", from: "dnsServer", to: "workstationDecoy" },
      { id: "sb-ws-dc", from: "workstationSales", to: "domainController" },
      { id: "sb-ws-fs", from: "workstationSales", to: "fileServer" },
    ],
  },
};

function getScenarioTopologyById(scenarioId) {
  return SCENARIO_TOPOLOGY[scenarioId] || null;
}

module.exports = {
  getScenarioTopologyById,
};
