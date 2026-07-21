"use client"

import { useCallback, useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import type { GovernedActor } from "@/lib/governed-ai/authz"

type Source = {
  id: string
  externalId: string
  title: string
  sourceUpdatedAt: string
  syncedAt: string
  deletedAt: string | null
  version: number
  freshness: "fresh" | "stale" | "deleted"
}

type Job = {
  id: string
  query: string
  status: string
  output: null | { title?: string; rationale?: string; confidence?: number }
  provider: string | null
  model: string | null
  costMicros: number | null
  latencyMs: number | null
  errorCode: string | null
  decisionNote: string | null
  createdAt: string
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) throw new Error(body.message || body.error || "Request failed")
  return body as T
}

export default function GovernedConsole({ actor }: { actor: GovernedActor }) {
  const [sources, setSources] = useState<Source[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [query, setQuery] = useState("")
  const [note, setNote] = useState("Reviewed against the cited tenant sources.")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [sourceBody, jobBody] = await Promise.all([
        json<{ documents: Source[] }>(await fetch("/api/governed/sources", { cache: "no-store" })),
        json<{ jobs: Job[] }>(await fetch("/api/governed/recommendations", { cache: "no-store" })),
      ])
      setSources(sourceBody.documents)
      setJobs(jobBody.jobs)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load the governed workspace.")
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function queueRecommendation(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await json(await fetch("/api/governed/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ query }),
      }))
      setQuery("")
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to queue the recommendation.")
    } finally {
      setBusy(false)
    }
  }

  async function decide(jobId: string, decision: "APPROVE" | "REJECT") {
    setBusy(true)
    try {
      await json(await fetch(`/api/governed/recommendations/${jobId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      }))
      await refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to record the decision.")
    } finally {
      setBusy(false)
    }
  }

  const canCreate = actor.role !== "VIEWER"
  const canReview = actor.role === "OWNER" || actor.role === "REVIEWER"

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Supported production surface</p>
            <h1 className="mt-2 text-3xl font-bold">Governed AI recommendations</h1>
            <p className="mt-2 max-w-3xl text-slate-300">Tenant-scoped evidence is retrieved deterministically. Provider output must pass schema, citation, freshness, latency, cost, and confidence gates before a reviewer can approve it. Approval never executes a workflow.</p>
          </div>
          <div className="text-right text-sm text-slate-300">
            <p>Role: <strong className="text-white">{actor.role}</strong></p>
            <button className="mt-2 rounded border border-slate-600 px-3 py-1 hover:bg-slate-800" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
          </div>
        </header>

        {error && <div role="alert" className="rounded border border-red-500/60 bg-red-950/60 p-4 text-red-100">{error}</div>}

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Visible sources</p><p className="mt-2 text-3xl font-bold">{sources.length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Fresh sources</p><p className="mt-2 text-3xl font-bold">{sources.filter((source) => source.freshness === "fresh").length}</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">Awaiting approval</p><p className="mt-2 text-3xl font-bold">{jobs.filter((job) => job.status === "AWAITING_APPROVAL").length}</p></div>
        </section>

        {canCreate && (
          <form onSubmit={queueRecommendation} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <label htmlFor="query" className="font-semibold">Recommendation request</label>
            <textarea id="query" value={query} onChange={(event) => setQuery(event.target.value)} minLength={8} maxLength={1000} required className="mt-3 min-h-28 w-full rounded border border-slate-700 bg-slate-950 p-3" placeholder="Describe the approved workflow template or operating guidance you need." />
            <button disabled={busy} className="mt-3 rounded bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">Queue governed job</button>
          </form>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Recommendation jobs</h2><button onClick={() => void refresh()} className="rounded border border-slate-700 px-3 py-1 text-sm">Refresh</button></div>
          {canReview && <label className="mb-4 block text-sm text-slate-300">Decision note<input value={note} onChange={(event) => setNote(event.target.value)} minLength={8} maxLength={1000} className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2" /></label>}
          <div className="space-y-4">
            {jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold">{job.query}</h3><span className="rounded bg-slate-800 px-2 py-1 text-xs">{job.status}</span></div>
                {job.output && <div className="mt-4 rounded bg-slate-950 p-4"><p className="font-semibold">{job.output.title}</p><p className="mt-2 text-sm text-slate-300">{job.output.rationale}</p><p className="mt-2 text-xs text-slate-400">Confidence {job.output.confidence} · {job.provider}/{job.model} · {job.latencyMs} ms · {job.costMicros} μUSD</p></div>}
                {job.errorCode && <p className="mt-3 text-sm text-amber-300">Gate/worker state: {job.errorCode}</p>}
                {canReview && job.status === "AWAITING_APPROVAL" && <div className="mt-4 flex gap-3"><button disabled={busy || note.length < 8} onClick={() => void decide(job.id, "APPROVE")} className="rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-950">Approve</button><button disabled={busy || note.length < 8} onClick={() => void decide(job.id, "REJECT")} className="rounded bg-rose-400 px-3 py-2 font-semibold text-slate-950">Reject</button></div>}
              </article>
            ))}
            {!jobs.length && <p className="rounded border border-dashed border-slate-700 p-8 text-center text-slate-400">No governed recommendation jobs yet.</p>}
          </div>
        </section>

        <section><h2 className="text-xl font-bold">Permission-visible source index</h2><div className="mt-3 overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-slate-300"><tr><th className="p-3">Source</th><th className="p-3">Freshness</th><th className="p-3">Source timestamp</th><th className="p-3">Version</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id} className="border-t border-slate-800"><td className="p-3">{source.title}<span className="block text-xs text-slate-500">{source.externalId}</span></td><td className="p-3">{source.freshness}</td><td className="p-3">{new Date(source.sourceUpdatedAt).toLocaleString()}</td><td className="p-3">{source.version}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  )
}
