import React from "react";
import "./CampaignProgressBar.css";

function formatTime(seconds) {
  const safe = Math.max(Number(seconds || 0), 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTimerLabel(timerState, lockReason) {
  if (timerState === "completed" || lockReason === "completed") {
    return "STAGE SECURED";
  }

  if (timerState === "expired" || lockReason === "timeout") {
    return "STAGE ESCALATED";
  }

  if (timerState === "warning") {
    return "RISK ESCALATING";
  }

  return "STAGE TIMER";
}

function getStageDisplayName(stage) {
  return (
    stage.short ||
    stage.navLabel ||
    stage.progressLabel ||
    stage.stage_type ||
    stage.type ||
    stage.name ||
    stage.id
  );
}

export default function CampaignProgressBar({
  
  onBrandHome,
currentStageIndex,
  completedStages,
  replayedStageIds,
  killChainStages = [],
  onPrev,
  unreadMentor,
  mentorPulsing,
  onMentorClick,
  stageTimeRemaining,
  stageTimerState,
  stageLocked,
  stageLockReason,
}) {
  const handleBrandHomeClick = () => {
    if (typeof onBrandHome === "function") {
      onBrandHome();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(window.location.origin + window.location.pathname + "?menu=home");
    }
  };

  const timerLabel = getTimerLabel(stageTimerState, stageLockReason);
  const stages = Array.isArray(killChainStages) ? killChainStages : [];

  const previousStage = stages[currentStageIndex - 1];

const hasPreviousStage =
  currentStageIndex > 0 &&
  Boolean(previousStage?.id);

const previousStageCompleted =
  hasPreviousStage &&
  completedStages?.has(previousStage.id);

const previousStageAlreadyRetried =
  hasPreviousStage &&
  replayedStageIds?.has(previousStage.id);

const canRetryPrevious =
  hasPreviousStage &&
  previousStageCompleted &&
  !previousStageAlreadyRetried;

function getRetryPreviousTitle() {
  if (!hasPreviousStage) {
    return "No previous stage available.";
  }

  if (!previousStageCompleted) {
    return "Timed-out or escalated stages cannot be retried inside the same run.";
  }

  if (previousStageAlreadyRetried) {
    return "This stage has already been retried once.";
  }

  return "Retry the previous completed stage once. The retry result will replace the original score.";
}

  return (
    <header className="cpb">
      <div
        className="cpb__brand cpb__brand-home"
        onClick={handleBrandHomeClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleBrandHomeClick();
          }
        }}
        role="link"
        tabIndex={0}
        aria-label="Return to main menu"
      >
        <svg className="cpb__scenario-logo-svg" viewBox="0 0 360 96" aria-hidden="true">
          <defs>
            <linearGradient id="scenarioLogoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="52%" stopColor="#54f7ff" />
              <stop offset="100%" stopColor="#b5fbff" />
            </linearGradient>
            <linearGradient id="scenarioLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd740" />
              <stop offset="100%" stopColor="#fff2a0" />
            </linearGradient>
            <linearGradient id="scenarioLogoViolet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#00e5ff" />
            </linearGradient>
            <filter id="scenarioLogoGlow" x="-30%" y="-40%" width="160%" height="180%">
              <feGaussianBlur stdDeviation="2.3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#scenarioLogoGlow)">
            <path d="M14 48 L42 16 H86 L128 48 L86 80 H42 Z"
              fill="rgba(0, 229, 255, 0.035)"
              stroke="rgba(0, 229, 255, 0.38)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M39 25 L70 48 L39 71"
              fill="none"
              stroke="url(#scenarioLogoGold)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M91 25 L60 48 L91 71"
              fill="none"
              stroke="url(#scenarioLogoCyan)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M56 22 L91 74"
              fill="none"
              stroke="url(#scenarioLogoViolet)"
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M92 22 L55 74"
              fill="none"
              stroke="url(#scenarioLogoGold)"
              strokeWidth="3.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M0 48 H27 M113 48 H145 M20 23 H43 M20 73 H43 M96 23 H128 M96 73 H128"
              fill="none"
              stroke="rgba(0, 229, 255, 0.38)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="39" cy="25" r="3.5" fill="#ffd740" />
            <circle cx="91" cy="71" r="3.5" fill="#ffd740" />
            <circle cx="128" cy="48" r="3.5" fill="#ffd740" />
            <text
              x="158"
              y="59"
              fontFamily="'Share Tech Mono', monospace"
              fontSize="28"
              letterSpacing="8"
              fill="url(#scenarioLogoCyan)"
            >
              CYBRAXIS
            </text>
          </g>
        </svg>
      </div>

      <div className="cpb__chain-wrap cpb__chain-wrap--no-next">
        <button
          className="cpb__nav-btn"
          onClick={onPrev}
          disabled={!canRetryPrevious}
          title={getRetryPreviousTitle()}
        >
          ‹ RETRY PREV
        </button>

        <div className="cpb__chain">
          {stages.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = completedStages?.has(stage.id);
            const isFuture = index > currentStageIndex;
            const wasReplayed = replayedStageIds?.has(stage.id);

            return (
              <div
                key={stage.id}
                className={[
                  "cpb__step",
                  isActive ? "cpb__step--active" : "",
                  isCompleted ? "cpb__step--complete" : "",
                  isFuture ? "cpb__step--locked" : "",
                  wasReplayed ? "cpb__step--replayed" : "",
                ].join(" ")}
                title={
                  isFuture
                    ? "Future stages unlock through scenario progression"
                    : stage.label || stage.name || stage.id
                }
              >
                <span className="cpb__step-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="cpb__step-name">
                  {getStageDisplayName(stage)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`cpb__timer cpb__timer--${stageTimerState || "normal"} ${
          stageLocked ? "is-locked" : ""
        }`}
      >
        <div className="cpb__timer-label">{timerLabel}</div>
        <div className="cpb__timer-value">{formatTime(stageTimeRemaining)}</div>
      </div>

      <button
        className={`cpb__mentor ${mentorPulsing ? "cpb__mentor--pulse" : ""}`}
        onClick={onMentorClick}
      >
        <span className="cpb__mentor-dot" />
        MENTOR
        {unreadMentor > 0 && (
          <span className="cpb__mentor-count">{unreadMentor}</span>
        )}
      </button>
    </header>
  );
}