import React, { useMemo, useState } from "react";
import remedyPrematureContainment from "../../data/json_scenarios/remedy_premature_containment_01.json";
import remedyEvidenceCompletion from "../../data/json_scenarios/remedy_evidence_completion_01.json";
import {
  SCENARIO_BUNDLES,
  DEFAULT_SCENARIO_ID,
} from "../../data/scenarios/scenarioRegistry";
import "./PlayableRemedyScenario.css";

const REMEDY_SCENARIOS = {
  remedy_premature_containment_01: remedyPrematureContainment,
  remedy_evidence_completion_01: remedyEvidenceCompletion,
};

const ACTIONS = [
  { id: "investigate IP", label: "Investigate IP" },
  { id: "investigate user", label: "Investigate User" },
  { id: "block IP", label: "Block IP" },
  { id: "isolate machine", label: "Isolate Machine" },
  { id: "ignore", label: "Ignore" },
];

const STEP_ORDER = ["logs", "map", "response", "complete"];

const STEP_LABELS = {
  logs: "Read alert/logs",
  map: "Investigate map",
  response: "Choose response",
  complete: "Finish stage",
};

const DIMENSION_LABELS = {
  identity: "Identity",
  connectivity: "Connectivity",
  controls: "Controls",
  activity: "Activity",
  interpretation: "Interpretation",
};

function getScenarioBundleSearchText(id, bundle) {
  const scenarioData = bundle?.scenarioData || {};
  const mapScenario = bundle?.mapScenario || {};

  return [
    id,
    scenarioData?.scenario_id,
    scenarioData?.id,
    scenarioData?.name,
    scenarioData?.gameplay_name,
    scenarioData?.title,
    mapScenario?.name,
    mapScenario?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolvePostRemedyScenarioId() {
  const preferredScenarioIds = [
    "external_recon_to_exfiltration_1b",
    "scenario1_variant_b",
    "scenario_1b",
    "scenario1b",
  ];

  const found = preferredScenarioIds.find((id) => SCENARIO_BUNDLES?.[id]);

  return found || DEFAULT_SCENARIO_ID;
}

function clearRemedyRuntime() {
  [
    "cybraxisPlayableRemedyMode",
    "cybraxisActiveScenarioId",
    "cybraxisRemedySourceFocus",
    "cybraxisRemediationMode",
    "cybraxisRemediationWeakness",
    "cybraxisRemediationScenario",
    "cybraxisRemediationScore",
    "cybraxisRemediationReason",
    "cybraxisRemediationHintShown",
  ].forEach((key) => {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {}
  });
}

function getRequiredEvidenceKeys(stage) {
  const required = stage?.required_investigation || {};
  const targets = required.target_ids || stage?.primary_targets || [];
  const dimensions = required.dimensions || [];

  return targets.flatMap((target) =>
    dimensions.map((dimension) => `${target}::${dimension}`)
  );
}

function getTargetDimensions(stage, targetId) {
  const required = stage?.required_investigation || {};
  const targets = required.target_ids || stage?.primary_targets || [];
  const dimensions = required.dimensions || [];

  if (!targetId || !targets.includes(targetId)) return [];
  return dimensions;
}

function evidenceKey(targetId, dimension) {
  return `${targetId}::${dimension}`;
}

function keyLabel(key) {
  const [target, dimension] = key.split("::");
  return `${target} / ${DIMENSION_LABELS[dimension] || dimension}`;
}

function isResponseAction(actionId) {
  return actionId === "block IP" || actionId === "isolate machine";
}

function buildMapNodes(stage, scenarioId) {
  const requiredTargets = stage?.required_investigation?.target_ids || stage?.primary_targets || [];
  const suspiciousNodes = stage?.suspicious_nodes || [];
  const activeTargets = new Set([...requiredTargets, ...suspiciousNodes]);

  const usesDns = activeTargets.has("dnsServer");
  const usesProxy = activeTargets.has("webProxy");
  const evidenceTarget = usesDns ? "dnsServer" : usesProxy ? "webProxy" : null;

  const pc = scenarioId === "remedy_premature_containment_01";

  return [
    {
      visualId: "external",
      targetId: "external",
      label: pc ? "EXT-SRC-23" : "EXT-SRC-41",
      type: "External",
      role: "Suspicious source or destination.",
      active: activeTargets.has("external"),
    },
    {
      visualId: "router",
      targetId: "router",
      label: pc ? "EDGE-RTR" : "GATEWAY",
      type: "Control Point",
      role: "Firewall/router point where perimeter evidence is validated.",
      active: activeTargets.has("router"),
    },
    {
      visualId: "workstation4",
      targetId: "workstation4",
      label: pc ? "WS-14" : "WS-22",
      type: "Internal Host",
      role: "Possible affected workstation. Isolation must be justified by evidence.",
      active: activeTargets.has("workstation4"),
    },
    {
      visualId: "evidenceService",
      targetId: evidenceTarget,
      label: usesProxy ? "WEB-PROXY" : usesDns ? "DNS-SRV" : "EVIDENCE",
      type: usesProxy ? "Proxy Evidence" : usesDns ? "DNS Evidence" : "Evidence Point",
      role: usesProxy
        ? "Proxy logs help confirm the outbound path and response match."
        : usesDns
        ? "DNS logs help confirm resolution and affected asset evidence."
        : "No separate service evidence is required in this stage.",
      active: Boolean(evidenceTarget && activeTargets.has(evidenceTarget)),
    },
  ];
}

function getStageInstruction(step, evidenceComplete, actionsComplete, orderCorrect) {
  if (step === "logs") {
    return "Read the alert and logs first. They explain what evidence should be investigated on the map.";
  }

  if (step === "map") {
    return evidenceComplete
      ? "Required map investigation is complete. Continue to the response step."
      : "Use the map. Select required nodes and complete their evidence checks before responding.";
  }

  if (step === "response") {
    if (!evidenceComplete) return "Go back to the map and complete evidence checks before choosing a response.";
    if (actionsComplete && orderCorrect) return "Response actions are complete. Continue to stage completion.";
    return "Choose the expected response actions in the correct order.";
  }

  if (step === "complete") {
    if (evidenceComplete && actionsComplete && orderCorrect) {
      return "All requirements are complete. You can finish this stage.";
    }

    return "The stage is not ready yet. Complete map investigation and response requirements first.";
  }

  return "";
}

export default function PlayableRemedyScenario({ scenarioId = "remedy_premature_containment_01" }) {
  const scenario = REMEDY_SCENARIOS[scenarioId] || remedyPrematureContainment;
  const stages = scenario?.stages || [];

  const [stageIndex, setStageIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState("logs");
  const [selectedNodeId, setSelectedNodeId] = useState("router");
  const [completedStageIds, setCompletedStageIds] = useState([]);
  const [evidenceChecks, setEvidenceChecks] = useState({});
  const [actionsByStage, setActionsByStage] = useState({});
  const [score, setScore] = useState(0);
  const [penaltyScore, setPenaltyScore] = useState(0);
  const [feedback, setFeedback] = useState("Read the alert and logs. Then investigate the required nodes on the map.");
  const [finished, setFinished] = useState(false);

  const stage = stages[stageIndex] || stages[0];
  const mapNodes = useMemo(() => buildMapNodes(stage, scenarioId), [stage, scenarioId]);
  const selectedNode = mapNodes.find((node) => node.visualId === selectedNodeId) || mapNodes[0];

  const requiredKeys = useMemo(() => getRequiredEvidenceKeys(stage), [stage]);
  const stageEvidence = evidenceChecks[stage?.id] || [];
  const stageActions = actionsByStage[stage?.id] || [];
  const expectedActions = stage?.expected_actions || [];
  const preferredOrder = stage?.preferred_action_order || expectedActions;
  const wrongActions = stage?.wrong_actions || [];

  const selectedNodeDimensions = getTargetDimensions(stage, selectedNode?.targetId);

  const evidenceComplete =
    requiredKeys.length > 0 && requiredKeys.every((key) => stageEvidence.includes(key));

  const actionsComplete = expectedActions.every((action) => stageActions.includes(action));

  const orderCorrect =
    preferredOrder.length === 0 ||
    preferredOrder.every((action, index) => stageActions[index] === action);

  const stagePassed = completedStageIds.includes(stage?.id);
  const canPassStage = evidenceComplete && actionsComplete && orderCorrect && !stagePassed;
  const totalMax = stages.reduce((sum, item) => sum + Number(item?.scoring?.max_score || 10), 0);
  const effectiveScore = Math.max(0, score - penaltyScore);
  const passPercent = totalMax > 0 ? Math.round((effectiveScore / totalMax) * 100) : 0;
  const finalPassed = completedStageIds.length === stages.length && passPercent >= 65;
  const instruction = getStageInstruction(currentStep, evidenceComplete, actionsComplete, orderCorrect);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progressPercent = stages.length > 0 ? Math.round((completedStageIds.length / stages.length) * 100) : 0;

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const next = STEP_ORDER[Math.min(currentStepIndex + 1, STEP_ORDER.length - 1)];
    setCurrentStep(next);
  };

  const selectMapNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    setFeedback("Node selected. Review its role and complete required evidence checks if available.");
  };

  const markEvidence = (targetId, dimension) => {
    if (!stage?.id || stagePassed || !targetId || !dimension) return;

    const key = evidenceKey(targetId, dimension);

    setEvidenceChecks((prev) => {
      const existing = prev[stage.id] || [];
      if (existing.includes(key)) return prev;
      return { ...prev, [stage.id]: [...existing, key] };
    });

    setFeedback(`Evidence checked: ${keyLabel(key)}.`);
  };

  const undoLastAction = () => {
    if (!stage?.id || stagePassed) return;

    setActionsByStage((prev) => {
      const existing = prev[stage.id] || [];
      if (existing.length === 0) return prev;

      return {
        ...prev,
        [stage.id]: existing.slice(0, -1),
      };
    });

    setFeedback("Last accepted action removed. Choose the correct next action.");
  };

  const applyAction = (actionId) => {
    if (!stage?.id || stagePassed) return;

    const existingActions = actionsByStage[stage.id] || [];

    if (existingActions.includes(actionId)) {
      setFeedback("That action is already selected. Use Undo if you want to change the accepted sequence.");
      return;
    }

    if (!evidenceComplete && isResponseAction(actionId)) {
      const penalty = Number(stage?.scoring?.wrong_action_penalty || 3);
      setPenaltyScore((prev) => prev + penalty);
      setFeedback("Premature response blocked. Complete the map evidence checks before containment.");
      return;
    }

    if (wrongActions.includes(actionId)) {
      const penalty = Number(stage?.scoring?.wrong_action_penalty || 3);
      setPenaltyScore((prev) => prev + penalty);
      setFeedback(`Wrong action for this stage: ${actionId}. It was not recorded. Choose the action that matches the evidence.`);
      return;
    }

    if (!expectedActions.includes(actionId)) {
      setFeedback(`This action is not needed for this stage: ${actionId}. It was not recorded.`);
      return;
    }

    const expectedNextAction = preferredOrder[existingActions.length];

    if (expectedNextAction && actionId !== expectedNextAction) {
      setPenaltyScore((prev) => prev + 1);
      setFeedback(`Wrong order. The next expected action is: ${expectedNextAction}. Your action was not recorded.`);
      return;
    }

    setActionsByStage((prev) => {
      const existing = prev[stage.id] || [];
      return { ...prev, [stage.id]: [...existing, actionId] };
    });

    const actionScore = Number(stage?.scoring?.correct_action_score || 5);
    setScore((prev) => Math.min(prev + actionScore, totalMax));
    setFeedback(`Action accepted: ${actionId}.`);
  };

  const completeStage = () => {
    if (!canPassStage) {
      setFeedback("Stage cannot be completed yet. Finish map evidence checks and response actions first.");
      return;
    }

    setCompletedStageIds((prev) => (prev.includes(stage.id) ? prev : [...prev, stage.id]));
    setFeedback(stage?.consequences?.correct?.mentor_feedback || "Stage passed.");

    if (stageIndex >= stages.length - 1) {
      setFinished(true);
    } else {
      setTimeout(() => {
        setStageIndex((prev) => prev + 1);
        setCurrentStep("logs");
        setSelectedNodeId("router");
        setFeedback("New stage loaded. Start with alert/log review, then investigate the map.");
      }, 400);
    }
  };

  const exitRemedy = () => {
    clearRemedyRuntime();

    try {
      window.sessionStorage.removeItem("cybraxisSelectedRemedyScenarioId");
      window.localStorage.removeItem("cybraxisSelectedRemedyScenarioId");
    } catch {}

    window.location.assign(window.location.pathname);
  };

  const continueAfterRemedy = () => {
    const nextScenarioId = resolvePostRemedyScenarioId();

    clearRemedyRuntime();

    try {
      window.sessionStorage.setItem("cybraxisRemedyPassed", "true");
      window.localStorage.setItem("cybraxisRemedyPassed", "true");

      window.sessionStorage.removeItem("cybraxisActiveScenarioId");
      window.localStorage.removeItem("cybraxisActiveScenarioId");

      window.sessionStorage.removeItem("cybraxisPlayableRemedyMode");
      window.localStorage.removeItem("cybraxisPlayableRemedyMode");

      window.sessionStorage.removeItem("cybraxisPostRemedyNeedsVariant");
      window.localStorage.removeItem("cybraxisPostRemedyNeedsVariant");
    } catch {}

    const nextUrl = `${window.location.pathname}?scenario=${encodeURIComponent(nextScenarioId)}&briefing=1`;
    window.location.assign(nextUrl);
  };

  const retryRemedyScenario = () => {
    setStageIndex(0);
    setCurrentStep("logs");
    setSelectedNodeId("router");
    setCompletedStageIds([]);
    setEvidenceChecks({});
    setActionsByStage({});
    setScore(0);
    setPenaltyScore(0);
    setFeedback("Remedy restarted. Read the alert and logs first.");
    setFinished(false);
  };

  if (!stage) {
    return (
      <main className="prs">
        <section className="prs__shell prs__finish">
          <h1>No remedy scenario loaded</h1>
          <button className="prs__btn" onClick={exitRemedy}>Return</button>
        </section>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="prs">
        <section className="prs__shell prs__finish">
          <div className="prs__eyebrow">PLAYABLE REMEDY COMPLETE</div>
          <h1>{scenario.gameplay_name || scenario.name}</h1>
          <div className={finalPassed ? "prs__final-score prs__final-score--pass" : "prs__final-score prs__final-score--fail"}>
            {passPercent}%
          </div>
          <p className="prs__score-note">
            Score includes deductions for wrong order, premature response, or unnecessary actions.
          </p>
          <p>
            {finalPassed
              ? "Remedy passed. Continue to the next scenario."
              : "Remedy not passed yet. Repeat the remedy practice before scenario advancement."}
          </p>

          <section className="prs__final-breakdown">
            <h2>Remedy Evaluation</h2>
            <div className="prs__final-grid">
              {stages.map((item, index) => {
                const passed = completedStageIds.includes(item.id);

                return (
                  <div key={item.id} className={passed ? "prs__final-item prs__final-item--pass" : "prs__final-item"}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.name}</strong>
                    <small>{passed ? "Passed" : "Not passed"}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="prs__footer prs__footer--center">
            <button className="prs__btn prs__btn--ghost" onClick={exitRemedy}>Exit</button>
            <button className="prs__btn" onClick={finalPassed ? continueAfterRemedy : retryRemedyScenario}>
              {finalPassed ? "Continue to Scenario" : "Retry Remedy Scenario"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="prs">
      <section className="prs__shell">
        <header className="prs__hero">
          <div>
            <div className="prs__eyebrow">PLAYABLE REMEDY SCENARIO</div>
            <h1>{scenario.gameplay_name || scenario.name}</h1>
            <p>
              You are here because the previous final report detected a weak skill.
              Use the map to complete evidence checks before choosing a response.
            </p>
          </div>

          <div className="prs__score">
            <strong>{effectiveScore}</strong>
            <span>score</span>
          </div>
        </header>

        <section className="prs__topline">
          <div>
            <span>Weakness being trained</span>
            <strong>{scenario.primary_weakness}</strong>
          </div>
          <div>
            <span>Current stage</span>
            <strong>{stageIndex + 1}/{stages.length} · {stage.name}</strong>
          </div>
          <div>
            <span>Passed stages</span>
            <strong>{progressPercent}%</strong>
          </div>
        </section>

        <section className="prs__main">
          <aside className="prs__sidebar">
            <div className="prs__side-title">Scenario stages</div>
            {stages.map((item, index) => (
              <button
                key={item.id}
                className={
                  "prs__stage-tab" +
                  (index === stageIndex ? " prs__stage-tab--active" : "") +
                  (completedStageIds.includes(item.id) ? " prs__stage-tab--done" : "")
                }
                onClick={() => {
                  setStageIndex(index);
                  setCurrentStep("logs");
                  setSelectedNodeId("router");
                  setFeedback("Stage selected. Start with alert/log review.");
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.name}</strong>
              </button>
            ))}

            <div className="prs__what-card">
              <span>What to do</span>
              <p>Read logs, investigate required map nodes, then choose the response.</p>
            </div>
          </aside>

          <section className="prs__workspace">
            <div className="prs__stepper">
              {STEP_ORDER.map((step, index) => (
                <button
                  key={step}
                  className={currentStep === step ? "prs__step prs__step--active" : "prs__step"}
                  onClick={() => goToStep(step)}
                >
                  <span>{index + 1}</span>
                  {STEP_LABELS[step]}
                </button>
              ))}
            </div>

            <section className="prs__instruction">
              <div>
                <span>Current task</span>
                <strong>{STEP_LABELS[currentStep]}</strong>
                <p>{instruction}</p>
                {stage?.learning_objective && (
                  <small className="prs__objective">
                    Stage objective: {stage.learning_objective}
                  </small>
                )}
              </div>
            </section>

            <section className="prs__panel">
              {currentStep === "logs" && (
                <>
                  <h2>Step 1 — Read the Alert and Logs</h2>
                  <p className="prs__panel-intro">
                    These entries explain what the learner should verify on the map. Do not respond yet.
                  </p>
                  <div className="prs__events">
                    {(stage.events || []).map((event) => (
                      <article key={event.id} className={event.type === "alert" ? "prs__event prs__event--alert" : "prs__event"}>
                        <div>
                          <strong>{event.type.toUpperCase()}</strong>
                          <span>{event.time || event.timestamp}</span>
                        </div>
                        <p>{event.message}</p>
                      </article>
                    ))}
                  </div>
                  <button className="prs__btn prs__panel-next" onClick={nextStep}>
                    I reviewed the alert/logs
                  </button>
                </>
              )}

              {currentStep === "map" && (
                <>
                  <h2>Step 2 — Investigate Using the Network Map</h2>
                  <p className="prs__panel-intro">
                    Select a node, inspect its role, then complete the required evidence checks for that node.
                  </p>

                  <section className="prs__map-workspace">
                    <div className="prs__network-map prs__network-map--stable" aria-label="Remedy network map">
                      {["workstation4", "router", "external", "evidenceService"].map((visualId) => {
                        const node = mapNodes.find((item) => item.visualId === visualId);
                        if (!node) return null;

                        const requiredDimensions = getTargetDimensions(stage, node.targetId);
                        const nodeDone =
                          requiredDimensions.length > 0 &&
                          requiredDimensions.every((dimension) =>
                            stageEvidence.includes(evidenceKey(node.targetId, dimension))
                          );

                        return (
                          <button
                            key={node.visualId}
                            className={
                              "prs__map-node" +
                              " prs__map-node--" + node.visualId +
                              (selectedNode?.visualId === node.visualId ? " prs__map-node--selected" : "") +
                              (node.active ? " prs__map-node--active" : "") +
                              (nodeDone ? " prs__map-node--done" : "")
                            }
                            onClick={() => selectMapNode(node.visualId)}
                          >
                            <span>{node.type}</span>
                            <strong>{node.label}</strong>
                            <small>{nodeDone ? "Evidence complete" : node.active ? "Needs review" : "Context only"}</small>
                          </button>
                        );
                      })}

                      <div className="prs__map-connector prs__map-connector--workstation-router" />

                      <div className="prs__map-connector prs__map-connector--router-external" />

                      <div className="prs__map-connector prs__map-connector--router-evidence" />
                    </div>

                    <aside className="prs__node-inspector">
                      <span>Selected node</span>
                      <h3>{selectedNode?.label}</h3>
                      <p>{selectedNode?.role}</p>

                      {selectedNodeDimensions.length > 0 ? (
                        <div className="prs__node-checks">
                          {selectedNodeDimensions.map((dimension) => {
                            const key = evidenceKey(selectedNode.targetId, dimension);
                            const checked = stageEvidence.includes(key);

                            return (
                              <button
                                key={key}
                                className={checked ? "prs__check prs__check--done" : "prs__check"}
                                onClick={() => markEvidence(selectedNode.targetId, dimension)}
                              >
                                <span>{checked ? "✓" : "+"}</span>
                                {DIMENSION_LABELS[dimension] || dimension}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="prs__no-checks">
                          This node gives context in this stage. No required evidence check is attached to it.
                        </div>
                      )}
                    </aside>
                  </section>

                  <button className="prs__btn prs__panel-next" disabled={!evidenceComplete} onClick={nextStep}>
                    Continue to response actions
                  </button>
                </>
              )}

              {currentStep === "response" && (
                <>
                  <h2>Step 3 — Choose Response Action</h2>
                  <p className="prs__panel-intro">
                    Now choose only the actions that match the evidence. Wrong or early containment reduces the score.
                  </p>
                  <div className="prs__expected-order">
                    <span>Expected order</span>
                    <strong>{preferredOrder.join(" → ")}</strong>
                  </div>
                  <div className="prs__actions">
                    {ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className={stageActions.includes(action.id) ? "prs__action prs__action--used" : "prs__action"}
                        onClick={() => applyAction(action.id)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="prs__selected-actions">
                    <span>Selected sequence</span>
                    <strong>{stageActions.length ? stageActions.join(" → ") : "No actions selected yet"}</strong>
                    <small>Only accepted actions appear here. Use undo only if you want to change the accepted sequence.</small>
                    <div className="prs__sequence-controls">
                      <button className="prs__mini-btn" onClick={undoLastAction} disabled={!stageActions.length}>
                        Undo Last Selected Action
                      </button>
                    </div>
                  </div>

                  <button className="prs__btn prs__panel-next" disabled={!actionsComplete || !orderCorrect} onClick={nextStep}>
                    Continue to stage completion
                  </button>
                </>
              )}

              {currentStep === "complete" && (
                <>
                  <h2>Step 4 — Complete Stage</h2>
                  <p className="prs__panel-intro">
                    Review the requirements. If all checks are green, complete the stage and move forward.
                  </p>
                  <div className="prs__status-grid">
                    <div className={evidenceComplete ? "prs__status prs__status--ok" : "prs__status"}>
                      <span>Map evidence</span>
                      <strong>{evidenceComplete ? "Complete" : "Incomplete"}</strong>
                    </div>
                    <div className={actionsComplete ? "prs__status prs__status--ok" : "prs__status"}>
                      <span>Actions</span>
                      <strong>{actionsComplete ? "Complete" : "Incomplete"}</strong>
                    </div>
                    <div className={orderCorrect ? "prs__status prs__status--ok" : "prs__status prs__status--bad"}>
                      <span>Order</span>
                      <strong>{orderCorrect ? "Correct" : "Incorrect"}</strong>
                    </div>
                  </div>
                  <button className="prs__btn prs__panel-next" disabled={!canPassStage} onClick={completeStage}>
                    Complete this stage
                  </button>
                </>
              )}
            </section>

            <section className="prs__feedback-box">
              <span>Guidance</span>
              <p>{feedback}</p>
            </section>
          </section>
        </section>

        <footer className="prs__footer">
          <button className="prs__btn prs__btn--ghost" onClick={exitRemedy}>
            Exit Remedy Scenario
          </button>
        </footer>
      </section>
    </main>
  );
}
