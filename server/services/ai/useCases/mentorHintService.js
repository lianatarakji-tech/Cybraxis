const { generateMentorHintJson } = require("../aiProviderService");
const { validateMentorHint } = require("../aiSchemaValidators");
const { runMentorHintSafetyGuards } = require("../aiSafetyGuards");
const { buildFallbackResponse } = require("../aiFallbackText");
const {
  logAiMentorSuccess,
  logAiMentorFallback
} = require("../aiMetricsLogger");

async function getMentorHint({
  factPack,
  mockMode,
  forceMockProvider = false
}) {
  const aiEnabled = process.env.AI_ENABLED === "true";

  if (!aiEnabled) {
    logAiMentorFallback({
      reason: "ai_disabled",
      factPack
    });

    return buildFallbackResponse({
      factPack,
      reason: "ai_disabled"
    });
  }

  try {
    const providerResult = await withTimeout(
      generateMentorHintJson({
        factPack,
        mockMode,
        forceMockProvider
      }),
      Number(process.env.AI_TIMEOUT_HINT_MS || 3000)
    );

    let parsed = providerResult.parsed;

    if (!parsed && providerResult.rawText) {
      try {
        parsed = JSON.parse(providerResult.rawText);
      } catch (error) {
        logAiMentorFallback({
          reason: "invalid_json",
          factPack
        });

        return buildFallbackResponse({
          factPack,
          reason: "invalid_json"
        });
      }
    }

    const schemaResult = validateMentorHint(parsed);

    if (!schemaResult.valid) {
      logAiMentorFallback({
        reason: "schema_invalid",
        factPack
      });

      return buildFallbackResponse({
        factPack,
        reason: "schema_invalid"
      });
    }

    const safetyResult = runMentorHintSafetyGuards({
      hint: parsed,
      factPack
    });

    if (!safetyResult.safe) {
      const reason = `safety_failed:${safetyResult.failures.join(",")}`;

      logAiMentorFallback({
        reason,
        factPack
      });

      return buildFallbackResponse({
        factPack,
        reason
      });
    }

    logAiMentorSuccess({
      factPack,
      providerResult
    });

    return {
      source: "ai",
      provider: forceMockProvider
        ? "mock"
        : process.env.AI_PROVIDER || "mock",
      fallbackUsed: false,
      hint: parsed,
      metrics: {
        inputTokens: providerResult.usage?.inputTokens || 0,
        outputTokens: providerResult.usage?.outputTokens || 0
      }
    };
  } catch (error) {
    const reason = `provider_error_or_timeout:${error.message}`;

    logAiMentorFallback({
      reason,
      factPack
    });

    return buildFallbackResponse({
      factPack,
      reason
    });
  }
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs)
    )
  ]);
}

module.exports = {
  getMentorHint
};
