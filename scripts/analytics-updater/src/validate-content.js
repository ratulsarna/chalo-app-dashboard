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

  for (const requiredPath of [flowsJsonPath, slugMapPath]) {
    try {
      await fs.access(requiredPath);
    } catch {
      issues.push({ level: "error", code: "missing_file", path: requiredPath });
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
