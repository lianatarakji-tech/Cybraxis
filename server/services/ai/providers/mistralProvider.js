const { mentorHintSchema } = require("../aiSchemaValidators");

let mistralClientPromise = null;

async function getMistralClient() {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("missing_mistral_api_key");
  }

  if (!mistralClientPromise) {
    mistralClientPromise = import("@mistralai/mistralai").then(
      ({ Mistral }) =>
        new Mistral({
          apiKey: process.env.MISTRAL_API_KEY
        })
    );
  }

  return mistralClientPromise;
}

async function generateJson({ factPack }) {
  const client = await getMistralClient();

  const model = process.env.MISTRAL_MODEL || "ministral-8b-latest";

  const messages = [
    {
      role: "system",
      content:
        "You are a bounded mentor inside the Cybraxis cybersecurity training simulator. " +
        "Use only the facts provided by the backend fact pack. " +
        "Do not invent nodes, logs, evidence, actions, scores, stage outcomes, or scenario outcomes. " +
        "Do not reveal the exact answer unless allowExactGuidance is true. " +
        "Return JSON only that matches the required schema."
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Create a short mentor hint for the player.",
        policy: {
          backendDecides: true,
          aiOnlyExplains: true,
          noGameplayAuthority: true,
          noInventedFacts: true,
          noExactGuidanceUnlessAllowed: true
        },
        factPack
      })
    }
  ];

  const response = await client.chat.complete({
    model,
    messages,
    temperature: 0.2,
    maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS_HINT || 160),
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "cybraxis_mentor_hint",
        schemaDefinition: mentorHintSchema
      }
    }
  });

  const rawText = extractTextFromMistralResponse(response);

  let parsed = null;

  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    parsed = null;
  }

  return {
    rawText,
    parsed,
    usage: {
      inputTokens: response.usage?.promptTokens || response.usage?.prompt_tokens || 0,
      outputTokens:
        response.usage?.completionTokens || response.usage?.completion_tokens || 0
    }
  };
}

function extractTextFromMistralResponse(response) {
  const content = response?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("");
  }

  return "";
}

module.exports = {
  generateJson
};
