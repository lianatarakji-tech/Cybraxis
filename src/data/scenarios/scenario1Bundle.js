import scenarioData from "../json_scenarios/scenario1.json";

import {
  SCENARIO,
  MENTOR_IDLE_HINTS,
  STAGE_ATTACK_EDGES,
  STAGE_NODE_CONTEXT,
  STAGE_SUSPICIOUS_NODES,
  KILL_CHAIN_STAGES,
} from "../mock/mockData";

const scenario1Bundle = {
  id: scenarioData.scenario_id,
  gameplayName: "Perimeter Breach",
  descriptiveName: scenarioData.name,
  difficulty: "Foundational",

  scenarioData,
  mapScenario: SCENARIO,

  mentorIdleHints: MENTOR_IDLE_HINTS,
  stageAttackEdges: STAGE_ATTACK_EDGES,
  stageNodeContext: STAGE_NODE_CONTEXT,
  stageSuspiciousNodes: STAGE_SUSPICIOUS_NODES,
  killChainStages: KILL_CHAIN_STAGES,
};

export default scenario1Bundle;