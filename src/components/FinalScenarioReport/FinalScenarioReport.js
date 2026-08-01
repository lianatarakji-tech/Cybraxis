import React from "react";
import "./FinalScenarioReport.css";

function cybraxisLaunchSilentBeaconBriefing() {
  if (typeof window === "undefined") return;

  const nextScenarioId = "scenario2_silent_beacon";

  try {
    window.localStorage.setItem("cybraxisForceScenarioBriefing", nextScenarioId);
    window.localStorage.setItem("cybraxisScenarioBriefingMode", "1");
    window.localStorage.setItem("cybraxisScenarioBriefingScenarioId", nextScenarioId);

    [
      "cybraxisScenarioBriefingSeen:" + nextScenarioId,
      "cybraxisScenarioBriefingSkipped:" + nextScenarioId,
      "cybraxisBriefingSeen:" + nextScenarioId,
      "cybraxisBriefingSkipped:" + nextScenarioId,
    ].forEach(key => window.localStorage.removeItem(key));
  } catch {}

  window.location.assign(
    window.location.pathname +
      "?scenario=" +
      encodeURIComponent(nextScenarioId) +
      "&briefing=1&forceBriefing=1"
  );
}

function cybraxisStagePassedForDisplay(stage = {}) {
  if (stage?.timedOut) return false;

  if (stage?.passed === true) return true;

  const score = Number(
    stage?.score ??
    stage?.totalScore ??
    stage?.totalStageScore ??
    stage?.scoreSummary?.totalStageScore ??
    stage?.scoreSummary?.stageScore ??
    stage?.scoreSummary?.score ??
    0
  );

  return Number.isFinite(score) && score >= 65;
}




function formatLearningReviewValue(value) {
  const raw = String(value || "none");

  const labels = {
    premature_containment: "Premature containment",
    incomplete_evidence: "Incomplete evidence",
    wrong_node_focus: "Wrong node focus",
    weak_interpretation: "Weak interpretation",
    mentor_overreliance: "Mentor overreliance",
    none: "None",
    identity: "Identity",
    connectivity: "Connectivity",
    controls: "Controls",
    "activity/evidence": "Activity/evidence",
    interpretation: "Interpretation",
    light_hint: "Light guidance",
    medium_hint: "Medium guidance",
    strong_hint: "Strong guidance",
    remediation_recommendation: "Remediation recommendation",
    continue_current_stage: "Continue current stage",
  };

  if (labels[raw]) return labels[raw];

  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getScoreBand(score) {
  if (score >= 85) return "strong";
  if (score >= 60) return "moderate";
  return "needs-improvement";
}

function getScoreLabel(score) {
  if (score >= 85) return "Strong Performance";
  if (score >= 60) return "Moderate Performance";
  return "Needs Improvement";
}

function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return String(Math.round(Number(value)));
}



function formatStageState(stage) {
  if (stage?.timedOut) return "Timed Out";
  if (stage?.passed) return "Passed";
  return "Needs Review";
}

function getWeakestDimension(dimensions = {}) {
  const entries = Object.values(dimensions).filter(d =>
    Number.isFinite(Number(d?.score))
  );

  if (!entries.length) return null;

  return entries.reduce((weakest, current) =>
    Number(current.score) < Number(weakest.score) ? current : weakest
  );
}

function buildAnalystSummary(report) {
  const summary = report.summary || {};
  const dimensions = report.dimensions || {};
  const weakest = getWeakestDimension(dimensions);

  const completedStages = summary.completedStages ?? 0;
  const totalStages = summary.totalStages ?? report.stageBreakdown?.length ?? 0;
  const timedOutStages = summary.timedOutStages ?? 0;
  const wrongActionTotal = summary.wrongActionTotal ?? 0;
  const coveragePercent = summary.coveragePercent ?? 0;
  const sequencePercent = summary.sequencePercent ?? 0;

  const points = [];

  points.push(`You completed ${completedStages}/${totalStages} stages.`);

  if (coveragePercent >= 80) {
    points.push("Investigation coverage was strong.");
  } else {
    points.push("Investigation coverage needs more consistency.");
  }

  if (sequencePercent < 60) {
    points.push("The main weakness was action sequence: investigation and interpretation should happen before containment.");
  } else if (sequencePercent < 85) {
    points.push("Some stage actions were completed out of the preferred SOC investigation order.");
  } else {
    points.push("Action sequence was mostly aligned with the expected workflow.");
  }

  if (timedOutStages > 0) {
    points.push(`${timedOutStages} stage${timedOutStages === 1 ? "" : "s"} timed out, reducing timing efficiency.`);
  }

  if (wrongActionTotal > 0) {
    points.push(`${wrongActionTotal} wrong action${wrongActionTotal === 1 ? "" : "s"} reduced response quality.`);
  }

  if (weakest?.label) {
    points.push(`Primary improvement area: ${weakest.label}.`);
  }

  return points.join(" ");
}

function DimensionCard({ dimension }) {
  if (!dimension) return null;

  const score = Number.isFinite(Number(dimension.score))
    ? Math.round(Number(dimension.score))
    : null;

  const scoreBand = score === null ? "unknown" : getScoreBand(score);

  return (
    <div className={`fsr__dimension fsr__dimension--${scoreBand}`}>
      <div className="fsr__dimension-top">
        <span>{dimension.label}</span>
        {score !== null && <strong>{score}%</strong>}
      </div>

      <div className="fsr__dimension-value">{dimension.value || "—"}</div>

      {dimension.detail && (
        <p className="fsr__dimension-detail">{dimension.detail}</p>
      )}
    </div>
  );
}


function cybraxisReadableStageName(value = "") {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const map = {
    recon: "Reconnaissance",
    reconnaissance: "Reconnaissance",
    access: "Initial Access",
    initial_access: "Initial Access",
    execution: "Execution",
    lateral: "Lateral Movement",
    lateral_movement: "Lateral Movement",
    exfil: "Exfiltration",
    exfiltration: "Exfiltration",
    detection: "Detection",
    signal: "Detection",
    signal_detection: "Detection",
    beaconing: "Beaconing",
    foothold: "Foothold",
    pattern_check: "Pattern Check",
    evidence_validation: "Evidence Validation",
    recon_activity: "Internal Reconnaissance",
    staging: "Data Staging",
    containment: "Containment",
    containment_decision: "Containment",
  };

  if (map[key]) return map[key];

  return raw
    .replace(/^stage[_\s-]*\d+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}

function cybraxisIsGenericStageLabel(value = "") {
  return /^stage\s*\d+$/i.test(String(value || "").trim());
}

function cybraxisStageDisplayTitle(stage = {}, index = 0) {
  const candidates = [
    stage.stageTitle,
    stage.title,
    stage.name,
    stage.label,
    stage.stageName,
    stage.stageId,
    stage.id,
  ];

  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (!text || cybraxisIsGenericStageLabel(text)) continue;

    const readable = cybraxisReadableStageName(text);
    if (readable) return readable;
  }

  return "Investigation Stage " + String(index + 1);
}

function cybraxisStageScoreForDisplay(stage = {}) {
  const score = Number(
    stage?.score ??
    stage?.totalStageScore ??
    stage?.stageScore ??
    stage?.scoreSummary?.totalStageScore ??
    stage?.scoreSummary?.stageScore ??
    0
  );

  return Number.isFinite(score) ? score : 0;
}

function cybraxisStageNarrativeForDisplay(stage = {}) {
  const raw = String(
    stage?.narrative ||
    stage?.recommendation ||
    stage?.feedback ||
    ""
  ).trim();

  if (!raw) return "";

  const score = cybraxisStageScoreForDisplay(stage);

  if (score >= 80 && /^needs review:/i.test(raw)) {
    return raw.replace(/^needs review:/i, "Improvement note:");
  }

  if (score >= 65 && /^needs review:/i.test(raw)) {
    return raw.replace(/^needs review:/i, "Review note:");
  }

  return raw;
}

function cybraxisCoverageChipText(stage = {}) {
  if (stage?.coverageComplete) return "Coverage Complete";
  return cybraxisStageScoreForDisplay(stage) >= 80
    ? "Coverage Improvement"
    : "Coverage Incomplete";
}

function cybraxisSequenceChipText(stage = {}) {
  if (stage?.sequenceComplete) return "Sequence Correct";
  return cybraxisStageScoreForDisplay(stage) >= 80
    ? "Sequence Improvement"
    : "Sequence Needs Review";
}


function StageRow({ stage, index }) {
  const score = stage?.score ?? stage?.totalStageScore ?? 0;
  const passed = cybraxisStagePassedForDisplay(stage);
  const timedOut = Boolean(stage?.timedOut);

  let state = "review";
  if (timedOut) state = "timeout";
  else if (passed) state = "passed";

  return (
    <div className={`fsr__stage fsr__stage--${state}`}>
      <div className="fsr__stage-top">
        <div className="fsr__stage-title">
          <span>Stage {index + 1}</span>
          <strong>{cybraxisStageDisplayTitle(stage, index)}</strong>
        </div>

        <div className="fsr__stage-score">
          {formatScore(score)}
          <small>/100</small>
        </div>
      </div>

      <div className="fsr__stage-meta">
        <span className={`fsr__chip fsr__chip--${state}`}>
          {formatStageState(stage)}
        </span>

        <span className={stage?.coverageComplete ? "fsr__chip fsr__chip--good" : "fsr__chip fsr__chip--warn"}>
          {cybraxisCoverageChipText(stage)}
        </span>

        <span className={stage?.sequenceComplete ? "fsr__chip fsr__chip--good" : "fsr__chip fsr__chip--warn"}>
          {cybraxisSequenceChipText(stage)}
        </span>

        <span className={(stage?.wrongActionCount || 0) > 0 ? "fsr__chip fsr__chip--bad" : "fsr__chip"}>
          Wrong Actions {stage?.wrongActionCount || 0}
        </span>
      </div>

      {cybraxisStageNarrativeForDisplay(stage) && (
        <p className="fsr__stage-note">{cybraxisStageNarrativeForDisplay(stage)}</p>
      )}
    </div>
  );
}

function TextList({ title, items, type }) {
  const safeItems = Array.isArray(items) && items.length > 0
    ? items
    : ["No items recorded."];

  return (
    <section className={`fsr__list fsr__list--${type}`}>
      <h3>{title}</h3>

      <ul>
        {safeItems.map((item, index) => (
          <li key={`${type}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}


function CollapsibleReportSection({
  title,
  description,
  children,
  defaultOpen = false,
}) {
  return (
    <details className="fsr__collapse" open={defaultOpen}>
      <summary className="fsr__collapse-summary">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <span className="fsr__collapse-toggle" aria-hidden="true" />
      </summary>

      <div className="fsr__collapse-body">
        {children}
      </div>
    </details>
  );
}



export default function FinalScenarioReport({
  report,
  onRestart,
  onNextScenario,
  onHome,
  nextScenarioLabel = "Continue Training",
  onStartRemediation,
  remediationThreshold = 65,
}) {
  if (!report) return null;

  const totalScore = report.totalScore ?? 0;
  const scoreBand = getScoreBand(totalScore);
  const remediationRequired = Number(totalScore) < remediationThreshold;
  const dimensions = report.dimensions || {};
  const summary = report.summary || {};
  const stageBreakdown = report.stageBreakdown || [];
  const weakestDimension = getWeakestDimension(dimensions);

  
  const aiLearningProfile = report.aiLearningProfile || null;
  
  const showDeveloperLearningReview =
    process.env.REACT_APP_CYBRAXIS_SHOW_LEARNING_REVIEW === "true";
const aiObservations = aiLearningProfile?.observations || [];
  const aiHistory = aiLearningProfile?.history || [];
return (
    <main className="fsr">
      <div className="fsr__backdrop" />

      <section className={`fsr__shell fsr__shell--${scoreBand}`}>
        <header className="fsr__hero">
          <div>
            <div className="fsr__eyebrow">Scenario Evaluation Complete</div>
            <h1>{report.scenario?.name || "Cybraxis Scenario Report"}</h1>
            <p>
              Final learner performance report based on stage outcomes,
              investigation coverage, response sequence, timing, and action quality.
            </p>
          </div>

          <div className="fsr__score-card">
            <span>{formatScore(totalScore)}</span>
            <small>/100</small>
            <strong>{getScoreLabel(totalScore)}</strong>
          </div>
        </header>

        <section className="fsr__summary-grid">
          <div className="fsr__summary-item">
            <span>Stages Passed</span>
            <strong>
              {stageBreakdown.filter(cybraxisStagePassedForDisplay).length}/{summary.totalStages ?? stageBreakdown.length}
            </strong>
          </div>

          <div className="fsr__summary-item">
            <span>Timeouts</span>
            <strong>{summary.timedOutStages ?? 0}</strong>
          </div>

          <div className="fsr__summary-item">
            <span>Wrong Actions</span>
            <strong>{summary.wrongActionTotal ?? 0}</strong>
          </div>

          <div className="fsr__summary-item">
            <span>Hints Requested</span>
            <strong>{summary.hintsRequestedTotal ?? 0}</strong>
          </div>
        </section>

        <section className="fsr__analyst-summary">
          <div>
            <span>Analyst Summary</span>
            <p>{buildAnalystSummary(report)}</p>
          </div>

          <div className="fsr__priority">
            <span>Primary Improvement Area</span>
            <strong>{weakestDimension?.label || "Not Available"}</strong>
            <small>{weakestDimension?.detail || "No weakest dimension detected."}</small>
          </div>
        </section>

        <CollapsibleReportSection
          title="Evaluation Dimensions"
          description="These dimensions explain why the final score was awarded."
        >
          <div className="fsr__dimensions-grid">
            <DimensionCard dimension={dimensions.timingEfficiency} />
            <DimensionCard dimension={dimensions.investigationCoverage} />
            <DimensionCard dimension={dimensions.sequenceQuality} />
            <DimensionCard dimension={dimensions.responseQuality} />
            <DimensionCard dimension={dimensions.guidanceDependency} />
            <DimensionCard dimension={dimensions.completion} />
          </div>
        </CollapsibleReportSection>

        <CollapsibleReportSection
          title="Stage-by-Stage Breakdown"
          description="Compact stage evaluation by outcome, coverage, sequence, and response quality."
        >
          <div className="fsr__stages">
            {stageBreakdown.length > 0 ? (
              stageBreakdown.map((stage, index) => (
                <StageRow
                  key={stage.stageId || `stage-${index}`}
                  stage={stage}
                  index={index}
                />
              ))
            ) : (
              <div className="fsr__empty">No stage breakdown available.</div>
            )}
          </div>
        </CollapsibleReportSection>

        <CollapsibleReportSection
          title="Feedback Summary"
          description="Rounded learning feedback for the full scenario attempt."
          defaultOpen
        >
          <div className="fsr__feedback">
            <TextList title="Strengths" items={report.strengths} type="strengths" />
            <TextList title="Weaknesses" items={report.weaknesses} type="weaknesses" />
            <TextList title="Recommendations" items={report.recommendations} type="recommendations" />

            {showDeveloperLearningReview && aiLearningProfile && aiLearningProfile.interventionCount > 0 && (
              <CollapsibleReportSection
                title="Learning Review"
                description="Learning observations from mentor interventions during the scenario."
                defaultOpen={false}
              >
                <div className="fsr__ai-profile">
                  <div className="fsr__ai-card">
                    <span>Recommended Focus</span>
                    <strong>{aiLearningProfile.primaryFocusLabel || "Activity/evidence"}</strong>
                  </div>

                  <div className="fsr__ai-card">
                    <span>Observed Pattern</span>
                    <strong>{aiLearningProfile.primaryMisconceptionLabel || "None"}</strong>
                  </div>

                  <div className="fsr__ai-card">
                    <span>Mentor Interventions</span>
                    <strong>{aiLearningProfile.liveInterventionCount || 0}</strong>
                  </div>

                  <div className="fsr__ai-card">
                    <span>Progression Signal</span>
                    <strong>{aiLearningProfile.progressionRecommendation || "continue_current_scenario"}</strong>
                  </div>
                </div>

                <div className="fsr__ai-observations">
                  <h3>Learning observations</h3>
                  <ul>
                    {aiObservations.map((item, index) => (
                      <li key={`ai-observation-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                {aiHistory.length > 0 && (
                  <div className="fsr__ai-history">
                    <h3>Recent mentor interventions</h3>
                    {aiHistory.map((item, index) => (
                      <div className="fsr__ai-history-item" key={item.id || `ai-history-${index}`}>
                        <strong>{item.stageName || item.stageId || "Scenario"}</strong>
                        <span>
                          Pattern: {formatLearningReviewValue(item.misconceptionDetected || "none")} · Focus: {formatLearningReviewValue(item.nextFocus || "activity/evidence")} · Support: {formatLearningReviewValue(item.interventionType || "adaptive")}
                        </span>
                        {item.learnerFacingMessage && <p>{item.learnerFacingMessage}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleReportSection>
            )}
          </div>
        </CollapsibleReportSection>

        <section className="fsr__final">
          <h2>Final Feedback</h2>
          <p>{report.finalFeedback || "No final feedback available."}</p>
        </section>

        <footer className="fsr__footer">
          {report.createdAt && (
            <span>
              Generated: {new Date(report.createdAt).toLocaleString()}
            </span>
          )}

        <div className="fsr__footer-actions">
            <button
              className="fsr__home-btn"
              onClick={() => {
                if (onHome) {
                  onHome();
                  return;
                }

                if (typeof window !== "undefined") {
                  window.location.assign(window.location.pathname + "?menu=home");
                }
              }}
              type="button"
            >
              Return to Main Menu
            </button>

            {onStartRemediation && remediationRequired && (
              <button
                className="fsr__remediation-btn"
                onClick={() => onStartRemediation(report)}
                type="button"
              >
                Start Remediation
              </button>
            )}

            {onRestart && (
              <button onClick={onRestart} type="button">
                Restart Scenario
              </button>
            )}

            {!remediationRequired && (
              <button
                className="fsr__next-btn"
                onClick={() => {
                  if (onNextScenario) {
                    onNextScenario();
                    return;
                  }

                  if (typeof window === "undefined") return;

                  const scenarioId = String(
                    report?.scenario?.id ||
                    report?.scenarioId ||
                    report?.scenario?.scenario_id ||
                    ""
                  ).toLowerCase();

                  if (
                    scenarioId.includes("scenario2") ||
                    scenarioId.includes("scenario_2") ||
                    scenarioId.includes("silent_beacon")
                  ) {
                    window.location.assign(window.location.pathname + "?menu=home");
                    return;
                  }

                  const nextScenarioId =
                    scenarioId.includes("scenario1_variant_b") ||
                    scenarioId.includes("external_recon_to_exfiltration_1b") ||
                    scenarioId.includes("scenario1b") ||
                    scenarioId.includes("scenario_1b")
                      ? "scenario2_silent_beacon"
                      : "external_recon_to_exfiltration_1b";

                  try {
                    window.localStorage.setItem("cybraxisForceScenarioBriefing", nextScenarioId);
                    window.localStorage.setItem("cybraxisScenarioBriefingMode", "1");
                    window.localStorage.setItem("cybraxisScenarioBriefingScenarioId", nextScenarioId);
                    window.localStorage.removeItem("cybraxisScenarioBriefingSeen:" + nextScenarioId);
                    window.localStorage.removeItem("cybraxisScenarioBriefingSkipped:" + nextScenarioId);
                  } catch {}

                  cybraxisLaunchSilentBeaconBriefing();
                }}
                type="button"
              >
                {nextScenarioLabel || "Continue Training"}
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}