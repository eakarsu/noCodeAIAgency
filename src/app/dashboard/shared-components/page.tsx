"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface Component {
  id: string
  name: string
  type: string
  description?: string
  currentVersion: string
  versions: Array<{ version: string; createdAt: string }>
}

export default function SharedComponentsPage() {
  const [items, setItems] = useState<Component[]>([])
  const [name, setName] = useState("")
  const [type, setType] = useState("PROMPT_BLOCK")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("{\n  \n}")

  async function load() {
    const r = await fetch("/api/shared-components?pageSize=50")
    const d = await r.json()
    setItems(d.data || [])
  }
  useEffect(() => { load() }, [])

  async function create() {
    let parsed
    try { parsed = JSON.parse(content) } catch { return alert("Invalid JSON content") }
    const res = await fetch("/api/shared-components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, description, content: parsed }),
    })
    if (res.ok) { setName(""); setDescription(""); setContent("{}"); load() }
    else { const e = await res.json(); alert(e.error || "Failed") }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Shared components & sub-workflows</h1>

      <Card>
        <CardHeader><CardTitle>Create</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded p-2">
            <option value="PROMPT_BLOCK">Prompt block</option>
            <option value="SUB_WORKFLOW">Sub-workflow</option>
            <option value="CODE_SNIPPET">Code snippet</option>
          </select>
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Textarea
            placeholder='Content JSON (e.g. { "workflowId": "..." } for SUB_WORKFLOW)'
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <Button onClick={create}>Save</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{i.name}</span>
                <Badge>{i.type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div>v{i.currentVersion} • {(i.versions || []).length} versions</div>
              {i.description && <div className="text-gray-600 mt-1">{i.description}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
