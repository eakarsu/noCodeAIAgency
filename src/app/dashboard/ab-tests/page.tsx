"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface ABTest {
  id: string
  name: string
  workflowAId: string
  workflowBId: string
  trafficSplit: number
  status: string
  statsA: { runs: number; successRate: number; avgDurationMs: number; avgCostUsd: number }
  statsB: { runs: number; successRate: number; avgDurationMs: number; avgCostUsd: number }
}

interface Workflow {
  id: string
  name: string
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [name, setName] = useState("")
  const [aId, setAId] = useState("")
  const [bId, setBId] = useState("")
  const [split, setSplit] = useState(50)

  async function load() {
    const r = await fetch("/api/ab-tests")
    const d = await r.json()
    setTests(d.data || [])
  }
  useEffect(() => {
    load()
    fetch("/api/workflows?pageSize=100")
      .then((r) => r.json())
      .then((d) => setWorkflows(d.data || []))
  }, [])

  async function create() {
    if (!name || !aId || !bId) return
    const res = await fetch("/api/ab-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workflowAId: aId, workflowBId: bId, trafficSplit: split }),
    })
    if (res.ok) {
      setName("")
      setAId("")
      setBId("")
      load()
    } else {
      const e = await res.json()
      alert(e.error || "Failed")
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Workflow A/B testing & cost analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle>New test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Test name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={aId} onChange={(e) => setAId(e.target.value)} className="border rounded p-2">
            <option value="">Workflow A</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select value={bId} onChange={(e) => setBId(e.target.value)} className="border rounded p-2 ml-2">
            <option value="">Workflow B</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            max={99}
            value={split}
            onChange={(e) => setSplit(parseInt(e.target.value))}
            placeholder="% to A"
          />
          <Button onClick={create}>Create</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.name}</span>
                <Badge>{t.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th>Variant</th>
                    <th>Runs</th>
                    <th>Success</th>
                    <th>Avg duration</th>
                    <th>Avg cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A ({t.trafficSplit}%)</td>
                    <td>{t.statsA.runs}</td>
                    <td>{(t.statsA.successRate * 100).toFixed(1)}%</td>
                    <td>{t.statsA.avgDurationMs.toFixed(0)}ms</td>
                    <td>${t.statsA.avgCostUsd.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td>B ({100 - t.trafficSplit}%)</td>
                    <td>{t.statsB.runs}</td>
                    <td>{(t.statsB.successRate * 100).toFixed(1)}%</td>
                    <td>{t.statsB.avgDurationMs.toFixed(0)}ms</td>
                    <td>${t.statsB.avgCostUsd.toFixed(4)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
