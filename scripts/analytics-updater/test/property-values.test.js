const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { extractPropertyValueCandidates } = require("../src/property-values.js");

async function writeFile(fullPath, contents) {
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, contents, "utf8");
}

test("extractPropertyValueCandidates resolves const strings and enum-like values", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  const kt = `
    package example

    object AnalyticsEventConstants {
      const val ATTRIBUTE_MODE = "mode"
      const val VALUE_MODE_AUTO = "auto"
    }

    enum class MyEnum {
      A,
      B
    }

    enum class Source(val sourceName: String) {
      LOGIN("loginScreen"),
      HOME("homeScreen")
    }

    fun emit(mode: MyEnum) {
      val a = mapOf(
        AnalyticsEventConstants.ATTRIBUTE_MODE to AnalyticsEventConstants.VALUE_MODE_AUTO,
        "mode" to MyEnum.A.name,
        AnalyticsEventConstants.ATTRIBUTE_MODE to mode.name,
        AnalyticsEventConstants.ATTRIBUTE_MODE to Source.LOGIN.sourceName
      )
    }
  `.trim();

  await writeFile(path.join(upstreamRepoPath, "shared", "sample.kt"), kt);

  const report = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["mode"],
  });

  const values = report.results.mode.values;
  assert.deepEqual(values, ["A", "auto", "B", "loginScreen"]);
});

test("extractPropertyValueCandidates resolves local vals and if/when expressions", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  const kt = `
    package example

    object AnalyticsEventConstants {
      const val ATTRIBUTE_STATUS = "status"
      const val ATTRIBUTE_RESULT = "result"
    }

    fun emit(flag: Boolean) {
      val status = if (flag) "ok" else "fail"
      val result = when (status) {
        "ok" -> "SUCCESS"
        else -> "FAILURE"
      }

      val props = mapOf(
        AnalyticsEventConstants.ATTRIBUTE_STATUS to status,
        AnalyticsEventConstants.ATTRIBUTE_STATUS to if (flag) "ok" else "fail",
        AnalyticsEventConstants.ATTRIBUTE_RESULT to result
      )
      println(props)
    }
  `.trim();

  await writeFile(path.join(upstreamRepoPath, "shared", "sample2.kt"), kt);

  const report = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["status", "result"],
  });

  assert.deepEqual(report.results.status.values, ["fail", "ok"]);
  assert.deepEqual(report.results.result.values, ["FAILURE", "SUCCESS"]);
});

test("extractPropertyValueCandidates flowScope filters unrelated files", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  await writeFile(
    path.join(upstreamRepoPath, "shared", "constants.kt"),
    `
      package example

      object AnalyticsEventConstants {
        const val ATTRIBUTE_MODE = "mode"
        const val EVENT_MY_FLOW = "my flow event"
      }
    `.trim(),
  );

  // Relevant file: mentions the flow event (via const) and sets mode="A".
  await writeFile(
    path.join(upstreamRepoPath, "shared", "flow_a.kt"),
    `
      package example

      fun emitA() {
        val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_MODE to "A")
        println(AnalyticsEventConstants.EVENT_MY_FLOW)
        println(props)
      }
    `.trim(),
  );

  // Unrelated file: sets mode="B" but never mentions the flow event.
  await writeFile(
    path.join(upstreamRepoPath, "shared", "other.kt"),
    `
      package example

      fun emitB() {
        val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_MODE to "B")
        println(props)
      }
    `.trim(),
  );

  const scoped = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["mode"],
    eventNames: ["my flow event"],
    flowScope: true,
  });
  assert.deepEqual(scoped.results.mode.values, ["A"]);

  const unscoped = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["mode"],
    flowScope: false,
  });
  assert.deepEqual(unscoped.results.mode.values, ["A", "B"]);
});

test("extractPropertyValueCandidates domain registry can mark unresolved keys as complete", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  const kt = `
    package example

    object AnalyticsEventConstants {
      const val ATTRIBUTE_STATUS = "status"
    }

    enum class TicketStatus {
      ACTIVE,
      CANCELLED
    }

    fun emit(status: String) {
      // Value is not statically resolvable (string param), so callsite scanning will be unresolved.
      val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_STATUS to status)
      println(props)
    }
  `.trim();

  await writeFile(path.join(upstreamRepoPath, "shared", "sample3.kt"), kt);

  const report = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["status"],
    propertyDomains: {
      status: { sources: [{ kind: "enumName", name: "TicketStatus" }] },
    },
  });

  assert.deepEqual(report.results.status.values, ["ACTIVE", "CANCELLED"]);
  assert.equal(report.results.status.complete, true);
  assert.equal(report.results.status.unresolved.length, 1);
});

test("extractPropertyValueCandidates domain registry can be scoped by flowSlug", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  const kt = `
    package example

    object AnalyticsEventConstants {
      const val ATTRIBUTE_STATUS = "status"
    }

    enum class TicketStatus {
      ACTIVE,
      CANCELLED
    }

    fun emit(status: String) {
      val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_STATUS to status)
      println(props)
    }
  `.trim();

  await writeFile(path.join(upstreamRepoPath, "shared", "sample4.kt"), kt);

  const domains = {
    status: [{ flows: ["flow-a"], sources: [{ kind: "enumName", name: "TicketStatus" }] }],
  };

  const a = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["status"],
    flowSlug: "flow-a",
    propertyDomains: domains,
  });
  assert.deepEqual(a.results.status.values, ["ACTIVE", "CANCELLED"]);
  assert.equal(a.results.status.complete, true);

  const b = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["status"],
    flowSlug: "flow-b",
    propertyDomains: domains,
  });
  assert.deepEqual(b.results.status.values, []);
  assert.equal(b.results.status.complete, false);
});

test("extractPropertyValueCandidates domain registry can scope callsites by file path", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "chalo-dashboard-enums-"));
  const upstreamRepoPath = path.join(tmp, "upstream");

  await writeFile(
    path.join(upstreamRepoPath, "shared", "constants.kt"),
    `
      package example

      object AnalyticsEventConstants {
        const val ATTRIBUTE_SOURCE = "sourceKey"
      }
    `.trim(),
  );

  await writeFile(
    path.join(upstreamRepoPath, "shared", "mticket", "a.kt"),
    `
      package example

      fun emitA() {
        val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_SOURCE to "A")
        println(props)
      }
    `.trim(),
  );

  await writeFile(
    path.join(upstreamRepoPath, "shared", "other", "b.kt"),
    `
      package example

      fun emitB() {
        val props = mapOf(AnalyticsEventConstants.ATTRIBUTE_SOURCE to "B")
        println(props)
      }
    `.trim(),
  );

  const report = await extractPropertyValueCandidates({
    upstreamRepoPath,
    includeDirs: ["shared"],
    propertyKeys: ["sourceKey"],
    flowSlug: "mticket",
    propertyDomains: {
      sourceKey: {
        flows: ["mticket"],
        callsiteFilePathIncludes: ["/mticket/"],
        sources: [{ kind: "literal", values: ["A"] }],
      },
    },
  });

  assert.deepEqual(report.results.sourceKey.observedValues, ["A"]);
  assert.deepEqual(report.results.sourceKey.values, ["A"]);
  assert.equal(report.results.sourceKey.complete, true);
});
