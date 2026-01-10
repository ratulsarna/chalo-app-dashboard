#!/usr/bin/env node
const { validateAnalyticsContent } = require("./src/validate-content.js");
const { resolveConfig } = require("./src/config.js");

async function main() {
  const config = resolveConfig();
  const result = await validateAnalyticsContent(config.dashboardRepoPath);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 2;
}

void main();

