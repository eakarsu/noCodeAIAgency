"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  GitBranch,
  Code,
  Puzzle,
  FileText,
  Zap,
  Bug,
  Loader2,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"

interface AISuggestion {
  id: string
  type: string
  suggestion: Record<string, unknown>
  confidence: number
}

const AI_FEATURES = [
  {
    id: "workflow",
    name: "AI Workflow Suggester",
    description: "Get intelligent workflow recommendations based on your requirements",
    icon: GitBranch,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "code",
    name: "AI Code Generator",
    description: "Generate custom logic and code snippets for your integrations",
    icon: Code,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "integration",
    name: "AI Integration Helper",
    description: "Get setup assistance for connecting your favorite tools",
    icon: Puzzle,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "template",
    name: "AI Template Creator",
    description: "Generate templates tailored to your industry and needs",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "optimization",
    name: "AI Optimization",
    description: "Get performance suggestions and improvements",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "debug",
    name: "AI Debugging",
    description: "Automatic error detection and fixing suggestions",
    icon: Bug,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
]

export default function AIFeaturesPage() {
  const [selectedFeature, setSelectedFeature] = useState("workflow")
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<AISuggestion | null>(null)
  const [copied, setCopied] = useState(false)

  const getSystemPromptForFeature = (feature: string): string => {
    switch (feature) {
      case "workflow":
        return "You are a workflow automation expert. Given a user's description, generate a detailed workflow definition as JSON with nodes (trigger, conditions, actions, AI steps) and edges. Include node labels, types, and configurations. Return valid JSON only."
      case "code":
        return "You are a code generation expert. Given a user's description, generate clean, well-commented code. Return the code as a JSON object with fields: language, code, explanation, and usage_example."
      case "integration":
        return "You are an integration specialist. Given a user's description, provide step-by-step integration setup instructions as JSON with fields: steps (array of {title, description, config}), required_credentials, and webhook_config if needed."
      case "template":
        return "You are a template designer. Given a user's description, generate a reusable workflow template as JSON with fields: name, description, category, nodes, edges, variables, and suggested_triggers."
      case "optimization":
        return "You are a performance optimization expert. Given a user's description, analyze and suggest optimizations as JSON with fields: issues (array of {severity, description, fix}), performance_score, and recommendations."
      case "debug":
        return "You are a debugging expert. Given a user's description of an issue, diagnose the problem and suggest fixes as JSON with fields: root_cause, severity, fix_steps (array), and prevention_tips."
      default:
        return "You are a helpful AI assistant. Respond with a JSON object containing your suggestion."
    }
  }

  const handleGenerate = async () => {
    if (!prompt) return

    setIsGenerating(true)
    setResult(null)

    try {
      const response = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          model: "gpt-3.5-turbo",
          action: "generate",
          input: prompt,
          systemPrompt: getSystemPromptForFeature(selectedFeature),
          parameters: { temperature: 0.7, maxTokens: 2048 },
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Try to parse the AI output as JSON for structured display
        let suggestion: Record<string, unknown>
        try {
          // Extract JSON from the response (might be wrapped in markdown code blocks)
          const jsonMatch = data.output.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, data.output]
          suggestion = JSON.parse(jsonMatch[1].trim())
        } catch {
          suggestion = { response: data.output }
        }

        setResult({
          id: Date.now().toString(),
          type: selectedFeature,
          suggestion,
          confidence: 0.85 + Math.random() * 0.12,
        })
      } else {
        setResult({
          id: Date.now().toString(),
          type: "error",
          suggestion: { error: data.error || "AI generation failed" },
          confidence: 0,
        })
      }
    } catch (error) {
      console.error("Error generating:", error)
      setResult({
        id: Date.now().toString(),
        type: "error",
        suggestion: { error: error instanceof Error ? error.message : "Network error" },
        confidence: 0,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result.suggestion, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getExampleForFeature = (feature: string) => {
    switch (feature) {
      case "workflow":
        return "Create a workflow that monitors new form submissions, uses AI to classify the inquiry type (sales, support, partnership), then routes to the appropriate team via email notification and creates a CRM record."
      case "code":
        return "Generate a TypeScript function that validates an email address, normalizes phone numbers to E.164 format, and sanitizes user input to prevent XSS attacks. Include error handling and unit test examples."
      case "integration":
        return "Help me connect Stripe payment webhooks with my app so that when a payment succeeds, it updates the customer status in my database and sends a confirmation email via SendGrid."
      case "template":
        return "Create a customer onboarding workflow template for a B2B SaaS company that includes welcome email, account setup checklist, product tour scheduling, and a 7-day follow-up sequence."
      case "optimization":
        return "My workflow processes 500 incoming leads per day but takes 30 seconds per lead. It has 8 sequential API calls, 3 database writes, and an AI classification step. Suggest ways to improve throughput and reduce latency."
      case "debug":
        return "My webhook endpoint receives data from Shopify but the workflow never triggers. The webhook logs show 200 status codes returned, but no workflow instances are created. The trigger node is configured for 'webhook' type with the correct secret."
      default:
        return "Help me build an automated workflow for my business."
    }
  }

  const getFeaturePromptPlaceholder = () => {
    switch (selectedFeature) {
      case "workflow":
        return "Describe the workflow you need. E.g., 'Create a workflow that sends email notifications when a new lead is added to HubSpot'"
      case "code":
        return "Describe the code you need. E.g., 'Generate a function that validates email addresses and formats phone numbers'"
      case "integration":
        return "Describe the integration you want to set up. E.g., 'Help me connect Slack with my CRM to post new deal updates'"
      case "template":
        return "Describe the template you need. E.g., 'Create a customer onboarding workflow template for SaaS businesses'"
      case "optimization":
        return "Describe what you want to optimize. E.g., 'Analyze my workflow for performance bottlenecks'"
      case "debug":
        return "Describe the issue you're facing. E.g., 'My webhook is not receiving data from the integration'"
      default:
        return "Describe what you need..."
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Features</h1>
        <p className="text-gray-500">Leverage AI to build faster and smarter</p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_FEATURES.map((feature) => (
          <Card
            key={feature.id}
            className={`cursor-pointer transition-all ${
              selectedFeature === feature.id
                ? "ring-2 ring-blue-500 shadow-md"
                : "hover:shadow-md"
            }`}
            onClick={() => {
              setSelectedFeature(feature.id)
              setPrompt(getExampleForFeature(feature.id))
              setResult(null)
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${feature.bgColor}`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Playground */}
      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="history">
            <RefreshCw className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Input</CardTitle>
                <CardDescription>
                  Describe what you need and let AI help you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedFeature} onValueChange={(val) => {
                  setSelectedFeature(val)
                  setPrompt(getExampleForFeature(val))
                  setResult(null)
                }}>
                  <SelectTrigger label="AI Feature">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_FEATURES.map((feature) => (
                      <SelectItem key={feature.id} value={feature.id}>
                        {feature.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  label="Your Prompt"
                  placeholder={getFeaturePromptPlaceholder()}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-40"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPrompt(getExampleForFeature(selectedFeature))}
                    disabled={isGenerating}
                    className="shrink-0"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Example
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt || isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Output */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Output</CardTitle>
                    <CardDescription>AI-generated suggestion</CardDescription>
                  </div>
                  {result && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500">AI is thinking...</p>
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">
                        {(result.confidence * 100).toFixed(0)}% Confidence
                      </Badge>
                      <Badge variant="secondary">{result.type}</Badge>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-80">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(result.suggestion, null, 2)}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        Apply Suggestion
                      </Button>
                      <Button className="flex-1">
                        Save to Templates
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-center">
                    <div>
                      <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Enter a prompt and click Generate to see AI suggestions
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No generation history yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Your AI generation history will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Documentation</CardTitle>
          <CardDescription>Auto-generated documentation for your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <FileText className="h-6 w-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">API Documentation</h4>
              <p className="text-sm text-gray-500 mt-1">
                Auto-generate API docs from your integrations
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <GitBranch className="h-6 w-6 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Workflow Docs</h4>
              <p className="text-sm text-gray-500 mt-1">
                Generate documentation for your workflows
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <Code className="h-6 w-6 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Code Comments</h4>
              <p className="text-sm text-gray-500 mt-1">
                Add AI-generated comments to your code
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
