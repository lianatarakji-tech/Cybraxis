const fallbackHints = {
  premature_response:
    "You may be acting before you have enough confirmed evidence. Re-check the strongest indicators and confirm the affected scope first.",

  wrong_target:
    "Your current target may not match the strongest evidence trail. Revisit the evidence and compare it with the asset you selected.",

  insufficient_evidence:
    "You are close, but the investigation needs more supporting evidence before a response action is safe.",

  time_pressure:
    "Focus on one evidence path at a time. Confirm what happened, where it happened, and whether the selected response matches the evidence.",

  repeated_mistake:
    "Pause before choosing another response. First confirm the affected asset, the supporting evidence, and the safest containment point.",

  general_guidance:
    "Start by checking the evidence you already have, then look for what is still missing before choosing a response."
};

function getFallbackHint(trigger = "general_guidance") {
  return fallbackHints[trigger] || fallbackHints.general_guidance;
}

function buildFallbackResponse({ factPack, reason }) {
  return {
    source: "fallback",
    fallbackUsed: true,
    fallbackReason: reason,
    hint: {
      hintText: getFallbackHint(factPack?.trigger),
      trigger: factPack?.trigger || "general_guidance",
      supportLevel: factPack?.supportLevel || "light",
      confidence: 1,
      safetyFlags: {
        revealsExactAction: false,
        inventsFacts: false,
        claimsGameplayAuthority: false
      },
      groundedFactIds: []
    }
  };
}

module.exports = {
  getFallbackHint,
  buildFallbackResponse
};