import test from "node:test";
import assert from "node:assert/strict";
import { toCsv, providerConfigured, clientHealth, followupDraft } from "../src/lib/wave12";
test("csv quoting", () => { assert.ok(toCsv([{ a: "x,y", n: 0, ok: false }]).includes('"x,y"')); });
test("client health fallback zero/false", () => { const r = clientHealth([]); assert.equal(r.aiGenerated, false); assert.equal(r.sections.find((s) => s.label === "Active count")?.value, 0); assert.equal(r.sections.find((s) => s.label === "Has clients")?.value, false); });
test("followup empty draft preserved", () => { const r = followupDraft([{ name: "A", status: "active" }]); assert.equal(r.sections.find((s) => s.label === "Draft")?.value, ""); });
test("provider gate", () => { assert.equal(providerConfigured({}), false); });
