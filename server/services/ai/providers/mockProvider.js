function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateJson({ factPack, mode = "valid" }) {
  if (mode === "timeout") {
    await sleep(5000);
  }

  if (mode === "invalid_json") {
    return {
      rawText: "This is not JSON",
      parsed: null,
      usage: {
        inputTokens: 0,
        outputTokens: 0
      }
    };
  }

  if (mode === "schema_invalid") {
    return {
      rawText: JSON.stringify({
        hintText: "This is missing required fields."
      }),
      parsed: {
        hintText: "This is missing required fields."
      },
      usage: {
        inputTokens: 50,
        outputTokens: 20
      }
    };
  }

  if (mode === "spoiler") {
    const response = {
      hintText: "Click the exact correct node and use the block_ip action now.",
      trigger: factPack.trigger,
      supportLevel: factPack.supportLevel,
      confidence: 0.9,
      safetyFlags: {
        revealsExactAction: true,
        inventsFacts: false,
        claimsGameplayAuthority: false
      },
      groundedFactIds: factPack.allowedFactIds || []
    };

    return {
      rawText: JSON.stringify(response),
      parsed: response,
      usage: {
        inputTokens: 80,
        outputTokens: 40
      }
    };
  }

  const response = {
    hintText: buildSafeHint(factPack),
    trigger: factPack.trigger,
    supportLevel: factPack.supportLevel,
    confidence: 0.82,
    safetyFlags: {
      revealsExactAction: false,
      inventsFacts: false,
      claimsGameplayAuthority: false
    },
    groundedFactIds: (factPack.allowedFactIds || []).slice(0, 2)
  };

  return {
    rawText: JSON.stringify(response),
    parsed: response,
    usage: {
      inputTokens: 80,
      outputTokens: 35
    }
  };
}

function buildSafeHint(factPack) {
  switch (factPack.trigger) {
    case "premature_response":
      return "Before responding, check whether your evidence confirms both the suspicious activity and the affected scope.";

    case "wrong_target":
      return "Your current target may not match the strongest evidence trail. Re-check how the evidence connects to the selected asset.";

    case "insufficient_evidence":
      return "You may need more supporting evidence before choosing a response action.";

    case "time_pressure":
      return "Slow down and focus on one evidence path at a time before making a response decision.";

    case "repeated_mistake":
      return "Pause before trying another response. Confirm the affected asset and supporting evidence first.";

    case "general_guidance":
    default:
      return "Review the evidence you already have, then identify what is still missing before acting.";
  }
}

module.exports = {
  generateJson
};