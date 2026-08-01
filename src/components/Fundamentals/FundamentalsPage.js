import React from "react";
import "./FundamentalsPage.css";

const sections = [
  {
    title: "SOC Investigation Mindset",
    intro:
      "Cybraxis is built around evidence-first investigation. The goal is not to click the fastest response button, but to understand what is happening before containment.",
    points: [
      "Start by identifying the suspicious source, target, and path.",
      "Use logs, alerts, and node information together instead of relying on one clue.",
      "Response actions such as blocking or isolating should happen after enough evidence is collected.",
      "A weak response can be harmful if it targets the wrong asset or hides useful evidence."
    ]
  },
  {
    title: "Threats, Vulnerabilities, and Risk",
    intro:
      "Security decisions depend on understanding what can go wrong, how likely it is, and how serious the impact would be.",
    points: [
      "A threat actor is any person or group that can cause harm to a system intentionally or accidentally.",
      "A vulnerability is a weakness in a system, process, configuration, or user behavior.",
      "Risk combines likelihood and impact: how likely exploitation is, and how damaging it would be.",
      "Attack surface means all possible entry points into a system or network.",
      "Attack vectors are the specific paths used to exploit those entry points."
    ]
  },
  {
    title: "Network Basics for Investigation",
    intro:
      "Many attacks are visible through network behavior. Understanding basic network structure helps the analyst follow the attacker path.",
    points: [
      "TCP/IP controls how devices communicate across networks.",
      "IP addresses identify network devices, while TCP/UDP ports identify services.",
      "Subnetting divides large networks into smaller segments.",
      "VLANs separate traffic logically, even when devices share the same physical switch.",
      "NAT/PAT allows private internal devices to communicate through public addresses.",
      "Topology describes how devices and network paths are connected."
    ]
  },
  {
    title: "Reconnaissance and Discovery",
    intro:
      "Reconnaissance is the process of mapping systems, services, and possible entry points. Defenders must recognize when normal discovery becomes suspicious.",
    points: [
      "Reconnaissance can reveal exposed services, open ports, network ranges, and possible targets.",
      "Topology discovery maps hosts, IP ranges, routes, and network structure.",
      "Service discovery identifies what services are running on a host.",
      "Repeated connection attempts, unusual DNS queries, or scanning patterns may indicate reconnaissance.",
      "The defender should validate the source and target before deciding to block traffic."
    ]
  },
  {
    title: "Common Evidence Sources",
    intro:
      "Cybraxis uses SOC-style evidence, not deep forensic investigation. The learner should know what each evidence source can reveal.",
    points: [
      "Firewall logs show allowed and blocked traffic between sources and destinations.",
      "IDS alerts highlight suspicious patterns or known attack signatures.",
      "DNS logs show domain lookups and can reveal beaconing or suspicious destinations.",
      "Proxy logs show web and outbound connection behavior.",
      "Authentication logs show login attempts, successful access, and unusual user behavior.",
      "Network flow summaries show who communicated with whom, when, and how much data moved."
    ]
  },
  {
    title: "Indicators, TTPs, and Threat Intelligence",
    intro:
      "A single alert is not always enough. Analysts often need to connect evidence to known patterns of attacker behavior.",
    points: [
      "A TTP describes attacker behavior: tactics, techniques, and procedures.",
      "An IoC is evidence that an attack happened or may still be happening.",
      "IoCs can include suspicious IPs, domains, unusual account usage, unknown services, or abnormal data transfer.",
      "Threat intelligence can help decide whether an IP, domain, or behavior is known to be suspicious.",
      "Threat intelligence must be correlated with local evidence before action is taken."
    ]
  },
  {
    title: "Security Controls",
    intro:
      "Security controls reduce risk by preventing, detecting, or limiting the impact of attacks.",
    points: [
      "Firewalls control traffic between networks or systems.",
      "IDS detects suspicious behavior and generates alerts.",
      "IPS can actively block suspicious traffic.",
      "MFA strengthens authentication by requiring more than a password.",
      "ACLs restrict who or what can access a resource.",
      "Encryption protects data confidentiality and integrity in transit or at rest."
    ]
  },
  {
    title: "Identity and Access Basics",
    intro:
      "Many incidents involve identity misuse. Analysts must understand whether account behavior is normal or suspicious.",
    points: [
      "Authentication verifies who the user is.",
      "Authorization controls what the user is allowed to access.",
      "MFA reduces the risk of password-only compromise.",
      "RBAC assigns permissions based on user roles.",
      "Least privilege means users should only have the access they need.",
      "Zero Trust assumes no user or device is trusted automatically."
    ]
  },
  {
    title: "Cybraxis Action Guide",
    intro:
      "These are the main actions the learner uses during gameplay. Each one should be chosen based on evidence.",
    points: [
      "Investigate IP: use when the suspicious source, destination, or communication path needs validation.",
      "Investigate User: use when authentication, account behavior, or user context matters.",
      "Isolate Machine: use when a specific endpoint is confirmed as affected and needs containment.",
      "Block IP: use when an external source or destination is confirmed as malicious or unsafe.",
      "Ignore: use carefully; ignoring real suspicious activity can allow the attack to continue."
    ]
  },
  {
    title: "Common Mistakes to Avoid",
    intro:
      "These are the main mistakes Cybraxis is designed to teach against.",
    points: [
      "Premature containment: blocking or isolating before collecting enough evidence.",
      "Wrong target: responding against the wrong node, user, or path.",
      "Incomplete evidence: acting after only one clue instead of correlating multiple sources.",
      "Poor action order: responding before investigating the relevant alert, log, or node.",
      "Ignoring suspicious activity because it looks internal or familiar.",
      "Missing the scope of the incident, especially during lateral movement or exfiltration."
    ]
  }
];

export default function FundamentalsPage({ onBack }) {
  return (
    <main className="fundamentals">
      <header className="fundamentals__hero">
        <div>
          <p className="fundamentals__eyebrow">Revise Fundamentals</p>
          <h1>Cybersecurity Investigation Basics</h1>
          <p>
            A quick revision page for the concepts needed before playing a Cybraxis
            scenario. It focuses on the practical knowledge a SOC analyst needs
            during investigation and response.
          </p>
        </div>

        {onBack && (
          <button className="fundamentals__back" onClick={onBack}>
            Back
          </button>
        )}
      </header>

      <section className="fundamentals__notice">
        <strong>Core rule:</strong> investigate first, respond second. Use evidence
        from alerts, logs, nodes, and network paths before taking containment action.
      </section>

      <section className="fundamentals__grid">
        {sections.map((section) => (
          <article className="fundamentals__card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.intro}</p>
            <ul>
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
