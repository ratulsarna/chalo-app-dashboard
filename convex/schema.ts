import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flows: defineTable({
    flowId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    lastAudited: v.optional(v.string()),
  }).index("by_flowId", ["flowId"]),
});
