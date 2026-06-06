export function normalizeNativeTools(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.tools)) {
    return payload.tools;
  }

  if (payload.result && Array.isArray(payload.result.tools)) {
    return payload.result.tools;
  }

  throw new Error("Expected a JSON array, { tools: [...] }, or MCP tools/list result.");
}
