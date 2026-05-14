"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { PLANS, type Plan } from "@/lib/stripe"

interface UserPlanInfo {
  plan: string
  planExpiresAt: string | null
  stripeSubscriptionId: string | null
}

export default function BillingPage() {
  const { data: session } = useSession()
  const [planInfo, setPlanInfo] = useState<UserPlanInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check for success/cancel query params
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "true") {
      setMessage("Subscription activated successfully! Welcome to your new plan.")
    } else if (params.get("canceled") === "true") {
      setMessage("Checkout was canceled. No charges were made.")
    }
  }, [])

  useEffect(() => {
    async function fetchPlanInfo() {
      try {
        const res = await fetch("/api/billing/plan")
        if (res.ok) {
          const data = await res.json()
          setPlanInfo(data)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    if (session?.user) {
      fetchPlanInfo()
    }
  }, [session])

  async function handleUpgrade(planId: string) {
    setCheckoutLoading(planId)
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage(data.error ?? "Failed to create checkout session")
      }
    } catch {
      setMessage("An error occurred. Please try again.")
    } finally {
      setCheckoutLoading(null)
    }
  }

  const currentPlan = planInfo?.plan ?? "free"
  const plans = Object.values(PLANS)

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">
          Manage your subscription and upgrade your plan.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.includes("success")
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-yellow-50 text-yellow-800 border border-yellow-200"
          }`}
        >
          {message}
        </div>
      )}

      {/* Current plan summary */}
      {!loading && planInfo && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Current plan:{" "}
            <span className="font-semibold capitalize">{currentPlan}</span>
            {planInfo.planExpiresAt && (
              <span className="ml-2 text-blue-500">
                (renews {new Date(planInfo.planExpiresAt).toLocaleDateString()})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: Plan) => {
          const isCurrent = plan.id === currentPlan
          const isUpgrade = plans.indexOf(plan) > plans.findIndex((p) => p.id === currentPlan)

          return (
            <div
              key={plan.id}
              className={`rounded-xl border-2 p-6 flex flex-col ${
                isCurrent
                  ? "border-blue-500 shadow-md"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                {isCurrent && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    Current
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mb-4">{plan.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg
                      className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.monthlyPriceId ? (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || checkoutLoading === plan.id}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isUpgrade
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-800 text-white hover:bg-gray-900"
                  }`}
                >
                  {checkoutLoading === plan.id
                    ? "Redirecting..."
                    : isCurrent
                    ? "Current Plan"
                    : isUpgrade
                    ? `Upgrade to ${plan.name}`
                    : `Switch to ${plan.name}`}
                </button>
              ) : (
                <div className="w-full py-2 px-4 rounded-lg font-medium text-sm text-center bg-gray-100 text-gray-500">
                  {isCurrent ? "Your current plan" : "Free"}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
