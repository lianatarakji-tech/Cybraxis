import React from "react";
import "./StageResultOverlay.css";

function getPassLabel(summary, stageLockReason) {
  if (stageLockReason === "timeout" || summary?.timedOut) {
    return "Escalated";
  }

  if (summary?.passed) {
    return "Secured";
  }

  return "Incomplete";
}

function formatReasonCode(reasonCode) {
  return String(reasonCode || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

export default function StageResultOverlay({
  visible,
  stageScoreSummary,
  mentorGuidanceProfile,
  stageLockReason,
  pendingStageAdvance,
  onContinueStage,
}) {
  if (!visible || !stageScoreSummary) return null;

  const totalScore = stageScoreSummary.totalStageScore ?? 0;
  const coverageComplete = stageScoreSummary.evaluation?.coverageComplete;
  const sequenceComplete = stageScoreSummary.evaluation?.sequenceComplete;
  const timeRemaining = stageScoreSummary.evaluation?.timeRemaining ?? 0;
  const timeLimitSeconds = stageScoreSummary.evaluation?.timeLimitSeconds ?? 0;

  const expectedGuidance =
    mentorGuidanceProfile?.expectedGuidanceLevel || "moderate";

  const currentGuidance =
    mentorGuidanceProfile?.currentGuidanceLevel || "moderate";

  const reasonCodes = mentorGuidanceProfile?.reasonCodes || [];

  return (
    <div className="sro">
      <div className="sro__backdrop" />

      <section className={`sro__card sro__card--${stageLockReason || "completed"}`}>
        <div className="sro__top">
          <div>
            <div className="sro__eyebrow">Stage Result</div>
            <div className="sro__status">
              {getPassLabel(stageScoreSummary, stageLockReason)}
            </div>
          </div>

          <div className="sro__score">
            <span>{totalScore}</span>
            <small>/100</small>
          </div>
        </div>

        <div className="sro__grid">
          <div className="sro__item">
            <span>Coverage</span>
            <strong className={coverageComplete ? "is-good" : "is-bad"}>
              {coverageComplete ? "Complete" : "Incomplete"}
            </strong>
          </div>

          <div className="sro__item">
            <span>Sequence</span>
            <strong className={sequenceComplete ? "is-good" : "is-warn"}>
              {sequenceComplete ? "Correct" : "Needs Review"}
            </strong>
          </div>

          <div className="sro__item">
            <span>Time</span>
            <strong>
              {stageScoreSummary.timedOut
                ? "Expired"
                : `${timeRemaining}s / ${timeLimitSeconds}s`}
            </strong>
          </div>

          <div className="sro__item">
            <span>Guidance</span>
            <strong>
              {expectedGuidance} → {currentGuidance}
            </strong>
          </div>
        </div>

        {reasonCodes.length > 0 && (
          <div className="sro__reasons">
            {reasonCodes.slice(0, 5).map(reason => (
              <span key={reason}>{formatReasonCode(reason)}</span>
            ))}
          </div>
        )}

        <p className="sro__note">
          Review this stage outcome before continuing. Detailed performance feedback will be provided at the end of the full scenario.
        </p>

        {pendingStageAdvance && (
          <button className="sro__continue" onClick={onContinueStage}>
            {pendingStageAdvance.label || "Continue"}
          </button>
        )}
      </section>
    </div>
  );
}