export async function listScenarios() {
  return [
    {
      id: "external_recon_to_exfiltration_1",
      name: "Perimeter Breach",
      difficulty: "foundational",
      status: "available",
    },
  ];
}

export async function getScenarioById(scenarioId, scenarioData) {
  if (!scenarioData) {
    throw new Error("scenarioData must be provided to the local mock scenario API.");
  }

  if (scenarioData.scenario_id !== scenarioId) {
    throw new Error(`Scenario not found: ${scenarioId}`);
  }

  return scenarioData;
}