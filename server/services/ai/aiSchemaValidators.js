const Ajv = require("ajv");

const ajv = new Ajv({
  allErrors: true,
  strict: false
});

const mentorHintSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "hintText",
    "trigger",
    "supportLevel",
    "confidence",
    "safetyFlags",
    "groundedFactIds"
  ],
  properties: {
    hintText: {
      type: "string",
      minLength: 1,
      maxLength: 240
    },
    trigger: {
      type: "string",
      enum: [
        "premature_response",
        "wrong_target",
        "insufficient_evidence",
        "time_pressure",
        "repeated_mistake",
        "general_guidance"
      ]
    },
    supportLevel: {
      type: "string",
      enum: ["light", "medium", "strong"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    safetyFlags: {
      type: "object",
      additionalProperties: false,
      required: [
        "revealsExactAction",
        "inventsFacts",
        "claimsGameplayAuthority"
      ],
      properties: {
        revealsExactAction: {
          type: "boolean"
        },
        inventsFacts: {
          type: "boolean"
        },
        claimsGameplayAuthority: {
          type: "boolean"
        }
      }
    },
    groundedFactIds: {
      type: "array",
      items: {
        type: "string"
      },
      maxItems: 8
    }
  }
};

const validateMentorHintSchema = ajv.compile(mentorHintSchema);

function validateMentorHint(output) {
  const valid = validateMentorHintSchema(output);

  return {
    valid,
    errors: valid ? [] : validateMentorHintSchema.errors
  };
}

module.exports = {
  mentorHintSchema,
  validateMentorHint
};