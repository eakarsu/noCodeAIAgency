"use client";

export type WorkflowField = { name: string; label: string; required?: boolean; type?: string; placeholder?: string; rows?: number; defaultValue?: string; hint?: string };
const labels = ["Routine scenario", "Detailed review", "Complex case"];
const identifiers = /(?:Id$|^(?:approver|repo|workflow|cloud|region)$)/i;
export function workflowExample(fields: WorkflowField[], title: string, index: number, current: Record<string, unknown> = {}): Record<string, string> {
  return Object.fromEntries(fields.map(field => {
    const previous = current[field.name];
    if (identifiers.test(field.name)) return [field.name, typeof previous === "string" && previous.trim() && !previous.startsWith("[Choose ") ? previous : `[Choose a saved ${field.label.toLowerCase()}]`];
    if (field.defaultValue?.trim()) return [field.name, field.defaultValue];
    if (field.type === "number") {
      const samples: Record<string, number[]> = { budget: [1500, 4000, 8000], amount: [45, 180, 650], costUsd: [0.15, 0.6, 1.2], rating: [4, 5, 3], targetMs: [1000, 2000, 3000], thresholdMs: [1000, 2000, 3000], points: [25, 50, 75] };
      return [field.name, String((samples[field.name] || [1, 3, 5])[index])];
    }
    if (field.type === "json") {
      const json: Record<string, unknown> = {
        variations: [{ name: "Fictional variant A", prompt: "Summarize the supplied sample in three facts." }, { name: "Fictional variant B", prompt: "Write a brief summary and identify unsupported assumptions." }],
        testCases: [{ input: "Fictional request: 24 items, 6 missing dates.", expected: "Report the stated counts and ask for the missing dates." }],
        runs: [{ example: true, model: "fictional-evaluation", score: 0.8, latencyMs: 900 }, { example: true, model: "fictional-evaluation", score: 0.65, latencyMs: 1400 }],
        metrics: { example: true, requests: 24 * (index + 1), errors: 3 * (index + 1), latencyMs: 900 + index * 500 },
        session: { example: true, country: "US", cartTotal: 45 * (index + 1), itemCount: index + 1 },
        history: [{ example: true, category: "Sample product", activity: "Viewed", count: index + 1 }],
      };
      return [field.name, JSON.stringify(json[field.name] || { example: true, scenario: labels[index], note: `Fictional information for ${title}; review before running.` }, null, 2)];
    }
    if (field.type === "array") return [field.name, field.name === "permissions" ? "read" : `Fictional option A ${index + 1}, Fictional option B ${index + 1}`];
    const text: Record<string, string> = {
      targetLang: ["Spanish", "French", "German"][index],
      tone: "Professional and clear", windowMinutes: ["15", "30", "60"][index],
      successMetric: "Successful completion of the supplied sample task, with evidence gaps identified", decision: "review", role: "VIEWER", action: "review", source: "Fictional sample supplied for human review", channel: "dashboard", eventType: "example.review", zip: "10001", provider: "Example provider — select your configured provider", carrier: "Example carrier — select your configured carrier",
      replayLog: "Fictional replay: request received; validation found a missing date; execution paused for clarification. No live workflow was run.",
      requirements: "Fictional scenario: a small team needs an intake workflow with a required consent step, missing-input review, and a summary for the project owner. Recommend only from the supplied example templates.",
      availableTemplates: "Fictional intake template, Fictional review template, Fictional support template",
      task: `Fictional ${labels[index].toLowerCase()} for ${title}. Use supplied facts and identify missing evidence.`,
      content: `Fictional sample ${index + 1}: Your appointment request has been received. Please confirm the date and any accessibility requirements.`,
      imageDescription: "Fictional description: a small surface mark is visible on the sample item. No actual image or inspection findings have been supplied.",
    };
    return [field.name, text[field.name] || `Fictional ${labels[index].toLowerCase()} for ${title}. Use only supplied facts, identify missing evidence, and describe reviewable next steps.`];
  }));
}
export default function NativeWorkflowExamples({ fields, title, values, onFill, disabled }: { fields: WorkflowField[]; title: string; values: Record<string, unknown>; onFill: (values: Record<string, string>) => void; disabled?: boolean }) {
  return <section aria-label="Complete workflow examples" className="mb-5 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4"><h2 className="text-sm font-semibold">Fill every field</h2><p className="text-xs leading-5 text-slate-600">Examples include optional fields and use fictional information. Existing selected record IDs stay in place; choose real records wherever requested. Review your inputs, then run the workflow.</p><div className="flex flex-wrap gap-2">{labels.map((label, index) => <button key={label} type="button" disabled={disabled} onClick={() => onFill(workflowExample(fields, title, index, values))} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50">{label}</button>)}</div></section>;
}
