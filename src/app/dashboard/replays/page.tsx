"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Replay {
  id: string
  workflowId: string
  instanceId: string
  durationMs: number
  totalCostUsd: number | null
  triggerData: Record<string, unknown>
  variables: Record<string, unknown>
  createdAt: string
}

export default function ReplaysPage() {
  const [replays, setReplays] = useState<Replay[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function load() {
    const r = await fetch(`/api/replays?page=${page}&pageSize=20`)
    const d = await r.json()
    setReplays(d.data || [])
    setTotalPages(d.totalPages || 1)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [page])

  async function replay(id: string) {
    const r = await fetch(`/api/replays/${id}/replay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    const d = await r.json()
    if (d.success) alert(`Replayed → instance ${d.instanceId}`)
    else alert(d.error || "Failed")
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Live execution debugger / replay</h1>

      {replays.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle>
              {r.workflowId.slice(0, 8)} • {new Date(r.createdAt).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>Duration: {r.durationMs}ms</div>
            <div>Cost: ${(r.totalCostUsd || 0).toFixed(4)}</div>
            <details className="mt-2">
              <summary>triggerData</summary>
              <pre className="bg-gray-50 p-2 text-xs">{JSON.stringify(r.triggerData, null, 2)}</pre>
            </details>
            <Button onClick={() => replay(r.id)} className="mt-2">Replay</Button>
            <a
              href={`/dashboard/replays/${r.instanceId}/stream`}
              className="ml-2 mt-2 inline-flex items-center px-3 py-1 border rounded text-sm hover:bg-gray-50"
            >
              Live stream
            </a>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} variant="outline">Prev</Button>
        <div>Page {page} / {totalPages}</div>
        <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} variant="outline">Next</Button>
      </div>
    </div>
  )
}
