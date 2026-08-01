const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});
const http = require("http");
const https = require("https");

const PORT = Number(process.env.CYBRAXIS_AI_PORT || 8787);
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";

const ALLOWED = {
  adaptiveDecision: [
    "light_hint",
    "medium_hint",
    "strong_hint",
    "remediation_recommendation",
    "continue_current_stage",
  ],
  misconceptionDetected: [
    "premature_containment",
    "incomplete_evidence",
    "wrong_node_focus",
    "weak_interpretation",
    "mentor_overreliance",
    "none",
  ],
  supportLevel: ["none", "low", "medium", "high"],
  interventionType: [
    "light_hint",
    "medium_hint",
    "strong_hint",
    "remediation_recommendation",
    "continue_current_stage",
  ],
  nextFocus: [
    "identity",
    "connectivity",
    "controls",
    "activity/evidence",
    "interpretation",
  ],
  progressionRecommendation: [
    "continue_current_scenario",
    "unlock_equivalent_variant",
    "send_to_remedy_premature_containment",
    "send_to_remedy_evidence_completion",
  ],
};

function normalizeEnum(value, allowed, fallback, mappings = {}) {
  const raw = String(value || "").trim();
  if (allowed.includes(raw)) return raw;

  const lowered = raw.toLowerCase();

  if (mappings[lowered]) return mappings[lowered];

  return fallback;
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.6;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}


function hasBadEncoding(value = "") {
  const text = String(value || "");
  return text.includes(String.fromCharCode(226)) || text.includes(String.fromCharCode(65533));
}

function cleanLearnerFacingMessage(value = "") {
  const badChar = String.fromCharCode(226);
  const replacement = new RegExp(badChar + "[^ ]{0,8}", "g");

  return String(value || "")
    .replace(/^[\"]+|[\"]+$/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/```/g, "")
    .replace(/`/g, "")
    .replace(/\*Hint:/gi, "Hint:")
    .replace(/\*/g, "")
    .replace(/AI\s+adaptive\s+note\s+for\s+[^:]+:\s*/i, "")
    .replace(/AI\s+adaptive\s+note:\s*/i, "")
    .replace(replacement, "'")
    .replace(new RegExp(String.fromCharCode(65533), "g"), "")
    .replace(/properegress/gi, "proper egress")
    .replace(/requireblocking/gi, "require blocking")
    .replace(/therequired/gi, "the required")
    .replace(/beforeblocking/gi, "before blocking")
    .replace(/afterblocking/gi, "after blocking")
    .replace(/\s+/g, " ")
    .trim();
}

function getMissingCoverageDimensions(factPack = {}) {
  const explicit = factPack.learnerState && factPack.learnerState.missedEvidence;

  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit.map(String).filter(Boolean);
  }

  const coverage = factPack.investigationCoverage || {};
  const required = factPack.requiredCoverageDimensions || [
    "identity",
    "connectivity",
    "controls",
    "activity",
    "interpretation",
  ];

  return required.filter((dimension) => coverage && coverage[dimension] === false);
}

function normalizeAiFocus(value = "") {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("control")) return "controls";
  if (normalized.includes("connect")) return "connectivity";
  if (normalized.includes("identity") || normalized.includes("asset")) return "identity";
  if (normalized.includes("interpret")) return "interpretation";
  return "activity/evidence";
}

function buildControlledLearnerFacingMessage(decision = {}, factPack = {}) {
  const stageName = String(
    (factPack.currentStage && (factPack.currentStage.name || factPack.currentStage.title)) ||
    factPack.stageId ||
    "current stage"
  );

  const stageText = [
    stageName,
    factPack.stageId || "",
    (factPack.currentStage && factPack.currentStage.description) || "",
    (factPack.currentStage && factPack.currentStage.learningObjective) || "",
  ].join(" ").toLowerCase();

  const focus = normalizeAiFocus(decision.nextFocus);
  const missing = getMissingCoverageDimensions(factPack);
  const missingText = missing.length
    ? " Remaining gap: " + missing.slice(0, 2).join(" and ") + "."
    : "";

  let stageSentence = "";

  if (stageText.includes("exfil")) {
    if (focus === "controls") {
      stageSentence = "Confirm the controls before blocking: verify destination approval, then check the proxy upload path and archive name in the logs.";
    } else if (focus === "interpretation") {
      stageSentence = "Before containment, decide what the transfer evidence proves: approved activity, suspicious transfer, or confirmed exfiltration.";
    } else {
      stageSentence = "Trace the exfiltration path: confirm the external destination, proxy upload evidence, and archive name before choosing a response.";
    }
  } else if (stageText.includes("contain") || stageText.includes("c2")) {
    stageSentence = "Before containment, validate the C2 indicator, control point, affected host, and staged-data risk in one evidence trail.";
  } else if (stageText.includes("lateral")) {
    stageSentence = "Confirm the internal path: source, destination, trust relationship, and evidence showing lateral movement rather than normal traffic.";
  } else if (stageText.includes("execution")) {
    stageSentence = "Confirm execution evidence on the affected host before response: connect the alert with logs, timing, and suspicious activity.";
  } else if (stageText.includes("access") || stageText.includes("foothold")) {
    stageSentence = "Confirm the access path first: identify the affected service, source, and supporting evidence before escalating the response.";
  } else if (stageText.includes("recon")) {
    stageSentence = "Separate scanning from normal traffic: identify the source, exposed service, and repeated probing evidence before responding.";
  } else {
    stageSentence = "Connect the alert with the affected node, related logs, and required evidence before choosing a response.";
  }

  return cleanLearnerFacingMessage(stageSentence + missingText + " You are close; use that evidence for the next action.");
}

function chooseSafeLearnerFacingMessage(rawMessage = "", decision = {}, factPack = {}) {
  const rawText = String(rawMessage || "");
  const cleaned = cleanLearnerFacingMessage(rawText);

  const unsafe =
    !cleaned ||
    cleaned.length < 40 ||
    cleaned.length > 280 ||
    hasBadEncoding(rawText) ||
    /\*\*|__|```|\*Hint|\*/.test(rawText) ||
    /properegress|requireblocking|therequired|beforeblocking|afterblocking/i.test(rawText) ||
    /AI\s+adaptive\s+note/i.test(rawText);

  if (unsafe) {
    return buildControlledLearnerFacingMessage(decision, factPack);
  }

  return cleaned;
}

function validateDecision(rawDecision = {}, factPack = {}) {
  const scenarioStatus = factPack?.scenarioStatus || "in_progress";

  const interventionType = normalizeEnum(
    rawDecision.interventionType || rawDecision.adaptiveDecision,
    ALLOWED.interventionType,
    "medium_hint",
    {
      guidance: "medium_hint",
      guided_analysis: "medium_hint",
      hint: "medium_hint",
      redirect: "strong_hint",
      none: "continue_current_stage",
    }
  );

  let progressionRecommendation = normalizeEnum(
    rawDecision.progressionRecommendation,
    ALLOWED.progressionRecommendation,
    "continue_current_scenario"
  );

  if (scenarioStatus === "in_progress") {
    progressionRecommendation = "continue_current_scenario";
  }

  const nextFocus = normalizeEnum(
    rawDecision.nextFocus,
    ALLOWED.nextFocus,
    "activity/evidence",
    {
      evidence: "activity/evidence",
      evidence_collection: "activity/evidence",
      activity: "activity/evidence",
      logs: "activity/evidence",
      interpretation_analysis: "interpretation",
      node_identity: "identity",
    }
  );

  const supportLevel = normalizeEnum(
    rawDecision.supportLevel,
    ALLOWED.supportLevel,
    interventionType === "continue_current_stage" ? "none" : "medium",
    {
      moderate: "medium",
      med: "medium",
    }
  );

  return {
    adaptiveDecision: normalizeEnum(
      rawDecision.adaptiveDecision || interventionType,
      ALLOWED.adaptiveDecision,
      interventionType
    ),
    misconceptionDetected: normalizeEnum(
      rawDecision.misconceptionDetected,
      ALLOWED.misconceptionDetected,
      "none"
    ),
    supportLevel,
    interventionType,
    nextFocus,
    progressionRecommendation,
    confidence: clampConfidence(rawDecision.confidence),
    learnerFacingMessage: chooseSafeLearnerFacingMessage(
      rawDecision.learnerFacingMessage,
      {
        adaptiveDecision: rawDecision.adaptiveDecision || interventionType,
        misconceptionDetected: rawDecision.misconceptionDetected,
        supportLevel,
        interventionType,
        nextFocus,
        progressionRecommendation,
        confidence: rawDecision.confidence,
      },
      factPack
    ),
  };
}

function fallbackDecision(factPack = {}, providerStatus = "fallback", providerError = "") {
  const reasonCodes = factPack.reasonCodes || [];
  const wrongActions = factPack.learnerState?.wrongActions || [];
  const missedEvidence = factPack.learnerState?.missedEvidence || [];
  const stageName = factPack.currentStage?.name || factPack.stageId || "current stage";

  let decision = {
    adaptiveDecision: "light_hint",
    misconceptionDetected: "none",
    supportLevel: "low",
    interventionType: "light_hint",
    nextFocus: "activity/evidence",
    progressionRecommendation: "continue_current_scenario",
    confidence: 0.6,
    learnerFacingMessage:
      `AI adaptive note for ${stageName}: connect the alert, logs, node identity, controls, and activity evidence before choosing the next response.`,
  };

  if (
    reasonCodes.includes("premature_containment") ||
    reasonCodes.includes("coverage_incomplete_before_response") ||
    wrongActions.includes("isolate_host") ||
    wrongActions.includes("isolate")
  ) {
    decision = {
      ...decision,
      adaptiveDecision: "medium_hint",
      misconceptionDetected: "premature_containment",
      supportLevel: "medium",
      interventionType: "medium_hint",
      nextFocus: "activity/evidence",
      learnerFacingMessage:
        `AI adaptive note for ${stageName}: containment is being considered too early. Finish the evidence trail first, especially activity logs and connection patterns.`,
    };
  } else if (
    reasonCodes.includes("coverage_incomplete") ||
    reasonCodes.includes("partial_target_coverage") ||
    missedEvidence.length > 0
  ) {
    decision = {
      ...decision,
      adaptiveDecision: "medium_hint",
      misconceptionDetected: "incomplete_evidence",
      supportLevel: "medium",
      interventionType: "medium_hint",
      nextFocus: "activity/evidence",
      learnerFacingMessage:
        `AI adaptive note for ${stageName}: evidence coverage is incomplete. Check the missing logs, suspicious node context, and traffic direction before finalizing the response.`,
    };
  } else if (reasonCodes.includes("wrong_target")) {
    decision = {
      ...decision,
      adaptiveDecision: "medium_hint",
      misconceptionDetected: "wrong_node_focus",
      supportLevel: "medium",
      interventionType: "medium_hint",
      nextFocus: "identity",
      learnerFacingMessage:
        `AI adaptive note for ${stageName}: recheck whether the selected node matches the alert, identity, and connection evidence.`,
    };
  }

  return {
    ...validateDecision(decision, factPack),
    provider: "cybraxis-local-ai-server",
    providerStatus,
    providerError,
    validatedByBackend: true,
    generatedAt: new Date().toISOString(),
  };
}

function httpsPostJson(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);

    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
        timeout: 30000,
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          let parsed = null;

          try {
            parsed = data ? JSON.parse(data) : null;
          } catch (error) {
            reject(new Error(`Provider returned non-JSON response: ${data.slice(0, 200)}`));
            return;
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(
              new Error(
                `Provider HTTP ${res.statusCode}: ${JSON.stringify(parsed).slice(0, 400)}`
              )
            );
            return;
          }

          resolve(parsed);
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Provider request timed out."));
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();

  try {
    return JSON.parse(raw);
  } catch (_) {
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");

    if (first >= 0 && last > first) {
      return JSON.parse(raw.slice(first, last + 1));
    }

    throw new Error("No valid JSON object found in provider response.");
  }
}

async function callMistral(factPack) {
  if (!MISTRAL_API_KEY) {
    return fallbackDecision(factPack, "fallback_no_key", "MISTRAL_API_KEY is not set.");
  }

  const systemPrompt = `
You are the Cybraxis adaptive SOC training assistant.

You do not decide scores, pass/fail, stage progression, node truth, or scenario truth.
You only propose adaptive guidance inside backend-approved boundaries.

Return only one valid JSON object. No markdown. No extra text.

Allowed schema:
{
  "adaptiveDecision": "light_hint | medium_hint | strong_hint | remediation_recommendation | continue_current_stage",
  "misconceptionDetected": "premature_containment | incomplete_evidence | wrong_node_focus | weak_interpretation | mentor_overreliance | none",
  "supportLevel": "none | low | medium | high",
  "interventionType": "light_hint | medium_hint | strong_hint | remediation_recommendation | continue_current_stage",
  "nextFocus": "identity | connectivity | controls | activity/evidence | interpretation",
  "progressionRecommendation": "continue_current_scenario | unlock_equivalent_variant | send_to_remedy_premature_containment | send_to_remedy_evidence_completion",
  "confidence": number between 0 and 1,
  "learnerFacingMessage": "short learner-facing guidance"
}

Important rule:
If scenarioStatus is "in_progress", progressionRecommendation must be "continue_current_scenario".
`.trim();

  const userPrompt = JSON.stringify(
    {
      task: "Analyze this Cybraxis learner fact pack and return an adaptive intervention JSON object.",
      factPack,
    },
    null,
    2
  );

  const providerResponse = await httpsPostJson(
    "api.mistral.ai",
    "/v1/chat/completions",
    {
      model: MISTRAL_MODEL,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    }
  );

  const content = providerResponse?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  const validated = validateDecision(parsed, factPack);

  return {
    ...validated,
    provider: "mistral",
    providerStatus: "live",
    validatedByBackend: true,
    model: MISTRAL_MODEL,
    generatedAt: new Date().toISOString(),
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 2_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON request body."));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });

  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "cybraxis-ai-server",
      providerConfigured: Boolean(MISTRAL_API_KEY),
      model: MISTRAL_MODEL,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/ai/adaptive-intervention") {
    try {
      const body = await readJsonBody(req);
      const factPack = body.factPack || body;

      const decision = await callMistral(factPack).catch((error) => {
        return fallbackDecision(
          factPack,
          "fallback_after_provider_error",
          error?.message || String(error)
        );
      });

      sendJson(res, 200, {
        ok: true,
        decision,
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error?.message || String(error),
      });
    }

    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: "Route not found.",
  });
});

server.listen(PORT, () => {
  console.log(`Cybraxis AI server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Provider configured: ${MISTRAL_API_KEY ? "yes" : "no"}`);
  console.log(`Model: ${MISTRAL_MODEL}`);
});

