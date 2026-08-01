const mockProvider = require("./providers/mockProvider");
const mistralProvider = require("./providers/mistralProvider");

async function generateMentorHintJson({
  factPack,
  mockMode,
  forceMockProvider = false
}) {
  const provider = forceMockProvider
    ? "mock"
    : process.env.AI_PROVIDER || "mock";

  if (provider === "mock") {
    return mockProvider.generateJson({
      factPack,
      mode: mockMode || "valid"
    });
  }

  if (provider === "mistral") {
    return mistralProvider.generateJson({
      factPack
    });
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

module.exports = {
  generateMentorHintJson
};
