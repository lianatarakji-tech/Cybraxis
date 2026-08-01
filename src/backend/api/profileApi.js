const API_BASE_URL = "http://localhost:5000/api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }

  return data;
}

export async function getProfileSummary({
  userId = "local-user",
  limit = 10,
} = {}) {
  const params = new URLSearchParams();

  if (userId) {
    params.set("userId", userId);
  }

  if (limit) {
    params.set("limit", String(limit));
  }

  const query = params.toString();
  const data = await requestJson(`/profile/summary${query ? `?${query}` : ""}`);

  return data.profile;
}