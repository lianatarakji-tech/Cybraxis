import React, { useEffect, useMemo, useState } from "react";
import "./ScenarioBriefing.css";

const SKIP_DELAY_MS = 5000;

function getScenarioIdentity(scenario, scenarioBundle) {
  return String(
    scenario?.scenario_id ||
      scenario?.id ||
      scenarioBundle?.id ||
      ""
  ).toLowerCase();
}

function getScenarioTitle(scenario, scenarioBundle) {
  return (
    scenario?.gameplay_name ||
    scenario?.gameplayName ||
    scenarioBundle?.gameplayName ||
    scenarioBundle?.descriptiveName ||
    scenario?.name ||
    "Cybraxis Scenario"
  );
}

function resolveBriefingCopy(scenario, scenarioBundle) {
  const scenarioId = getScenarioIdentity(scenario, scenarioBundle);
  const title = getScenarioTitle(scenario, scenarioBundle);

  if (scenarioId.includes("silent_beacon")) {
    return {
      title,
      subtitle:
        "A quiet internal signal is hiding in normal-looking network activity.",
      threatLine: "Stealth activity detected inside the environment",
      situation:
        "A low-confidence SOC alert appears during a normal shift. No major outage is visible, but repeated outbound requests and unusual timing patterns suggest that something inside the network may not be behaving normally.",
      assignment:
        "Reconstruct the activity from DNS, flow, log, and node evidence. Decide whether the activity is harmless noise or the start of a hidden compromise.",
      route: ["Signal", "Beaconing", "Pattern Check", "Evidence Validation"],
      focus: [
        "Watch for low-noise outbound behavior.",
        "Correlate multiple evidence sources before action.",
        "Do not assume quiet traffic is safe."
      ],
      intensity: "Stealth Case"
    };
  }

  if (
    scenarioId.includes("1b") ||
    scenarioId.includes("variant_b") ||
    scenarioId.includes("replay")
  ) {
    return {
      title,
      subtitle:
        "The attacker path has changed. This attempt is about analysis, not memory.",
      threatLine: "Variant replay with changed route and evidence order",
      situation:
        "A follow-up SOC case arrives after earlier perimeter probing. This time the suspicious route, affected assets, and evidence order are different.",
      assignment:
        "Rebuild the case from the current topology, alerts, logs, and node evidence. Confirm the correct path before containment.",
      route: ["Changed Signal", "Route Mapping", "Evidence Check", "Controlled Response"],
      focus: [
        "Compare the new route against node roles.",
        "Validate the path before isolating or blocking.",
        "Avoid memorized decisions from the first scenario."
      ],
      intensity: "Replay Variant"
    };
  }

  if (scenarioId.includes("external_recon_to_exfiltration")) {
    return {
      title,
      subtitle:
        "An attacker is probing the perimeter. If you miss the trail, the campaign may move toward data loss.",
      threatLine: "External reconnaissance may escalate into a full campaign",
      situation:
        "Your SOC shift begins with signs of external reconnaissance. What looks like outside probing may develop into access, execution, lateral movement, and possible exfiltration.",
      assignment:
        "Track the attacker path from the first suspicious signal onward. Confirm the affected route, gather enough evidence, and avoid responding too early against the wrong target.",
      route: ["Reconnaissance", "Access", "Execution", "Lateral Movement", "Exfiltration Risk"],
      focus: [
        "Identify the suspicious source, target, and path.",
        "Use alerts, logs, node details, and connections together.",
        "Investigate before containment so response hits the correct target."
      ],
      intensity: "Perimeter Breach"
    };
  }

  return {
    title,
    subtitle:
      "A new SOC case has entered the queue. The evidence is incomplete, and your decisions will shape the investigation.",
    threatLine: "New case awaiting analyst review",
    situation:
      "A new investigation has been assigned. The available evidence must be interpreted through alerts, logs, node information, and network relationships.",
    assignment:
      "Correlate the evidence, understand the path, and act only after the case supports a defensible response.",
    route: ["Alert", "Evidence Review", "Path Confirmation", "Response"],
    focus: [
      "Follow the investigation cycle carefully.",
      "Correlate multiple evidence sources.",
      "Avoid premature containment and wrong-target actions."
    ],
    intensity: "SOC Case"
  };
}

export default function ScenarioBriefing({ scenario, scenarioBundle, onContinue }) {
  const [canSkip, setCanSkip] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(SKIP_DELAY_MS / 1000)
  );

  const briefing = useMemo(
    () => resolveBriefingCopy(scenario, scenarioBundle),
    [scenario, scenarioBundle]
  );

  useEffect(() => {
    setCanSkip(false);
    setRemainingSeconds(Math.ceil(SKIP_DELAY_MS / 1000));

    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(
        0,
        Math.ceil((SKIP_DELAY_MS - elapsed) / 1000)
      );
      setRemainingSeconds(remaining);
    }, 250);

    const timeoutId = window.setTimeout(() => {
      setCanSkip(true);
      setRemainingSeconds(0);
      window.clearInterval(intervalId);
    }, SKIP_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [briefing.title]);

  const openActiveFundamentals = () => {
    const currentParams = new URLSearchParams(window.location.search);
    const menuParams = new URLSearchParams();

    const scenarioId =
      currentParams.get("scenario") ||
      scenario?.scenario_id ||
      scenario?.id ||
      scenarioBundle?.id ||
      "";

    const stage =
      currentParams.get("stage") ||
      currentParams.get("stageIdx") ||
      "";

    const resume = currentParams.get("resume") || "";

    menuParams.set("menu", "fundamentals");

    if (scenarioId) {
      menuParams.set("briefingReturnScenario", scenarioId);
    }

    if (stage) {
      menuParams.set("briefingReturnStage", stage);
    }

    if (resume) {
      menuParams.set("briefingReturnResume", resume);
    }

    window.location.assign(
      window.location.pathname + "?" + menuParams.toString()
    );
  };

  return (
    <main className="scenario-briefing">
      <section className="scenario-briefing__shell">
        <header className="scenario-briefing__poster">
          <div className="scenario-briefing__poster-copy">
            <span className="scenario-briefing__eyebrow">Scenario Briefing</span>
            <h1>{briefing.title}</h1>
            <p>{briefing.subtitle}</p>
          </div>

          <div className="scenario-briefing__threat-strip">
            <span>{briefing.intensity}</span>
            <strong>{briefing.threatLine}</strong>
          </div>
        </header>

        <section className="scenario-briefing__mission">
          <article className="scenario-briefing__brief">
            <span className="scenario-briefing__label">Situation</span>
            <p>{briefing.situation}</p>
          </article>

          <article className="scenario-briefing__brief scenario-briefing__brief--green">
            <span className="scenario-briefing__label">Your Assignment</span>
            <p>{briefing.assignment}</p>
          </article>
        </section>

        <section className="scenario-briefing__route">
          <div className="scenario-briefing__route-head">
            <span className="scenario-briefing__label">Campaign Route</span>
          </div>

          <div className="scenario-briefing__route-track">
            {briefing.route.map((step, index) => (
              <div className="scenario-briefing__route-step" key={step}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="scenario-briefing__bottom">
          <article className="scenario-briefing__focus">
            <span className="scenario-briefing__label">Learning Focus</span>
            <ul>
              {briefing.focus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="scenario-briefing__cycle">
            <span className="scenario-briefing__label">Investigation Cycle</span>
            <div className="scenario-briefing__cycle-track">
              <span>Identity</span>
              <span>Connectivity</span>
              <span>Controls</span>
              <span>Evidence</span>
              <span>Interpretation</span>
            </div>
          </article>
        </section>

        <footer className="scenario-briefing__actions">
          <button
            className="scenario-briefing__btn scenario-briefing__btn--secondary"
            onClick={openActiveFundamentals}
          >
            Revise Fundamentals
          </button>

          {canSkip ? (
            <button
              className="scenario-briefing__btn scenario-briefing__btn--primary"
              onClick={onContinue}
            >
              Start Scenario
            </button>
          ) : (
            <span className="scenario-briefing__delay">
              Start available in {remainingSeconds}s
            </span>
          )}
        </footer>
      </section>
    </main>
  );
}