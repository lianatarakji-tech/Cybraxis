function runMentorHintSafetyGuards({ hint, factPack }) {
  const failures = [];

  if (!hint || !factPack) {
    failures.push("missing_hint_or_fact_pack");
    return {
      safe: false,
      failures
    };
  }

  if (
    hint.safetyFlags?.revealsExactAction === true &&
    factPack.allowExactGuidance !== true
  ) {
    failures.push("reveals_exact_action_without_permission");
  }

  if (hint.safetyFlags?.inventsFacts === true) {
    failures.push("model_self_reported_invented_facts");
  }

  if (hint.safetyFlags?.claimsGameplayAuthority === true) {
    failures.push("claims_gameplay_authority");
  }

  const allowedFactIds = new Set(factPack.allowedFactIds || []);

  for (const factId of hint.groundedFactIds || []) {
    if (!allowedFactIds.has(factId)) {
      failures.push(`unknown_grounded_fact_id:${factId}`);
    }
  }

  if (containsHtml(hint.hintText)) {
    failures.push("contains_html");
  }

  if (containsAuthorityLanguage(hint.hintText)) {
    failures.push("contains_gameplay_authority_language");
  }

  if (
    factPack.allowExactGuidance !== true &&
    containsExactActionLeak(hint.hintText, factPack)
  ) {
    failures.push("possible_exact_action_leak");
  }

  return {
    safe: failures.length === 0,
    failures
  };
}

function containsHtml(text = "") {
  return /<[^>]*>/g.test(text);
}

function containsAuthorityLanguage(text = "") {
  const lowered = text.toLowerCase();

  const blockedPhrases = [
    "you passed",
    "you failed",
    "your score is",
    "i changed your score",
    "you are now unlocked",
    "you can advance",
    "you cannot advance",
    "scenario completed",
    "stage completed"
  ];

  return blockedPhrases.some((phrase) => lowered.includes(phrase));
}

function containsExactActionLeak(text = "", factPack = {}) {
  const lowered = text.toLowerCase();

  const attemptedAction = String(factPack.attemptedAction || "").toLowerCase();
  const selectedNode = String(factPack.selectedNode || "").toLowerCase();

  const directCommandPhrases = [
    "click",
    "press",
    "select",
    "choose",
    "use the",
    "the correct answer is",
    "the answer is"
  ];

  const hasDirectCommand = directCommandPhrases.some((phrase) =>
    lowered.includes(phrase)
  );

  const namesAttemptedAction =
    attemptedAction && lowered.includes(attemptedAction.replace(/_/g, " "));

  const namesSelectedNode =
    selectedNode && lowered.includes(selectedNode.replace(/-/g, " "));

  return hasDirectCommand && (namesAttemptedAction || namesSelectedNode);
}

module.exports = {
  runMentorHintSafetyGuards
};