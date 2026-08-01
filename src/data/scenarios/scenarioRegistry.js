import scenario1Bundle from "./scenario1Bundle";
import scenario2SilentBeaconBundle from "./scenario2SilentBeaconBundle";
import scenario1VariantBBundle from "./scenario1VariantBBundle";

export const DEFAULT_SCENARIO_ID = scenario1Bundle.id;

export const SCENARIO_BUNDLES = {
  scenario2_silent_beacon: scenario2SilentBeaconBundle,
  scenario2: scenario2SilentBeaconBundle,
  scenario_2: scenario2SilentBeaconBundle,
  silent_beacon: scenario2SilentBeaconBundle,
  silent_beacon_2: scenario2SilentBeaconBundle,
  
  // CYBRAXIS_SCENARIO_1B_ALIAS_KEYS
  external_recon_to_exfiltration_1b: scenario1VariantBBundle,
  scenario1_variant_b: scenario1VariantBBundle,
  scenario_1b: scenario1VariantBBundle,
  scenario1b: scenario1VariantBBundle,
[scenario1Bundle.id]: scenario1Bundle,
  [scenario1VariantBBundle.id]: scenario1VariantBBundle,
  [scenario2SilentBeaconBundle.id]: scenario2SilentBeaconBundle,
};

export function getScenarioBundle(scenarioId = DEFAULT_SCENARIO_ID) {
  return SCENARIO_BUNDLES[scenarioId] || scenario1Bundle;
}

export function getScenarioList() {
  return Object.values(SCENARIO_BUNDLES).map(bundle => ({
    id: bundle.id,
    gameplayName: bundle.gameplayName,
    descriptiveName: bundle.descriptiveName,
    difficulty: bundle.difficulty,
  }));
}
