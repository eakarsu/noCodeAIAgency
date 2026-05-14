"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ConnectStatus {
  status: string
  stripeAccountId?: string
  payoutEnabled?: boolean
}

interface Purchase {
  id: string
  templateId: string
  amountUsd: number
  platformFeeUsd: number
  sellerNetUsd: number
  createdAt: string
  status: string
}

export default function MarketplaceRevenuePage() {
  const [status, setStatus] = useState<ConnectStatus>({ status: "NONE" })
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [view, setView] = useState<"buyer" | "seller">("seller")
  const [summary, setSummary] = useState<Record<string, number>>({})

  async function load() {
    const s = await fetch("/api/marketplace/connect").then((r) => r.json())
    setStatus(s)
    const p = await fetch(`/api/marketplace/purchases?as=${view}`).then((r) => r.json())
    setPurchases(p.data || [])
    setSummary(p.summary || {})
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [view])

  async function startConnect() {
    const r = await fetch("/api/marketplace/connect", { method: "POST" })
    const d = await r.json()
    if (d.url) window.location.href = d.url
    else alert(d.error || "Failed")
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Marketplace revenue</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Stripe Connect status
            <Badge>{status.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status.status === "NONE" && <p>You haven't started Stripe Connect onboarding yet.</p>}
          {status.payoutEnabled ? (
            <Badge>Payouts enabled</Badge>
          ) : (
            <Button onClick={startConnect}>Start / refresh onboarding</Button>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant={view === "seller" ? "default" : "outline"} onClick={() => setView("seller")}>Sales</Button>
        <Button variant={view === "buyer" ? "default" : "outline"} onClick={() => setView("buyer")}>Purchases</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{view === "seller" ? "My sales" : "My purchases"}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div><div className="text-gray-500">Total volume</div><div className="text-xl">${(summary.amountUsd || 0).toFixed(2)}</div></div>
            <div><div className="text-gray-500">Platform fees</div><div className="text-xl">${(summary.platformFeeUsd || 0).toFixed(2)}</div></div>
            <div><div className="text-gray-500">Seller net</div><div className="text-xl">${(summary.sellerNetUsd || 0).toFixed(2)}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th>When</th><th>Template</th><th>Amount</th><th>Fee</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                  <td>{p.templateId.slice(0, 8)}</td>
                  <td>${p.amountUsd.toFixed(2)}</td>
                  <td>${p.platformFeeUsd.toFixed(2)}</td>
                  <td>${p.sellerNetUsd.toFixed(2)}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
