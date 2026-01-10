function computeUpdateBranchName(upstreamHeadSha) {
  const safe = String(upstreamHeadSha || "").trim();
  if (safe.length === 0) throw new Error("Missing upstream HEAD sha");
  if (!/^[0-9a-f]{7,40}$/i.test(safe)) {
    throw new Error(`Invalid upstream HEAD sha: ${safe}`);
  }
  return `autoupdate/analytics/${safe}`;
}

function shouldRunForHead(state, upstreamHeadSha) {
  const last = state && typeof state === "object" ? state.lastProcessedCommit : null;
  return typeof upstreamHeadSha === "string" && upstreamHeadSha.length > 0 && upstreamHeadSha !== last;
}

module.exports = { computeUpdateBranchName, shouldRunForHead };
