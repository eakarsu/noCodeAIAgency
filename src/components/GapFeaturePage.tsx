"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AIResponseReport from "./AIResponseReport";
import NativeWorkflowExamples, { type WorkflowField } from "./NativeWorkflowExamples";

const aiSlugs = new Set(["ab-test-orchestrator", "cost-latency-router", "drift-detection", "prompt-optimization", "nl-workflow-drafter", "template-recommendation", "deployment-anomaly-detection", "replay-debugger"]);
export default function GapFeaturePage({ title, description, slug, endpoint, fields = [], aiResultKey }: { title: string; description?: string; slug?: string; endpoint?: string; fields?: WorkflowField[]; aiResultKey?: string }) {
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.name, field.defaultValue || ""])));
  const [loading, setLoading] = useState(false), [result, setResult] = useState<unknown>(null), [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null), apiPath = endpoint || `/api/gap-${slug}`;
  const isAi = aiSlugs.has(slug || apiPath.replace(/^\/api\/gap-/, ""));
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (loading) return;
    setError("");
    const body: Record<string, unknown> = {};
    try {
      for (const field of fields) {
        const value = form[field.name] || "";
        if (value.startsWith("[Choose ")) throw new Error(`Choose a real saved record for ${field.label} before running.`);
        if (field.required && !value.trim()) throw new Error(`Complete ${field.label} before running.`);
        if (field.type === "json" && value.trim()) { try { body[field.name] = JSON.parse(value); } catch { throw new Error(`${field.label} must contain valid JSON input.`); } }
        else if (field.type === "array") body[field.name] = value.split(",").map(item => item.trim()).filter(Boolean);
        else if (field.type === "number" && value.trim()) { const number = Number(value); if (!Number.isFinite(number)) throw new Error(`${field.label} must contain a valid number.`); body[field.name] = number; }
        else body[field.name] = value;
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Review your inputs before running."); return; }
    const active = new AbortController(); controller.current = active; setLoading(true); setResult(null);
    try {
      const response = await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body), signal: active.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The workflow could not complete.");
      const output = aiResultKey && data[aiResultKey] !== undefined ? data[aiResultKey] : data.result ?? data.proposal ?? data.report ?? data.minutes ?? data.explanation ?? data;
      if (isAi && (output === "" || output == null)) throw new Error("OpenRouter did not return a report. Retry the request.");
      if (!active.signal.aborted) setResult(output);
    } catch (error) { if (!active.signal.aborted) setError(error instanceof Error ? error.message : "The workflow could not complete."); }
    finally { if (controller.current === active) { controller.current = null; setLoading(false); } }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-6 text-slate-800"><header className="space-y-2"><h1 className="text-2xl font-semibold">{title}</h1>{description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}</header><form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><NativeWorkflowExamples fields={fields} title={title} values={form} onFill={setForm} disabled={loading}/><fieldset disabled={loading} className="space-y-4">{fields.map(field => <label key={field.name} className="block space-y-1 text-sm"><span className="font-medium">{field.label}{field.required ? " *" : <span className="ml-1 text-xs text-slate-500">Optional</span>}</span>{field.type === "textarea" || field.type === "json" ? <textarea aria-label={field.label} required={field.required} value={form[field.name] || ""} onChange={event => setForm({ ...form, [field.name]: event.target.value })} placeholder={field.placeholder || ""} rows={field.rows || 4} className="w-full rounded-md border border-slate-300 p-3"/> : <input aria-label={field.label} required={field.required} type={field.type === "number" ? "number" : "text"} step={field.type === "number" ? "any" : undefined} value={form[field.name] || ""} onChange={event => setForm({ ...form, [field.name]: event.target.value })} placeholder={field.placeholder || ""} className="w-full rounded-md border border-slate-300 p-3"/>}{field.hint ? <span className="block text-xs text-slate-500">{field.hint}</span> : null}</label>)}</fieldset><div className="flex flex-wrap gap-3"><button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading ? "Processing…" : isAi ? "Generate with OpenRouter" : "Run workflow"}</button>{loading ? <button type="button" onClick={() => controller.current?.abort()} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel request</button> : <button type="button" onClick={() => { setForm(Object.fromEntries(fields.map(field => [field.name, field.defaultValue || ""]))); setResult(null); setError(""); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>}</div></form>{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}{result !== null ? <AIResponseReport value={result} title={isAi ? "OpenRouter report" : "Workflow result"} kind={isAi ? "ai" : "workflow"}/> : null}</main>;
}
