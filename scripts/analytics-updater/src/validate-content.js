const fs = require("node:fs/promises");
const path = require("node:path");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function validateAnalyticsContent(repoRoot) {
  const issues = [];
  const contentRoot = path.join(repoRoot, "content", "analytics");

  const flowsJsonPath = path.join(contentRoot, "flows.json");
  const slugMapPath = path.join(contentRoot, "flow-slug-map.json");

  let flowsJson = null;
  let slugMapJson = null;

  for (const requiredPath of [flowsJsonPath, slugMapPath]) {
    try {
      await fs.access(requiredPath);
    } catch {
      issues.push({ level: "error", code: "missing_file", path: requiredPath });
      continue;
    }

    try {
      const parsed = await readJson(requiredPath);
      if (requiredPath === flowsJsonPath) flowsJson = parsed;
      if (requiredPath === slugMapPath) slugMapJson = parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      issues.push({ level: "error", code: "invalid_json", path: requiredPath, message });
    }
  }

  // Ensure all flow folders referenced by the slug map exist and contain events.json,
  // and ensure all flow keys in flows.json are backed by at least one folder.
  const flowKeys = new Set();
  if (isRecord(flowsJson) && isRecord(flowsJson.flows)) {
    for (const key of Object.keys(flowsJson.flows)) {
      if (typeof key === "string" && key.trim().length > 0) flowKeys.add(key);
    }
  }

  const slugToFlowKey = new Map();
  const flowKeyToSlugs = new Map();
  if (isRecord(slugMapJson)) {
    for (const [flowSlug, flowKey] of Object.entries(slugMapJson)) {
      if (typeof flowSlug !== "string" || flowSlug.trim().length === 0) continue;
      if (flowSlug.startsWith("_")) continue;
      if (typeof flowKey !== "string" || flowKey.trim().length === 0) continue;
      slugToFlowKey.set(flowSlug, flowKey);

      const slugs = flowKeyToSlugs.get(flowKey) ?? [];
      slugs.push(flowSlug);
      flowKeyToSlugs.set(flowKey, slugs);
    }
  }

  for (const [flowSlug, flowKey] of slugToFlowKey.entries()) {
    if (flowKeys.size > 0 && !flowKeys.has(flowKey)) {
      issues.push({ level: "error", code: "unknown_flow_key", path: slugMapPath, flowSlug, flowKey });
    }

    const dirPath = path.join(contentRoot, flowSlug);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        issues.push({ level: "error", code: "invalid_flow_dir", path: dirPath });
        continue;
      }
    } catch {
      issues.push({ level: "error", code: "missing_flow_dir", path: dirPath });
      continue;
    }

    const eventsPath = path.join(dirPath, "events.json");
    try {
      await fs.access(eventsPath);
    } catch {
      issues.push({ level: "error", code: "missing_events_json", path: eventsPath });
    }
  }

  for (const flowKey of flowKeys) {
    const hasMappedSlug = (flowKeyToSlugs.get(flowKey) ?? []).length > 0;
    if (hasMappedSlug) continue;

    const dirPath = path.join(contentRoot, flowKey);
    try {
      const stat = await fs.stat(dirPath);
      if (!stat.isDirectory()) {
        issues.push({ level: "error", code: "invalid_flow_dir", path: dirPath });
        continue;
      }
    } catch {
      issues.push({ level: "error", code: "missing_flow_dir", path: dirPath });
      continue;
    }

    const eventsPath = path.join(dirPath, "events.json");
    try {
      await fs.access(eventsPath);
    } catch {
      issues.push({ level: "error", code: "missing_events_json", path: eventsPath });
    }
  }

  // Validate each flow folder that has an events.json.
  let entries = [];
  try {
    entries = await fs.readdir(contentRoot, { withFileTypes: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({ level: "error", code: "read_failed", path: contentRoot, message });
    return { ok: false, issues };
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const flowSlug = entry.name;
    const eventsPath = path.join(contentRoot, flowSlug, "events.json");
    try {
      await fs.access(eventsPath);
    } catch {
      continue; // not a flow folder
    }

    try {
      const file = await readJson(eventsPath);
      if (!isRecord(file)) {
        issues.push({ level: "error", code: "invalid_events_json_shape", path: eventsPath });
        continue;
      }
      if (typeof file.flowId !== "string" || file.flowId.trim().length === 0) {
        issues.push({ level: "error", code: "missing_flowId", path: eventsPath });
      }
      if (typeof file.flowName !== "string" || file.flowName.trim().length === 0) {
        issues.push({ level: "error", code: "missing_flowName", path: eventsPath });
      }
      if (!Array.isArray(file.events) && !Array.isArray(file.stages)) {
        issues.push({ level: "warning", code: "missing_events_and_stages", path: eventsPath });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      issues.push({ level: "error", code: "invalid_json", path: eventsPath, message });
    }
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues };
}

module.exports = { validateAnalyticsContent };
