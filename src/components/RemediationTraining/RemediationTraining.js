import React, { useMemo, useState } from "react";
import {
  resolveRemedyScenarioId,
  getRemedyScenarioLabel,
} from "../../data/remedyScenarioResolver";
import "./RemediationTraining.css";

const REVIEW_SECTIONS = [
  {
    id: "goal",
    title: "Training Goal",
    subtitle: "What this module is correcting",
    body:
      "This remediation module corrects weak evidence-first reasoning. Before choosing containment, the learner must review identity, connectivity, controls, activity, and interpretation.",
    expected:
      "Slow down the response process and explain the evidence before acting.",
  },
  {
    id: "evidence",
    title: "Evidence Review Drill",
    subtitle: "Alert, log, source, target, and stage context",
    body:
      "Match the alert with its related log, suspicious source, affected network node, and current kill-chain stage. Do not react only to severity.",
    expected:
      "Identify what happened, where it happened, which node is involved, and which log supports the alert.",
  },
  {
    id: "sequence",
    title: "Response Sequence Drill",
    subtitle: "Investigate before containment",
    body:
      "The correct beginner SOC order is investigation first, then response. Blocking or isolating too early reduces sequence quality.",
    expected:
      "Investigate identity, connectivity, controls, and activity before selecting block or isolate.",
  },
  {
    id: "decision",
    title: "Defensive Decision Drill",
    subtitle: "Contain only after evidence supports it",
    body:
      "Containment should happen after the suspicious path or affected host has been validated. The response must match the evidence.",
    expected:
      "Choose the response that interrupts the confirmed suspicious path without acting blindly.",
  },
];

function clearRemediationStorage() {
  [
    "cybraxisRemediationMode",
    "cybraxisRemediationWeakness",
    "cybraxisRemediationScenario",
    "cybraxisRemediationScore",
    "cybraxisRemediationReason",
    "cybraxisRemediationHintShown"
  ].forEach((key) => {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {}
  });
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "" || value === "undefined") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

export default function RemediationTraining({
  focusArea = "Sequence Quality",
  scenarioName = "Current scenario",
  previousScore = "",
}) {
  const [activeSectionId, setActiveSectionId] = useState("goal");
  const [reviewed, setReviewed] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const cleanScore = normalizeScore(previousScore);
  const reviewedCount = reviewed.length;
  const activeSection = REVIEW_SECTIONS.find((section) => section.id === activeSectionId) || null;
  const modulePassed = reviewedCount === REVIEW_SECTIONS.length && selectedAnswer === "correct";

  const normalizedFocus = useMemo(() => {
    if (/coverage/i.test(focusArea)) return "Investigation Coverage";
    if (/response/i.test(focusArea)) return "Response Quality";
    if (/timing|timeout/i.test(focusArea)) return "Timing Efficiency";
    return "Sequence Quality";
  }, [focusArea]);

  const toggleSection = (id) => {
    setActiveSectionId((current) => (current === id ? null : id));
  };

  const markReviewed = (id) => {
    if (!id) return;
    setReviewed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const startReplay = () => {
    const readStoredText = (key) => {
      try {
        return (
          window.sessionStorage.getItem(key) ||
          window.localStorage.getItem(key) ||
          ""
        );
      } catch {
        return "";
      }
    };

    const selectorInput = {
      focus: normalizedFocus,
      weakness: readStoredText("cybraxisRemediationWeakness"),
      reason: readStoredText("cybraxisRemediationReason"),
      scenario: readStoredText("cybraxisRemediationScenario"),
      sourceFocus: readStoredText("cybraxisRemedySourceFocus"),
      hint: readStoredText("cybraxisRemediationHintShown"),
    };

    const remedyScenarioId = resolveRemedyScenarioId(selectorInput);
    const remedyScenarioLabel = getRemedyScenarioLabel(remedyScenarioId);

    try {
      window.sessionStorage.setItem("cybraxisActiveScenarioId", remedyScenarioId);
      window.sessionStorage.setItem("cybraxisPlayableRemedyMode", "true");
      window.sessionStorage.setItem("cybraxisRemedySourceFocus", normalizedFocus);
      window.sessionStorage.setItem("cybraxisSelectedRemedyScenarioId", remedyScenarioId);
      window.sessionStorage.setItem("cybraxisSelectedRemedyScenarioLabel", remedyScenarioLabel);
      window.sessionStorage.setItem("cybraxisRemedySelectorTrace", JSON.stringify(selectorInput));

      window.localStorage.setItem("cybraxisActiveScenarioId", remedyScenarioId);
      window.localStorage.setItem("cybraxisPlayableRemedyMode", "true");
      window.localStorage.setItem("cybraxisRemedySourceFocus", normalizedFocus);
      window.localStorage.setItem("cybraxisSelectedRemedyScenarioId", remedyScenarioId);
      window.localStorage.setItem("cybraxisSelectedRemedyScenarioLabel", remedyScenarioLabel);

      window.sessionStorage.removeItem("cybraxisRemediationMode");
      window.localStorage.removeItem("cybraxisRemediationMode");
    } catch {}

    window.location.reload();
  };

  const exitRemediation = () => {
    clearRemediationStorage();
    window.location.reload();
  };

  return (
    <main className="rt">
      <section className="rt__shell">
        <header className="rt__hero">
          <div>
            <div className="rt__eyebrow">CYBRAXIS TRAINING REMEDIATION</div>
            <h1>Evidence-First Response Drill</h1>
            <p>Review the weak area, pass the quick check, then continue to a targeted playable remedy scenario.</p>
          </div>

          <div className="rt__score-card">
            <span>{cleanScore || "LOW"}</span>
            <small>{cleanScore ? "/100 previous score" : "below threshold"}</small>
          </div>
        </header>

        <section className="rt__summary">
          <div>
            <span>Original Scenario</span>
            <strong>{scenarioName}</strong>
          </div>
          <div>
            <span>Remediation Focus</span>
            <strong>{normalizedFocus}</strong>
          </div>
          <div>
            <span>Reviewed</span>
            <strong>{reviewedCount}/{REVIEW_SECTIONS.length}</strong>
          </div>
        </section>

        <section className="rt__work">
          <div className="rt__section-list">
            {REVIEW_SECTIONS.map((section, index) => {
              const isActive = activeSectionId === section.id;
              const isReviewed = reviewed.includes(section.id);

              return (
                <article
                  key={section.id}
                  className={
                    "rt__section-card" +
                    (isActive ? " rt__section-card--active" : "") +
                    (isReviewed ? " rt__section-card--done" : "")
                  }
                >
                  <button className="rt__section-head" onClick={() => toggleSection(section.id)}>
                    <span className="rt__section-num">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rt__section-title">
                      <strong>{section.title}</strong>
                      <small>{section.subtitle}</small>
                    </span>
                    <span className="rt__show">{isActive ? "HIDE" : "SHOW"}</span>
                  </button>
                </article>
              );
            })}
          </div>

          <aside className="rt__detail">
            {activeSection ? (
              <>
                <div className="rt__detail-top">
                  <div>
                    <span className="rt__detail-label">Selected Review</span>
                    <h2>{activeSection.title}</h2>
                  </div>
                  <button
                    className="rt__review-btn"
                    onClick={() => markReviewed(activeSection.id)}
                  >
                    {reviewed.includes(activeSection.id) ? "Reviewed" : "Mark Reviewed"}
                  </button>
                </div>

                <p>{activeSection.body}</p>

                <div className="rt__expected">
                  <span>Expected reasoning</span>
                  {activeSection.expected}
                </div>
              </>
            ) : (
              <div className="rt__empty-detail">
                Select Show on a review section to display its details here.
              </div>
            )}
          </aside>
        </section>

        <section className="rt__quiz">
          <div>
            <h2>Quick Check</h2>
            <p>What should happen before containment in the replay?</p>
          </div>

          <div className="rt__answers">
            <button
              className={selectedAnswer === "wrong" ? "rt__answer rt__answer--wrong" : "rt__answer"}
              disabled={Boolean(selectedAnswer)}
              onClick={() => !selectedAnswer && setSelectedAnswer("wrong")}
            >
              Block or isolate immediately because the alert is visible.
            </button>
            <button
              className={selectedAnswer === "correct" ? "rt__answer rt__answer--correct" : "rt__answer"}
              disabled={Boolean(selectedAnswer)}
              onClick={() => !selectedAnswer && setSelectedAnswer("correct")}
            >
              Validate evidence and node context, then choose the response.
            </button>
          </div>

          {selectedAnswer === "correct" && (
            <div className="rt__feedback rt__feedback--good">
              Correct. The replay should reinforce evidence-first reasoning.
            </div>
          )}

          {selectedAnswer === "wrong" && (
            <div className="rt__feedback rt__feedback--bad">
              <span>Not yet. Acting before reviewing evidence is what remediation is correcting.</span>
              <button className="rt__retry-btn" onClick={() => setSelectedAnswer(null)}>
                Retry Quick Check
              </button>
            </div>
          )}
        </section>

        <footer className="rt__footer">
          <div className="rt__footer-help">
            Exit leaves remediation. Start Playable Remedy Scenario loads a short weakness-targeted playable scenario.
          </div>
          <button className="rt__btn rt__btn--ghost" onClick={exitRemediation}>
            Exit Remediation
          </button>
          <button className="rt__btn" onClick={startReplay} disabled={!modulePassed}>
            Start Playable Remedy Scenario
          </button>
        </footer>
      </section>
    </main>
  );
}
