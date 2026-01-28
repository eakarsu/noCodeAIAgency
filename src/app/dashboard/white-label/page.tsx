"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Palette,
  Globe,
  Mail,
  Upload,
  Check,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react"

interface BrandSettings {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logo: string | null
  favicon: string | null
  companyName: string | null
  supportEmail: string | null
  customCss: string | null
  emailHeaderLogo: string | null
  emailFooterText: string | null
  emailSignature: string | null
}

interface CustomDomain {
  id: string
  domain: string
  verified: boolean
  sslEnabled: boolean
}

export default function WhiteLabelPage() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    accentColor: "#8B5CF6",
    logo: null,
    favicon: null,
    companyName: null,
    supportEmail: null,
    customCss: null,
    emailHeaderLogo: null,
    emailFooterText: null,
    emailSignature: null,
  })
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isAddingDomain, setIsAddingDomain] = useState(false)

  useEffect(() => {
    fetchBrandSettings()
    fetchCustomDomains()
  }, [])

  const fetchBrandSettings = async () => {
    try {
      const response = await fetch("/api/brand-settings")
      const data = await response.json()
      if (data) {
        setBrandSettings(data)
      }
    } catch (error) {
      console.error("Error fetching brand settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomDomains = async () => {
    try {
      const response = await fetch("/api/custom-domains")
      const data = await response.json()
      if (data.data) {
        setDomains(data.data)
      }
    } catch (error) {
      console.error("Error fetching custom domains:", error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch("/api/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandSettings),
      })
    } catch (error) {
      console.error("Error saving brand settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain) return
    setIsAddingDomain(true)
    try {
      const response = await fetch("/api/custom-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      })
      if (response.ok) {
        setNewDomain("")
        fetchCustomDomains()
      } else {
        const data = await response.json()
        console.error("Error adding domain:", data.error)
      }
    } catch (error) {
      console.error("Error adding domain:", error)
    } finally {
      setIsAddingDomain(false)
    }
  }

  const handleRemoveDomain = async (id: string) => {
    if (!confirm("Are you sure you want to remove this domain?")) return
    try {
      const response = await fetch(`/api/custom-domains?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchCustomDomains()
      }
    } catch (error) {
      console.error("Error removing domain:", error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White Label</h1>
          <p className="text-gray-500">Customize your agency branding and client experience</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Check className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="domains">
            <Globe className="h-4 w-4 mr-2" />
            Custom Domains
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Email Branding
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          {/* Logo & Favicon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo & Favicon</CardTitle>
              <CardDescription>Upload your brand assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    {brandSettings.logo ? (
                      <img src={brandSettings.logo} alt="Logo" className="h-12 mx-auto" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Click to upload logo</p>
                        <p className="text-xs text-gray-400">SVG, PNG, or JPG (max 2MB)</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                    {brandSettings.favicon ? (
                      <img src={brandSettings.favicon} alt="Favicon" className="h-8 mx-auto" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Click to upload favicon</p>
                        <p className="text-xs text-gray-400">ICO or PNG (32x32px)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Colors</CardTitle>
              <CardDescription>Customize your color palette</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandSettings.primaryColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, primaryColor: e.target.value })
                      }
                      className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={brandSettings.primaryColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, primaryColor: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandSettings.secondaryColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, secondaryColor: e.target.value })
                      }
                      className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={brandSettings.secondaryColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, secondaryColor: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandSettings.accentColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, accentColor: e.target.value })
                      }
                      className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={brandSettings.accentColor}
                      onChange={(e) =>
                        setBrandSettings({ ...brandSettings, accentColor: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-3">Preview</p>
                <div className="flex gap-3">
                  <button
                    style={{ backgroundColor: brandSettings.primaryColor }}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  >
                    Primary Button
                  </button>
                  <button
                    style={{ backgroundColor: brandSettings.secondaryColor }}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  >
                    Secondary
                  </button>
                  <button
                    style={{ backgroundColor: brandSettings.accentColor }}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  >
                    Accent
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Information</CardTitle>
              <CardDescription>Basic company details for branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Company Name"
                placeholder="Your Company Name"
                value={brandSettings.companyName || ""}
                onChange={(e) =>
                  setBrandSettings({ ...brandSettings, companyName: e.target.value })
                }
              />
              <Input
                label="Support Email"
                type="email"
                placeholder="support@yourcompany.com"
                value={brandSettings.supportEmail || ""}
                onChange={(e) =>
                  setBrandSettings({ ...brandSettings, supportEmail: e.target.value })
                }
              />
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom CSS</CardTitle>
              <CardDescription>Add custom styles for advanced customization</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="/* Custom CSS */"
                value={brandSettings.customCss || ""}
                onChange={(e) =>
                  setBrandSettings({ ...brandSettings, customCss: e.target.value })
                }
                className="font-mono h-32"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Domains Tab */}
        <TabsContent value="domains" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Domains</CardTitle>
              <CardDescription>Configure custom domains for your client portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="portal.yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <Button onClick={handleAddDomain} isLoading={isAddingDomain}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </div>

              {domains.length > 0 ? (
                <div className="space-y-3">
                  {domains.map((domain) => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{domain.domain}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={domain.verified ? "success" : "warning"}>
                              {domain.verified ? "Verified" : "Pending"}
                            </Badge>
                            <Badge variant={domain.sslEnabled ? "success" : "secondary"}>
                              {domain.sslEnabled ? "SSL Enabled" : "No SSL"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDomain(domain.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No custom domains configured
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Branding Tab */}
        <TabsContent value="emails" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Templates</CardTitle>
              <CardDescription>Customize your branded email communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Header Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload header logo</p>
                </div>
              </div>
              <Textarea
                label="Email Footer Text"
                placeholder="© 2024 Your Company. All rights reserved."
                value={brandSettings.emailFooterText || ""}
                onChange={(e) =>
                  setBrandSettings({ ...brandSettings, emailFooterText: e.target.value })
                }
              />
              <Textarea
                label="Email Signature"
                placeholder="Best regards,\nThe Team"
                value={brandSettings.emailSignature || ""}
                onChange={(e) =>
                  setBrandSettings({ ...brandSettings, emailSignature: e.target.value })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>See how your branded emails will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div
                  className="p-4 text-center"
                  style={{ backgroundColor: brandSettings.primaryColor }}
                >
                  <span className="text-white font-bold text-lg">
                    {brandSettings.companyName || "Your Company"}
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-4">Hello [Client Name],</p>
                  <p className="text-gray-700 mb-4">
                    This is a preview of how your branded emails will appear to clients.
                  </p>
                  <p className="text-gray-700 whitespace-pre-line">
                    {brandSettings.emailSignature || "Best regards,\nThe Team"}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 text-center text-sm text-gray-500">
                  {brandSettings.emailFooterText ||
                    "© 2024 Your Company. All rights reserved."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
