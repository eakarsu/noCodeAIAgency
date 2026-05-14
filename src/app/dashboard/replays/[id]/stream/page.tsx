"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NodeEvent {
  nodeId: string
  nodeType: string
  status: string
  durationMs?: number
  output?: unknown
  error?: string
  startedAt: string
}

export default function StreamPage() {
  const params = useParams()
  const id = params.id as string
  const [events, setEvents] = useState<NodeEvent[]>([])
  const [status, setStatus] = useState<string>("connecting…")

  useEffect(() => {
    const es = new EventSource(`/api/workflows/instances/${id}/stream`)
    es.addEventListener("init", () => setStatus("running"))
    es.addEventListener("node", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as NodeEvent
      setEvents((prev) => [...prev, d])
    })
    es.addEventListener("done", (e) => {
      const d = JSON.parse((e as MessageEvent).data) as { status: string }
      setStatus(`done: ${d.status}`)
      es.close()
    })
    es.addEventListener("error", () => setStatus("error"))
    return () => es.close()
  }, [id])

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Live workflow execution</h1>
      <div>Status: {status}</div>
      <Card>
        <CardHeader>
          <CardTitle>Node events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.map((e, i) => (
            <div key={i} className="border-b py-2 text-sm">
              <strong>{e.nodeId}</strong> ({e.nodeType}) — <em>{e.status}</em>
              {e.durationMs ? <span> • {e.durationMs}ms</span> : null}
              {e.error && <div className="text-red-600">{e.error}</div>}
              {e.output != null && (
                <pre className="bg-gray-50 p-2 text-xs mt-1">{JSON.stringify(e.output, null, 2)}</pre>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
