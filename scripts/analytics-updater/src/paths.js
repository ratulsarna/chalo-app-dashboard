const path = require("node:path");
const os = require("node:os");

function defaultStatePath() {
  return path.join(os.homedir(), ".local", "state", "chalo-dashboard", "analytics-updater", "state.json");
}

function defaultLockPath() {
  return path.join(os.homedir(), ".local", "state", "chalo-dashboard", "analytics-updater", "lock");
}

module.exports = { defaultStatePath, defaultLockPath };
