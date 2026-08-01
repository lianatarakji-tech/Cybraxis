function logAiMentorSuccess({ factPack, providerResult }) {
  console.log("[AI mentor success]", {
    provider: process.env.AI_PROVIDER || "mock",
    trigger: factPack?.trigger,
    supportLevel: factPack?.supportLevel,
    scenarioId: factPack?.scenarioId,
    stageId: factPack?.stageId,
    inputTokens: providerResult?.usage?.inputTokens || 0,
    outputTokens: providerResult?.usage?.outputTokens || 0,
    fallbackUsed: false
  });
}

function logAiMentorFallback({ reason, factPack }) {
  console.log("[AI mentor fallback]", {
    provider: process.env.AI_PROVIDER || "mock",
    reason,
    trigger: factPack?.trigger,
    supportLevel: factPack?.supportLevel,
    scenarioId: factPack?.scenarioId,
    stageId: factPack?.stageId,
    fallbackUsed: true
  });
}

module.exports = {
  logAiMentorSuccess,
  logAiMentorFallback
};
