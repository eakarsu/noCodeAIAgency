import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting comprehensive seed...")

  // Create demo user and agency
  const hashedPassword = await bcrypt.hash("password123", 12)

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { password: hashedPassword },
    create: {
      email: "demo@example.com",
      password: hashedPassword,
      name: "Demo User",
      role: "AGENCY_OWNER",
    },
  })

  console.log("Created demo user:", demoUser.email)

  const demoAgency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      ownerId: demoUser.id,
      brandSettings: {
        create: {
          primaryColor: "#3B82F6",
          secondaryColor: "#10B981",
          accentColor: "#8B5CF6",
          companyName: "Demo Agency",
          supportEmail: "support@demo-agency.com",
        },
      },
    },
  })

  console.log("Created demo agency:", demoAgency.name)

  // ========================
  // TEMPLATES (18 items)
  // ========================
  const templates = [
    // Workflow Templates
    {
      name: "Customer Onboarding",
      description: "Complete customer onboarding workflow template with welcome emails and training",
      type: "WORKFLOW" as const,
      category: "Operations",
      industry: "SaaS",
      isBuiltIn: true,
      isPublic: true,
      content: { steps: ["Welcome email", "Account setup", "Training session", "Follow-up", "Feedback survey"] },
    },
    {
      name: "Lead Qualification",
      description: "Automated lead qualification and scoring workflow for B2B sales teams",
      type: "WORKFLOW" as const,
      category: "Sales",
      industry: "B2B",
      isBuiltIn: true,
      isPublic: true,
      content: { steps: ["Capture lead", "Enrich data", "Score lead", "Route to sales", "Follow-up sequence"] },
    },
    {
      name: "Support Ticket Routing",
      description: "Intelligent support ticket routing based on content analysis and priority",
      type: "WORKFLOW" as const,
      category: "Support",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { steps: ["Receive ticket", "Analyze content", "Assign priority", "Route to team", "Track SLA"] },
    },
    {
      name: "Invoice Processing",
      description: "Automated invoice processing workflow with approval routing",
      type: "WORKFLOW" as const,
      category: "Finance",
      industry: "Enterprise",
      isBuiltIn: true,
      isPublic: true,
      content: { steps: ["Receive invoice", "Extract data", "Validate", "Route for approval", "Process payment"] },
    },
    {
      name: "Employee Offboarding",
      description: "Comprehensive employee offboarding checklist and workflow",
      type: "WORKFLOW" as const,
      category: "HR",
      industry: "Enterprise",
      isBuiltIn: true,
      isPublic: true,
      content: { steps: ["Exit interview", "Equipment return", "Access revocation", "Final paycheck", "Documentation"] },
    },
    // Dashboard Templates
    {
      name: "E-commerce Dashboard",
      description: "Pre-built dashboard for e-commerce analytics with sales and inventory metrics",
      type: "DASHBOARD" as const,
      category: "Analytics",
      industry: "E-commerce",
      isBuiltIn: true,
      isPublic: true,
      content: { widgets: ["Sales chart", "Top products", "Customer map", "Recent orders", "Inventory alerts"] },
    },
    {
      name: "Marketing Analytics",
      description: "Marketing performance dashboard with campaign tracking and ROI metrics",
      type: "DASHBOARD" as const,
      category: "Marketing",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { widgets: ["Campaign performance", "Channel breakdown", "Conversion funnel", "ROI tracker", "Lead sources"] },
    },
    {
      name: "Sales Pipeline",
      description: "Sales pipeline dashboard with deal tracking and forecasting",
      type: "DASHBOARD" as const,
      category: "Sales",
      industry: "B2B",
      isBuiltIn: true,
      isPublic: true,
      content: { widgets: ["Pipeline value", "Deal stages", "Win rate", "Rep performance", "Forecast"] },
    },
    // Form Templates
    {
      name: "Contact Form",
      description: "Standard contact form with validation and spam protection",
      type: "FORM" as const,
      category: "Marketing",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { fields: ["name", "email", "phone", "company", "message"] },
    },
    {
      name: "Event Registration",
      description: "Event registration form with ticket selection and payment integration",
      type: "FORM" as const,
      category: "Events",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { fields: ["name", "email", "ticket_type", "dietary_requirements", "payment"] },
    },
    {
      name: "Job Application",
      description: "Job application form with resume upload and screening questions",
      type: "FORM" as const,
      category: "HR",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { fields: ["name", "email", "phone", "resume", "cover_letter", "experience", "availability"] },
    },
    {
      name: "Feedback Survey",
      description: "Customer feedback survey with NPS scoring and open-ended questions",
      type: "FORM" as const,
      category: "Customer Success",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { fields: ["nps_score", "satisfaction", "improvements", "testimonial", "follow_up"] },
    },
    // Industry Templates
    {
      name: "Healthcare Intake",
      description: "Patient intake form template for healthcare providers with HIPAA compliance",
      type: "INDUSTRY" as const,
      category: "Healthcare",
      industry: "Healthcare",
      isBuiltIn: true,
      isPublic: true,
      content: { sections: ["Personal info", "Medical history", "Insurance", "Consent", "Emergency contact"] },
    },
    {
      name: "Real Estate Listing",
      description: "Real estate property listing management with MLS integration",
      type: "INDUSTRY" as const,
      category: "Real Estate",
      industry: "Real Estate",
      isBuiltIn: true,
      isPublic: true,
      content: { sections: ["Property details", "Photos", "Pricing", "Agent info", "Open house schedule"] },
    },
    {
      name: "Restaurant Order System",
      description: "Restaurant ordering system with menu management and delivery tracking",
      type: "INDUSTRY" as const,
      category: "Food & Beverage",
      industry: "Restaurant",
      isBuiltIn: true,
      isPublic: true,
      content: { sections: ["Menu", "Cart", "Checkout", "Delivery tracking", "Reviews"] },
    },
    {
      name: "Fitness Booking",
      description: "Fitness class booking system with trainer schedules and memberships",
      type: "INDUSTRY" as const,
      category: "Health & Fitness",
      industry: "Fitness",
      isBuiltIn: true,
      isPublic: true,
      content: { sections: ["Class schedule", "Trainer profiles", "Booking", "Membership", "Progress tracking"] },
    },
    // Integration Templates
    {
      name: "CRM Integration",
      description: "Pre-configured CRM integration template with data mapping",
      type: "INTEGRATION" as const,
      category: "CRM",
      industry: "General",
      isBuiltIn: true,
      isPublic: true,
      content: { mappings: ["contacts", "deals", "activities", "notes"], providers: ["HubSpot", "Salesforce", "Pipedrive"] },
    },
    {
      name: "Payment Gateway",
      description: "Payment gateway integration template with subscription support",
      type: "INTEGRATION" as const,
      category: "Payments",
      industry: "E-commerce",
      isBuiltIn: true,
      isPublic: true,
      content: { features: ["One-time payments", "Subscriptions", "Refunds", "Webhooks"], providers: ["Stripe", "PayPal", "Square"] },
    },
  ]

  for (const template of templates) {
    await prisma.template.upsert({
      where: {
        id: `builtin-${template.name.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: template,
      create: {
        id: `builtin-${template.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...template,
        agencyId: demoAgency.id,
      },
    })
  }
  console.log(`Created ${templates.length} templates`)

  // ========================
  // CONNECTORS (16 items)
  // ========================
  const connectors = [
    {
      name: "Slack",
      provider: "slack",
      category: "Communication",
      description: "Send messages and notifications to Slack channels",
      authType: "oauth2",
      configSchema: { workspace: { type: "string", required: true }, channel: { type: "string", required: true } },
    },
    {
      name: "HubSpot",
      provider: "hubspot",
      category: "CRM",
      description: "Sync contacts and deals with HubSpot CRM",
      authType: "oauth2",
      configSchema: { portalId: { type: "string", required: true } },
    },
    {
      name: "Salesforce",
      provider: "salesforce",
      category: "CRM",
      description: "Enterprise CRM integration with Salesforce",
      authType: "oauth2",
      configSchema: { instanceUrl: { type: "string", required: true }, sandbox: { type: "boolean", default: false } },
    },
    {
      name: "Stripe",
      provider: "stripe",
      category: "Payment",
      description: "Process payments and manage subscriptions with Stripe",
      authType: "api_key",
      configSchema: { secretKey: { type: "string", required: true, secret: true }, webhookSecret: { type: "string", secret: true } },
    },
    {
      name: "PayPal",
      provider: "paypal",
      category: "Payment",
      description: "Accept PayPal payments and manage transactions",
      authType: "oauth2",
      configSchema: { clientId: { type: "string", required: true }, sandbox: { type: "boolean", default: false } },
    },
    {
      name: "OpenAI",
      provider: "openai",
      category: "AI",
      description: "Access GPT models for AI-powered features",
      authType: "api_key",
      configSchema: { apiKey: { type: "string", required: true, secret: true }, model: { type: "string", default: "gpt-4" } },
    },
    {
      name: "Claude (Anthropic)",
      provider: "anthropic",
      category: "AI",
      description: "Access Claude AI models for intelligent automation",
      authType: "api_key",
      configSchema: { apiKey: { type: "string", required: true, secret: true }, model: { type: "string", default: "claude-3-sonnet" } },
    },
    {
      name: "Twilio",
      provider: "twilio",
      category: "Communication",
      description: "Send SMS and voice notifications via Twilio",
      authType: "api_key",
      configSchema: { accountSid: { type: "string", required: true }, authToken: { type: "string", required: true, secret: true }, phoneNumber: { type: "string" } },
    },
    {
      name: "SendGrid",
      provider: "sendgrid",
      category: "Email",
      description: "Send transactional and marketing emails via SendGrid",
      authType: "api_key",
      configSchema: { apiKey: { type: "string", required: true, secret: true }, fromEmail: { type: "string" } },
    },
    {
      name: "Mailchimp",
      provider: "mailchimp",
      category: "Marketing",
      description: "Manage email campaigns and subscribers with Mailchimp",
      authType: "api_key",
      configSchema: { apiKey: { type: "string", required: true, secret: true }, server: { type: "string", required: true } },
    },
    {
      name: "Google Sheets",
      provider: "google-sheets",
      category: "Productivity",
      description: "Read and write data to Google Sheets spreadsheets",
      authType: "oauth2",
      configSchema: { spreadsheetId: { type: "string", required: true } },
    },
    {
      name: "Google Calendar",
      provider: "google-calendar",
      category: "Productivity",
      description: "Manage calendar events and scheduling with Google Calendar",
      authType: "oauth2",
      configSchema: { calendarId: { type: "string", default: "primary" } },
    },
    {
      name: "Airtable",
      provider: "airtable",
      category: "Database",
      description: "Sync data with Airtable bases and tables",
      authType: "api_key",
      configSchema: { apiKey: { type: "string", required: true, secret: true }, baseId: { type: "string", required: true } },
    },
    {
      name: "Notion",
      provider: "notion",
      category: "Productivity",
      description: "Integrate with Notion databases and pages",
      authType: "oauth2",
      configSchema: { integrationToken: { type: "string", required: true, secret: true } },
    },
    {
      name: "Zapier",
      provider: "zapier",
      category: "Automation",
      description: "Connect with 5000+ apps via Zapier webhooks",
      authType: "webhook",
      configSchema: { webhookUrl: { type: "string", required: true } },
    },
    {
      name: "AWS S3",
      provider: "aws-s3",
      category: "Storage",
      description: "Store and retrieve files from Amazon S3 buckets",
      authType: "api_key",
      configSchema: { accessKeyId: { type: "string", required: true }, secretAccessKey: { type: "string", required: true, secret: true }, region: { type: "string", required: true }, bucket: { type: "string", required: true } },
    },
  ]

  for (const connector of connectors) {
    await prisma.connectorDefinition.upsert({
      where: { provider: connector.provider },
      update: connector,
      create: connector,
    })
  }
  console.log(`Created ${connectors.length} connectors`)

  // ========================
  // CLIENTS (16 items)
  // ========================
  const clients = [
    { name: "Acme Corporation", email: "contact@acme.com", company: "Acme Corp", phone: "+1 (555) 123-4567", status: "ACTIVE" as const, plan: "professional", monthlyRate: 99 },
    { name: "TechStart Inc", email: "hello@techstart.io", company: "TechStart Inc", phone: "+1 (555) 234-5678", status: "ACTIVE" as const, plan: "enterprise", monthlyRate: 299 },
    { name: "Global Retail Co", email: "support@globalretail.com", company: "Global Retail", phone: "+1 (555) 345-6789", status: "ACTIVE" as const, plan: "professional", monthlyRate: 149 },
    { name: "HealthFirst Medical", email: "admin@healthfirst.org", company: "HealthFirst", phone: "+1 (555) 456-7890", status: "ACTIVE" as const, plan: "enterprise", monthlyRate: 399 },
    { name: "EduLearn Academy", email: "info@edulearn.edu", company: "EduLearn", phone: "+1 (555) 567-8901", status: "ACTIVE" as const, plan: "starter", monthlyRate: 49 },
    { name: "FinServe Partners", email: "contact@finserve.com", company: "FinServe Partners", phone: "+1 (555) 678-9012", status: "ACTIVE" as const, plan: "enterprise", monthlyRate: 499 },
    { name: "Creative Studios", email: "hello@creativestudios.co", company: "Creative Studios", phone: "+1 (555) 789-0123", status: "ACTIVE" as const, plan: "professional", monthlyRate: 99 },
    { name: "FoodDelivery Express", email: "ops@fooddelivery.com", company: "FoodDelivery Express", phone: "+1 (555) 890-1234", status: "ACTIVE" as const, plan: "professional", monthlyRate: 149 },
    { name: "RealEstate Pro", email: "agents@realestatepro.com", company: "RealEstate Pro", phone: "+1 (555) 901-2345", status: "ACTIVE" as const, plan: "starter", monthlyRate: 79 },
    { name: "FitLife Gyms", email: "membership@fitlifegyms.com", company: "FitLife Gyms", phone: "+1 (555) 012-3456", status: "ACTIVE" as const, plan: "professional", monthlyRate: 129 },
    { name: "LegalEase Firm", email: "reception@legalease.law", company: "LegalEase LLP", phone: "+1 (555) 111-2222", status: "ACTIVE" as const, plan: "enterprise", monthlyRate: 299 },
    { name: "AutoDeal Motors", email: "sales@autodealmotors.com", company: "AutoDeal Motors", phone: "+1 (555) 222-3333", status: "ACTIVE" as const, plan: "professional", monthlyRate: 149 },
    { name: "TravelBuddy Agency", email: "bookings@travelbuddy.com", company: "TravelBuddy", phone: "+1 (555) 333-4444", status: "ACTIVE" as const, plan: "starter", monthlyRate: 69 },
    { name: "PetCare Clinics", email: "appointments@petcare.vet", company: "PetCare Clinics", phone: "+1 (555) 444-5555", status: "ACTIVE" as const, plan: "professional", monthlyRate: 99 },
    { name: "CloudHost Services", email: "support@cloudhost.io", company: "CloudHost", phone: "+1 (555) 555-6666", status: "SUSPENDED" as const, plan: "enterprise", monthlyRate: 399 },
    { name: "MediaStream Network", email: "partners@mediastream.tv", company: "MediaStream", phone: "+1 (555) 666-7777", status: "ACTIVE" as const, plan: "enterprise", monthlyRate: 599 },
  ]

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    await prisma.client.upsert({
      where: { id: `demo-client-${i + 1}` },
      update: {},
      create: {
        id: `demo-client-${i + 1}`,
        agencyId: demoAgency.id,
        name: client.name,
        email: client.email,
        company: client.company,
        phone: client.phone,
        status: client.status,
        workspace: { create: { name: `${client.company} Workspace` } },
        billing: { create: { plan: client.plan, monthlyRate: client.monthlyRate, billingCycle: "monthly" } },
      },
    })
  }
  console.log(`Created ${clients.length} clients`)

  // ========================
  // WORKFLOWS (12 Advanced Examples)
  // ========================
  const workflows = [
    // 1. AI-Powered Customer Support Routing (Advanced - AI + Conditions + Actions)
    {
      name: "AI Customer Support Routing",
      description: "Uses AI to analyze support tickets, classify sentiment, and route to appropriate teams with priority scoring",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "New Support Ticket", config: { trigger: "webhook" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Analyze Sentiment", config: { ai_action: "sentiment" } } },
        { id: "ai-2", type: "ai", position: { x: 250, y: 250 }, data: { label: "Classify Category", config: { ai_action: "classify" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 350 }, data: { label: "Is Urgent?", config: { condition: "sentiment === 'negative' && priority > 7" } } },
        { id: "action-1", type: "action", position: { x: 100, y: 450 }, data: { label: "Alert Senior Agent", config: { action: "slack_message" } } },
        { id: "action-2", type: "action", position: { x: 400, y: 450 }, data: { label: "Add to Queue", config: { action: "create_record" } } },
        { id: "action-3", type: "action", position: { x: 250, y: 550 }, data: { label: "Send Auto-Reply", config: { action: "send_email" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 650 }, data: { label: "Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "ai-2" },
        { id: "e3", source: "ai-2", target: "condition-1" },
        { id: "e4", source: "condition-1", target: "action-1", sourceHandle: "true" },
        { id: "e5", source: "condition-1", target: "action-2", sourceHandle: "false" },
        { id: "e6", source: "action-1", target: "action-3" },
        { id: "e7", source: "action-2", target: "action-3" },
        { id: "e8", source: "action-3", target: "end-1" },
      ],
    },

    // 2. E-commerce Order Processing with Inventory Management
    {
      name: "E-commerce Order Pipeline",
      description: "Complete order processing with inventory check, payment validation, fulfillment, and customer notifications",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "New Order", config: { trigger: "webhook" } } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 150 }, data: { label: "Extract Order Data", config: { transform: "map" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 250 }, data: { label: "In Stock?", config: { condition: "inventory >= quantity" } } },
        { id: "action-1", type: "action", position: { x: 100, y: 350 }, data: { label: "Reserve Inventory", config: { action: "update_record" } } },
        { id: "action-2", type: "action", position: { x: 400, y: 350 }, data: { label: "Notify Out of Stock", config: { action: "send_email" } } },
        { id: "action-3", type: "action", position: { x: 100, y: 450 }, data: { label: "Process Payment", config: { action: "stripe_charge" } } },
        { id: "condition-2", type: "condition", position: { x: 100, y: 550 }, data: { label: "Payment Success?", config: { condition: "payment.status === 'succeeded'" } } },
        { id: "action-4", type: "action", position: { x: 0, y: 650 }, data: { label: "Create Shipment", config: { action: "http_request" } } },
        { id: "action-5", type: "action", position: { x: 200, y: 650 }, data: { label: "Refund & Cancel", config: { action: "stripe_charge" } } },
        { id: "action-6", type: "action", position: { x: 0, y: 750 }, data: { label: "Send Confirmation", config: { action: "send_email" } } },
        { id: "end-1", type: "end", position: { x: 100, y: 850 }, data: { label: "Order Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "transform-1" },
        { id: "e2", source: "transform-1", target: "condition-1" },
        { id: "e3", source: "condition-1", target: "action-1", sourceHandle: "true" },
        { id: "e4", source: "condition-1", target: "action-2", sourceHandle: "false" },
        { id: "e5", source: "action-1", target: "action-3" },
        { id: "e6", source: "action-3", target: "condition-2" },
        { id: "e7", source: "condition-2", target: "action-4", sourceHandle: "true" },
        { id: "e8", source: "condition-2", target: "action-5", sourceHandle: "false" },
        { id: "e9", source: "action-4", target: "action-6" },
        { id: "e10", source: "action-6", target: "end-1" },
      ],
    },

    // 3. Multi-Channel Lead Nurturing with AI Content Generation
    {
      name: "AI Lead Nurturing Campaign",
      description: "Intelligent lead nurturing with AI-generated personalized content across email, SMS, and Slack",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Lead Captured", config: { trigger: "form" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Analyze Lead Profile", config: { ai_action: "extract" } } },
        { id: "ai-2", type: "ai", position: { x: 250, y: 250 }, data: { label: "Generate Welcome Email", config: { ai_action: "generate_text" } } },
        { id: "action-1", type: "action", position: { x: 250, y: 350 }, data: { label: "Send Welcome Email", config: { action: "gmail_send" } } },
        { id: "delay-1", type: "delay", position: { x: 250, y: 450 }, data: { label: "Wait 2 Days", config: { duration: 2, unit: "days" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 550 }, data: { label: "Email Opened?", config: { condition: "email.opened === true" } } },
        { id: "ai-3", type: "ai", position: { x: 100, y: 650 }, data: { label: "Generate Follow-up", config: { ai_action: "generate_text" } } },
        { id: "action-2", type: "action", position: { x: 400, y: 650 }, data: { label: "Send SMS Reminder", config: { action: "twilio_sms" } } },
        { id: "action-3", type: "action", position: { x: 100, y: 750 }, data: { label: "Send Follow-up", config: { action: "send_email" } } },
        { id: "action-4", type: "action", position: { x: 250, y: 850 }, data: { label: "Notify Sales Team", config: { action: "slack_message" } } },
        { id: "action-5", type: "action", position: { x: 250, y: 950 }, data: { label: "Update CRM", config: { action: "hubspot_contact" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 1050 }, data: { label: "Nurture Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "ai-2" },
        { id: "e3", source: "ai-2", target: "action-1" },
        { id: "e4", source: "action-1", target: "delay-1" },
        { id: "e5", source: "delay-1", target: "condition-1" },
        { id: "e6", source: "condition-1", target: "ai-3", sourceHandle: "true" },
        { id: "e7", source: "condition-1", target: "action-2", sourceHandle: "false" },
        { id: "e8", source: "ai-3", target: "action-3" },
        { id: "e9", source: "action-3", target: "action-4" },
        { id: "e10", source: "action-2", target: "action-4" },
        { id: "e11", source: "action-4", target: "action-5" },
        { id: "e12", source: "action-5", target: "end-1" },
      ],
    },

    // 4. Content Moderation Pipeline with AI
    {
      name: "AI Content Moderation",
      description: "Automatically moderate user-generated content using AI classification and sentiment analysis",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Content Submitted", config: { trigger: "webhook" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Analyze Content", config: { ai_action: "classify" } } },
        { id: "ai-2", type: "ai", position: { x: 250, y: 250 }, data: { label: "Check Sentiment", config: { ai_action: "sentiment" } } },
        { id: "switch-1", type: "switch", position: { x: 250, y: 350 }, data: { label: "Content Rating", config: { field: "classification" } } },
        { id: "action-1", type: "action", position: { x: 50, y: 450 }, data: { label: "Auto-Approve", config: { action: "update_record" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 450 }, data: { label: "Flag for Review", config: { action: "create_record" } } },
        { id: "action-3", type: "action", position: { x: 450, y: 450 }, data: { label: "Auto-Reject", config: { action: "delete_record" } } },
        { id: "action-4", type: "action", position: { x: 250, y: 550 }, data: { label: "Notify Moderator", config: { action: "slack_message" } } },
        { id: "action-5", type: "action", position: { x: 450, y: 550 }, data: { label: "Warn User", config: { action: "send_email" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 650 }, data: { label: "Moderation Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "ai-2" },
        { id: "e3", source: "ai-2", target: "switch-1" },
        { id: "e4", source: "switch-1", target: "action-1" },
        { id: "e5", source: "switch-1", target: "action-2" },
        { id: "e6", source: "switch-1", target: "action-3" },
        { id: "e7", source: "action-2", target: "action-4" },
        { id: "e8", source: "action-3", target: "action-5" },
        { id: "e9", source: "action-1", target: "end-1" },
        { id: "e10", source: "action-4", target: "end-1" },
        { id: "e11", source: "action-5", target: "end-1" },
      ],
    },

    // 5. Scheduled Report Generation with Data Aggregation
    {
      name: "Automated Report Generator",
      description: "Daily automated report generation with data aggregation from multiple sources and email distribution",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Daily Schedule", config: { trigger: "schedule" } } },
        { id: "action-1", type: "action", position: { x: 100, y: 150 }, data: { label: "Fetch Sales Data", config: { action: "http_request" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 150 }, data: { label: "Fetch Analytics", config: { action: "http_request" } } },
        { id: "action-3", type: "action", position: { x: 400, y: 150 }, data: { label: "Fetch Support Tickets", config: { action: "http_request" } } },
        { id: "merge-1", type: "merge", position: { x: 250, y: 250 }, data: { label: "Merge Data" } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 350 }, data: { label: "Aggregate Metrics", config: { transform: "aggregate" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 450 }, data: { label: "Generate Summary", config: { ai_action: "summarize" } } },
        { id: "action-4", type: "action", position: { x: 250, y: 550 }, data: { label: "Create PDF Report", config: { action: "generate_pdf" } } },
        { id: "action-5", type: "action", position: { x: 250, y: 650 }, data: { label: "Upload to Drive", config: { action: "upload_file" } } },
        { id: "action-6", type: "action", position: { x: 100, y: 750 }, data: { label: "Email to Team", config: { action: "send_email" } } },
        { id: "action-7", type: "action", position: { x: 400, y: 750 }, data: { label: "Post to Slack", config: { action: "slack_message" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 850 }, data: { label: "Report Sent" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "trigger-1", target: "action-2" },
        { id: "e3", source: "trigger-1", target: "action-3" },
        { id: "e4", source: "action-1", target: "merge-1" },
        { id: "e5", source: "action-2", target: "merge-1" },
        { id: "e6", source: "action-3", target: "merge-1" },
        { id: "e7", source: "merge-1", target: "transform-1" },
        { id: "e8", source: "transform-1", target: "ai-1" },
        { id: "e9", source: "ai-1", target: "action-4" },
        { id: "e10", source: "action-4", target: "action-5" },
        { id: "e11", source: "action-5", target: "action-6" },
        { id: "e12", source: "action-5", target: "action-7" },
        { id: "e13", source: "action-6", target: "end-1" },
        { id: "e14", source: "action-7", target: "end-1" },
      ],
    },

    // 6. Customer Churn Prevention with Predictive Analysis
    {
      name: "Churn Prevention System",
      description: "Monitor customer engagement and trigger retention campaigns when churn risk is detected",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Weekly Schedule", config: { trigger: "schedule" } } },
        { id: "action-1", type: "action", position: { x: 250, y: 150 }, data: { label: "Fetch Customer Data", config: { action: "http_request" } } },
        { id: "loop-1", type: "loop", position: { x: 250, y: 250 }, data: { label: "For Each Customer", config: { iterations: "customers.length" } } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 350 }, data: { label: "Calculate Engagement Score", config: { transform: "map" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 450 }, data: { label: "High Churn Risk?", config: { condition: "score < 30" } } },
        { id: "ai-1", type: "ai", position: { x: 100, y: 550 }, data: { label: "Generate Personal Offer", config: { ai_action: "generate_text" } } },
        { id: "filter-1", type: "filter", position: { x: 400, y: 550 }, data: { label: "Skip Healthy Customers" } },
        { id: "action-2", type: "action", position: { x: 100, y: 650 }, data: { label: "Send Retention Email", config: { action: "send_email" } } },
        { id: "action-3", type: "action", position: { x: 100, y: 750 }, data: { label: "Create Task for CSM", config: { action: "create_record" } } },
        { id: "action-4", type: "action", position: { x: 100, y: 850 }, data: { label: "Log to Analytics", config: { action: "track_event" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 950 }, data: { label: "Prevention Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "action-1", target: "loop-1" },
        { id: "e3", source: "loop-1", target: "transform-1" },
        { id: "e4", source: "transform-1", target: "condition-1" },
        { id: "e5", source: "condition-1", target: "ai-1", sourceHandle: "true" },
        { id: "e6", source: "condition-1", target: "filter-1", sourceHandle: "false" },
        { id: "e7", source: "ai-1", target: "action-2" },
        { id: "e8", source: "action-2", target: "action-3" },
        { id: "e9", source: "action-3", target: "action-4" },
        { id: "e10", source: "action-4", target: "end-1" },
        { id: "e11", source: "filter-1", target: "end-1" },
      ],
    },

    // 7. Incident Response Automation
    {
      name: "Incident Response Workflow",
      description: "Automated incident detection, escalation, and resolution tracking with multi-team coordination",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Alert Received", config: { trigger: "webhook" } } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 150 }, data: { label: "Parse Alert Data", config: { transform: "json" } } },
        { id: "switch-1", type: "switch", position: { x: 250, y: 250 }, data: { label: "Severity Level", config: { field: "severity" } } },
        { id: "action-1", type: "action", position: { x: 50, y: 350 }, data: { label: "Page On-Call", config: { action: "twilio_sms" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 350 }, data: { label: "Notify Team", config: { action: "slack_message" } } },
        { id: "action-3", type: "action", position: { x: 450, y: 350 }, data: { label: "Log Incident", config: { action: "create_record" } } },
        { id: "action-4", type: "action", position: { x: 50, y: 450 }, data: { label: "Create War Room", config: { action: "slack_message" } } },
        { id: "action-5", type: "action", position: { x: 250, y: 450 }, data: { label: "Create Ticket", config: { action: "zendesk_ticket" } } },
        { id: "delay-1", type: "delay", position: { x: 150, y: 550 }, data: { label: "Wait 15 Minutes", config: { duration: 15, unit: "minutes" } } },
        { id: "condition-1", type: "condition", position: { x: 150, y: 650 }, data: { label: "Resolved?", config: { condition: "status === 'resolved'" } } },
        { id: "action-6", type: "action", position: { x: 50, y: 750 }, data: { label: "Escalate", config: { action: "slack_message" } } },
        { id: "action-7", type: "action", position: { x: 250, y: 750 }, data: { label: "Send Resolution Report", config: { action: "send_email" } } },
        { id: "end-1", type: "end", position: { x: 150, y: 850 }, data: { label: "Incident Handled" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "transform-1" },
        { id: "e2", source: "transform-1", target: "switch-1" },
        { id: "e3", source: "switch-1", target: "action-1" },
        { id: "e4", source: "switch-1", target: "action-2" },
        { id: "e5", source: "switch-1", target: "action-3" },
        { id: "e6", source: "action-1", target: "action-4" },
        { id: "e7", source: "action-2", target: "action-5" },
        { id: "e8", source: "action-4", target: "delay-1" },
        { id: "e9", source: "action-5", target: "delay-1" },
        { id: "e10", source: "delay-1", target: "condition-1" },
        { id: "e11", source: "condition-1", target: "action-6", sourceHandle: "false" },
        { id: "e12", source: "condition-1", target: "action-7", sourceHandle: "true" },
        { id: "e13", source: "action-6", target: "delay-1" },
        { id: "e14", source: "action-7", target: "end-1" },
        { id: "e15", source: "action-3", target: "end-1" },
      ],
    },

    // 8. Invoice Processing with OCR and Approval Workflow
    {
      name: "Smart Invoice Processing",
      description: "AI-powered invoice processing with OCR extraction, validation, approval routing, and payment",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Invoice Received", config: { trigger: "email" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Extract Invoice Data", config: { ai_action: "extract" } } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 250 }, data: { label: "Validate Data", config: { transform: "map" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 350 }, data: { label: "Valid Invoice?", config: { condition: "isValid === true" } } },
        { id: "action-1", type: "action", position: { x: 400, y: 450 }, data: { label: "Request Correction", config: { action: "send_email" } } },
        { id: "action-2", type: "action", position: { x: 100, y: 450 }, data: { label: "Save to System", config: { action: "create_record" } } },
        { id: "condition-2", type: "condition", position: { x: 100, y: 550 }, data: { label: "Amount > $5000?", config: { condition: "amount > 5000" } } },
        { id: "action-3", type: "action", position: { x: 0, y: 650 }, data: { label: "Request Manager Approval", config: { action: "slack_message" } } },
        { id: "action-4", type: "action", position: { x: 200, y: 650 }, data: { label: "Auto-Approve", config: { action: "update_record" } } },
        { id: "wait-1", type: "wait", position: { x: 0, y: 750 }, data: { label: "Wait for Approval", config: { event: "approval.received" } } },
        { id: "condition-3", type: "condition", position: { x: 0, y: 850 }, data: { label: "Approved?", config: { condition: "approved === true" } } },
        { id: "action-5", type: "action", position: { x: 100, y: 950 }, data: { label: "Schedule Payment", config: { action: "stripe_charge" } } },
        { id: "action-6", type: "action", position: { x: 100, y: 1050 }, data: { label: "Update Spreadsheet", config: { action: "sheets_add_row" } } },
        { id: "end-1", type: "end", position: { x: 100, y: 1150 }, data: { label: "Invoice Processed" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "transform-1" },
        { id: "e3", source: "transform-1", target: "condition-1" },
        { id: "e4", source: "condition-1", target: "action-2", sourceHandle: "true" },
        { id: "e5", source: "condition-1", target: "action-1", sourceHandle: "false" },
        { id: "e6", source: "action-2", target: "condition-2" },
        { id: "e7", source: "condition-2", target: "action-3", sourceHandle: "true" },
        { id: "e8", source: "condition-2", target: "action-4", sourceHandle: "false" },
        { id: "e9", source: "action-3", target: "wait-1" },
        { id: "e10", source: "wait-1", target: "condition-3" },
        { id: "e11", source: "condition-3", target: "action-5", sourceHandle: "true" },
        { id: "e12", source: "action-4", target: "action-5" },
        { id: "e13", source: "action-5", target: "action-6" },
        { id: "e14", source: "action-6", target: "end-1" },
      ],
    },

    // 9. Social Media Content Pipeline
    {
      name: "Social Media Automation",
      description: "AI-generated social media content with scheduling, multi-platform posting, and engagement tracking",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Blog Post Published", config: { trigger: "webhook" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Summarize Content", config: { ai_action: "summarize" } } },
        { id: "ai-2", type: "ai", position: { x: 100, y: 250 }, data: { label: "Generate Twitter Post", config: { ai_action: "generate_text" } } },
        { id: "ai-3", type: "ai", position: { x: 250, y: 250 }, data: { label: "Generate LinkedIn Post", config: { ai_action: "generate_text" } } },
        { id: "ai-4", type: "ai", position: { x: 400, y: 250 }, data: { label: "Generate Image Prompt", config: { ai_action: "generate_text" } } },
        { id: "ai-5", type: "ai", position: { x: 400, y: 350 }, data: { label: "Generate Image", config: { ai_action: "image" } } },
        { id: "action-1", type: "action", position: { x: 100, y: 450 }, data: { label: "Post to Twitter", config: { action: "http_request" } } },
        { id: "delay-1", type: "delay", position: { x: 250, y: 350 }, data: { label: "Wait 2 Hours", config: { duration: 2, unit: "hours" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 450 }, data: { label: "Post to LinkedIn", config: { action: "http_request" } } },
        { id: "action-3", type: "action", position: { x: 400, y: 450 }, data: { label: "Upload Image", config: { action: "upload_file" } } },
        { id: "action-4", type: "action", position: { x: 250, y: 550 }, data: { label: "Log to Sheets", config: { action: "sheets_add_row" } } },
        { id: "action-5", type: "action", position: { x: 250, y: 650 }, data: { label: "Notify Marketing", config: { action: "slack_message" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 750 }, data: { label: "Content Published" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "ai-2" },
        { id: "e3", source: "ai-1", target: "ai-3" },
        { id: "e4", source: "ai-1", target: "ai-4" },
        { id: "e5", source: "ai-4", target: "ai-5" },
        { id: "e6", source: "ai-2", target: "action-1" },
        { id: "e7", source: "ai-3", target: "delay-1" },
        { id: "e8", source: "delay-1", target: "action-2" },
        { id: "e9", source: "ai-5", target: "action-3" },
        { id: "e10", source: "action-1", target: "action-4" },
        { id: "e11", source: "action-2", target: "action-4" },
        { id: "e12", source: "action-3", target: "action-4" },
        { id: "e13", source: "action-4", target: "action-5" },
        { id: "e14", source: "action-5", target: "end-1" },
      ],
    },

    // 10. Employee Onboarding Automation
    {
      name: "Employee Onboarding",
      description: "Complete employee onboarding with account provisioning, training assignments, and check-ins",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "New Employee Added", config: { trigger: "database" } } },
        { id: "split-1", type: "split", position: { x: 250, y: 150 }, data: { label: "Parallel Setup" } },
        { id: "action-1", type: "action", position: { x: 50, y: 250 }, data: { label: "Create Email Account", config: { action: "http_request" } } },
        { id: "action-2", type: "action", position: { x: 200, y: 250 }, data: { label: "Create Slack Account", config: { action: "slack_message" } } },
        { id: "action-3", type: "action", position: { x: 350, y: 250 }, data: { label: "Provision Access", config: { action: "http_request" } } },
        { id: "action-4", type: "action", position: { x: 500, y: 250 }, data: { label: "Order Equipment", config: { action: "create_record" } } },
        { id: "merge-1", type: "merge", position: { x: 250, y: 350 }, data: { label: "Wait for All" } },
        { id: "action-5", type: "action", position: { x: 250, y: 450 }, data: { label: "Send Welcome Email", config: { action: "send_email" } } },
        { id: "action-6", type: "action", position: { x: 250, y: 550 }, data: { label: "Assign Training", config: { action: "create_record" } } },
        { id: "action-7", type: "action", position: { x: 250, y: 650 }, data: { label: "Schedule 1:1 with Manager", config: { action: "http_request" } } },
        { id: "delay-1", type: "delay", position: { x: 250, y: 750 }, data: { label: "Wait 1 Week", config: { duration: 7, unit: "days" } } },
        { id: "action-8", type: "action", position: { x: 250, y: 850 }, data: { label: "Send Check-in Survey", config: { action: "send_email" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 950 }, data: { label: "Onboarding Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "split-1" },
        { id: "e2", source: "split-1", target: "action-1" },
        { id: "e3", source: "split-1", target: "action-2" },
        { id: "e4", source: "split-1", target: "action-3" },
        { id: "e5", source: "split-1", target: "action-4" },
        { id: "e6", source: "action-1", target: "merge-1" },
        { id: "e7", source: "action-2", target: "merge-1" },
        { id: "e8", source: "action-3", target: "merge-1" },
        { id: "e9", source: "action-4", target: "merge-1" },
        { id: "e10", source: "merge-1", target: "action-5" },
        { id: "e11", source: "action-5", target: "action-6" },
        { id: "e12", source: "action-6", target: "action-7" },
        { id: "e13", source: "action-7", target: "delay-1" },
        { id: "e14", source: "delay-1", target: "action-8" },
        { id: "e15", source: "action-8", target: "end-1" },
      ],
    },

    // 11. Data Pipeline with Transformation and Validation
    {
      name: "Data Integration Pipeline",
      description: "ETL workflow that extracts data from multiple sources, transforms, validates, and loads to destination",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Hourly Schedule", config: { trigger: "schedule" } } },
        { id: "action-1", type: "action", position: { x: 100, y: 150 }, data: { label: "Fetch from API", config: { action: "http_request" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 150 }, data: { label: "Query Database", config: { action: "http_request" } } },
        { id: "action-3", type: "action", position: { x: 400, y: 150 }, data: { label: "Read from S3", config: { action: "http_request" } } },
        { id: "merge-1", type: "merge", position: { x: 250, y: 250 }, data: { label: "Combine Data" } },
        { id: "transform-1", type: "transform", position: { x: 250, y: 350 }, data: { label: "Clean & Normalize", config: { transform: "map" } } },
        { id: "filter-1", type: "filter", position: { x: 250, y: 450 }, data: { label: "Remove Duplicates" } },
        { id: "transform-2", type: "transform", position: { x: 250, y: 550 }, data: { label: "Validate Schema", config: { transform: "json" } } },
        { id: "condition-1", type: "condition", position: { x: 250, y: 650 }, data: { label: "Valid Data?", config: { condition: "errors.length === 0" } } },
        { id: "action-4", type: "action", position: { x: 400, y: 750 }, data: { label: "Log Errors", config: { action: "create_record" } } },
        { id: "action-5", type: "action", position: { x: 100, y: 750 }, data: { label: "Load to Warehouse", config: { action: "http_request" } } },
        { id: "action-6", type: "action", position: { x: 100, y: 850 }, data: { label: "Update Dashboard", config: { action: "http_request" } } },
        { id: "action-7", type: "action", position: { x: 250, y: 950 }, data: { label: "Send Completion Notice", config: { action: "slack_message" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 1050 }, data: { label: "Pipeline Complete" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "action-1" },
        { id: "e2", source: "trigger-1", target: "action-2" },
        { id: "e3", source: "trigger-1", target: "action-3" },
        { id: "e4", source: "action-1", target: "merge-1" },
        { id: "e5", source: "action-2", target: "merge-1" },
        { id: "e6", source: "action-3", target: "merge-1" },
        { id: "e7", source: "merge-1", target: "transform-1" },
        { id: "e8", source: "transform-1", target: "filter-1" },
        { id: "e9", source: "filter-1", target: "transform-2" },
        { id: "e10", source: "transform-2", target: "condition-1" },
        { id: "e11", source: "condition-1", target: "action-5", sourceHandle: "true" },
        { id: "e12", source: "condition-1", target: "action-4", sourceHandle: "false" },
        { id: "e13", source: "action-5", target: "action-6" },
        { id: "e14", source: "action-6", target: "action-7" },
        { id: "e15", source: "action-4", target: "action-7" },
        { id: "e16", source: "action-7", target: "end-1" },
      ],
    },

    // 12. Customer Feedback Analysis and Response
    {
      name: "Feedback Analysis & Response",
      description: "Analyze customer feedback with AI, categorize, and trigger appropriate responses based on sentiment",
      status: "ACTIVE" as const,
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Feedback Received", config: { trigger: "form" } } },
        { id: "ai-1", type: "ai", position: { x: 250, y: 150 }, data: { label: "Analyze Sentiment", config: { ai_action: "sentiment" } } },
        { id: "ai-2", type: "ai", position: { x: 250, y: 250 }, data: { label: "Extract Key Topics", config: { ai_action: "extract" } } },
        { id: "action-1", type: "action", position: { x: 250, y: 350 }, data: { label: "Save to Database", config: { action: "create_record" } } },
        { id: "switch-1", type: "switch", position: { x: 250, y: 450 }, data: { label: "Sentiment Score", config: { field: "sentiment" } } },
        { id: "ai-3", type: "ai", position: { x: 50, y: 550 }, data: { label: "Generate Apology", config: { ai_action: "generate_text" } } },
        { id: "action-2", type: "action", position: { x: 250, y: 550 }, data: { label: "Send Thank You", config: { action: "send_email" } } },
        { id: "action-3", type: "action", position: { x: 450, y: 550 }, data: { label: "Request Testimonial", config: { action: "send_email" } } },
        { id: "action-4", type: "action", position: { x: 50, y: 650 }, data: { label: "Send Apology Email", config: { action: "send_email" } } },
        { id: "action-5", type: "action", position: { x: 50, y: 750 }, data: { label: "Create Support Ticket", config: { action: "zendesk_ticket" } } },
        { id: "action-6", type: "action", position: { x: 50, y: 850 }, data: { label: "Alert Manager", config: { action: "slack_message" } } },
        { id: "action-7", type: "action", position: { x: 250, y: 750 }, data: { label: "Update CRM", config: { action: "salesforce_create" } } },
        { id: "action-8", type: "action", position: { x: 250, y: 850 }, data: { label: "Log Analytics", config: { action: "track_event" } } },
        { id: "end-1", type: "end", position: { x: 250, y: 950 }, data: { label: "Feedback Processed" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "ai-1" },
        { id: "e2", source: "ai-1", target: "ai-2" },
        { id: "e3", source: "ai-2", target: "action-1" },
        { id: "e4", source: "action-1", target: "switch-1" },
        { id: "e5", source: "switch-1", target: "ai-3" },
        { id: "e6", source: "switch-1", target: "action-2" },
        { id: "e7", source: "switch-1", target: "action-3" },
        { id: "e8", source: "ai-3", target: "action-4" },
        { id: "e9", source: "action-4", target: "action-5" },
        { id: "e10", source: "action-5", target: "action-6" },
        { id: "e11", source: "action-6", target: "action-7" },
        { id: "e12", source: "action-2", target: "action-7" },
        { id: "e13", source: "action-3", target: "action-7" },
        { id: "e14", source: "action-7", target: "action-8" },
        { id: "e15", source: "action-8", target: "end-1" },
      ],
    },
  ]

  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i]
    await prisma.workflow.upsert({
      where: { id: `demo-workflow-${i + 1}` },
      update: {},
      create: {
        id: `demo-workflow-${i + 1}`,
        agencyId: demoAgency.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
    })
  }
  console.log(`Created ${workflows.length} workflows`)

  // ========================
  // SUPPORT TICKETS (16 items)
  // ========================
  const tickets = [
    { subject: "Cannot log into dashboard", description: "I'm getting an error when trying to log in", priority: "HIGH" as const, status: "OPEN" as const, clientId: "demo-client-1" },
    { subject: "Integration not syncing", description: "HubSpot integration stopped syncing yesterday", priority: "HIGH" as const, status: "IN_PROGRESS" as const, clientId: "demo-client-2" },
    { subject: "How to set up webhooks?", description: "Need help configuring webhooks for my workflow", priority: "MEDIUM" as const, status: "OPEN" as const, clientId: "demo-client-3" },
    { subject: "Billing question", description: "I was charged twice this month", priority: "HIGH" as const, status: "RESOLVED" as const, clientId: "demo-client-4" },
    { subject: "Feature request: Dark mode", description: "Would love to have a dark mode option", priority: "LOW" as const, status: "OPEN" as const, clientId: "demo-client-5" },
    { subject: "Workflow not triggering", description: "My automated workflow isn't running", priority: "HIGH" as const, status: "IN_PROGRESS" as const, clientId: "demo-client-6" },
    { subject: "API rate limit exceeded", description: "Getting rate limit errors on API calls", priority: "MEDIUM" as const, status: "OPEN" as const, clientId: "demo-client-7" },
    { subject: "Data export not working", description: "Cannot export data to CSV", priority: "MEDIUM" as const, status: "RESOLVED" as const, clientId: "demo-client-8" },
    { subject: "Custom domain setup help", description: "Need assistance setting up custom domain", priority: "LOW" as const, status: "OPEN" as const, clientId: "demo-client-9" },
    { subject: "Email deliverability issues", description: "Emails going to spam folder", priority: "HIGH" as const, status: "IN_PROGRESS" as const, clientId: "demo-client-10" },
    { subject: "Mobile app feature request", description: "Would like a mobile app version", priority: "LOW" as const, status: "CLOSED" as const, clientId: "demo-client-11" },
    { subject: "Dashboard loading slowly", description: "Dashboard takes too long to load", priority: "MEDIUM" as const, status: "OPEN" as const, clientId: "demo-client-12" },
    { subject: "SSO configuration", description: "Help with SAML SSO setup", priority: "MEDIUM" as const, status: "IN_PROGRESS" as const, clientId: "demo-client-13" },
    { subject: "Report scheduling not working", description: "Scheduled reports aren't being sent", priority: "HIGH" as const, status: "OPEN" as const, clientId: "demo-client-14" },
    { subject: "Team member permissions", description: "Cannot assign proper permissions to team", priority: "MEDIUM" as const, status: "RESOLVED" as const, clientId: "demo-client-1" },
    { subject: "Upgrade plan question", description: "Want to understand enterprise features", priority: "LOW" as const, status: "OPEN" as const, clientId: "demo-client-2" },
  ]

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    await prisma.supportTicket.upsert({
      where: { id: `demo-ticket-${i + 1}` },
      update: {},
      create: {
        id: `demo-ticket-${i + 1}`,
        clientId: ticket.clientId,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
      },
    })
  }
  console.log(`Created ${tickets.length} support tickets`)

  // ========================
  // WEBHOOKS (16 items)
  // ========================
  const webhooks = [
    { name: "New User Webhook", url: "https://api.example.com/webhooks/user-created", events: ["user.created"], isActive: true },
    { name: "Order Notifications", url: "https://api.example.com/webhooks/orders", events: ["order.created", "order.updated", "order.completed"], isActive: true },
    { name: "Payment Events", url: "https://payments.example.com/webhook", events: ["payment.succeeded", "payment.failed"], isActive: true },
    { name: "Slack Notifications", url: "https://hooks.slack.com/services/xxx", events: ["ticket.created", "ticket.escalated"], isActive: true },
    { name: "CRM Sync", url: "https://crm.example.com/api/webhook", events: ["contact.created", "contact.updated", "deal.won"], isActive: true },
    { name: "Analytics Tracker", url: "https://analytics.example.com/track", events: ["page.viewed", "event.tracked"], isActive: false },
    { name: "Inventory Updates", url: "https://inventory.example.com/webhook", events: ["product.stock_low", "product.out_of_stock"], isActive: true },
    { name: "Email Events", url: "https://email.example.com/webhook", events: ["email.sent", "email.opened", "email.clicked"], isActive: true },
    { name: "Subscription Webhook", url: "https://billing.example.com/webhook", events: ["subscription.created", "subscription.cancelled", "subscription.renewed"], isActive: true },
    { name: "Form Submissions", url: "https://forms.example.com/webhook", events: ["form.submitted"], isActive: true },
    { name: "Support Alerts", url: "https://support.example.com/webhook", events: ["ticket.created", "ticket.resolved"], isActive: true },
    { name: "Marketing Events", url: "https://marketing.example.com/webhook", events: ["campaign.sent", "campaign.opened"], isActive: false },
    { name: "Lead Scoring", url: "https://leads.example.com/webhook", events: ["lead.score_changed", "lead.qualified"], isActive: true },
    { name: "Document Events", url: "https://docs.example.com/webhook", events: ["document.created", "document.signed"], isActive: true },
    { name: "Appointment Sync", url: "https://calendar.example.com/webhook", events: ["appointment.created", "appointment.cancelled"], isActive: true },
    { name: "Debug Webhook", url: "https://webhook.site/xxx", events: ["*"], isActive: false },
  ]

  for (let i = 0; i < webhooks.length; i++) {
    const webhook = webhooks[i]
    await prisma.webhook.upsert({
      where: { id: `demo-webhook-${i + 1}` },
      update: {},
      create: {
        id: `demo-webhook-${i + 1}`,
        agencyId: demoAgency.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      },
    })
  }
  console.log(`Created ${webhooks.length} webhooks`)

  // ========================
  // DEPLOYMENTS (16 items)
  // ========================
  const deployments = [
    { name: "Dashboard Widgets Release", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.2.0" },
    { name: "Workflow Engine Beta", environment: "STAGING" as const, status: "DEPLOYED" as const, version: "1.3.0-beta" },
    { name: "Bug Fixes Release", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.1.5" },
    { name: "Login Hotfix", environment: "PRODUCTION" as const, status: "ROLLED_BACK" as const, version: "1.1.4" },
    { name: "Integration RC", environment: "STAGING" as const, status: "DEPLOYED" as const, version: "1.2.1-rc1" },
    { name: "Security Patches", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.1.3" },
    { name: "Beta Build", environment: "STAGING" as const, status: "FAILED" as const, version: "1.2.0-beta" },
    { name: "Export Feature", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.1.2" },
    { name: "Email Fixes", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.1.1" },
    { name: "Dev Build", environment: "STAGING" as const, status: "DEPLOYED" as const, version: "1.1.9-dev" },
    { name: "API Endpoints Release", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.1.0" },
    { name: "Alpha Features", environment: "STAGING" as const, status: "PENDING" as const, version: "1.3.1-alpha" },
    { name: "Performance Optimization", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.0.9" },
    { name: "UI Improvements", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.0.8" },
    { name: "Webhook Beta", environment: "STAGING" as const, status: "DEPLOYING" as const, version: "1.0.10-beta" },
    { name: "Initial Release", environment: "PRODUCTION" as const, status: "DEPLOYED" as const, version: "1.0.7" },
  ]

  for (let i = 0; i < deployments.length; i++) {
    const deployment = deployments[i]
    await prisma.deployment.upsert({
      where: { id: `demo-deployment-${i + 1}` },
      update: {},
      create: {
        id: `demo-deployment-${i + 1}`,
        agencyId: demoAgency.id,
        name: deployment.name,
        environment: deployment.environment,
        status: deployment.status,
        version: deployment.version,
        createdAt: new Date(Date.now() - i * 86400000), // Stagger by days
      },
    })
  }
  console.log(`Created ${deployments.length} deployments`)

  // ========================
  // INTEGRATIONS (16 items)
  // ========================
  const integrations = [
    { name: "HubSpot CRM", provider: "hubspot", type: "SAAS" as const, status: "ACTIVE" as const, config: { portalId: "12345678" } },
    { name: "Slack Workspace", provider: "slack", type: "SAAS" as const, status: "ACTIVE" as const, config: { workspace: "demo-team", channel: "general" } },
    { name: "Stripe Payments", provider: "stripe", type: "PAYMENT" as const, status: "ACTIVE" as const, config: { mode: "live" } },
    { name: "OpenAI GPT", provider: "openai", type: "AI_MODEL" as const, status: "ACTIVE" as const, config: { model: "gpt-4", maxTokens: 2000 } },
    { name: "Twilio SMS", provider: "twilio", type: "SAAS" as const, status: "ACTIVE" as const, config: { phoneNumber: "+15551234567" } },
    { name: "SendGrid Email", provider: "sendgrid", type: "SAAS" as const, status: "ACTIVE" as const, config: { fromEmail: "noreply@demo.com" } },
    { name: "Google Sheets", provider: "google-sheets", type: "SAAS" as const, status: "ACTIVE" as const, config: { spreadsheetId: "abc123" } },
    { name: "Salesforce", provider: "salesforce", type: "SAAS" as const, status: "INACTIVE" as const, config: { instanceUrl: "https://demo.salesforce.com", sandbox: false } },
    { name: "Mailchimp Marketing", provider: "mailchimp", type: "SAAS" as const, status: "ACTIVE" as const, config: { server: "us1" } },
    { name: "Airtable Base", provider: "airtable", type: "SAAS" as const, status: "ACTIVE" as const, config: { baseId: "appXXXXXXXXXXXX" } },
    { name: "Google Calendar", provider: "google-calendar", type: "SAAS" as const, status: "ACTIVE" as const, config: { calendarId: "primary" } },
    { name: "Notion Workspace", provider: "notion", type: "SAAS" as const, status: "INACTIVE" as const, config: {} },
    { name: "AWS S3 Storage", provider: "aws-s3", type: "HOSTING" as const, status: "ACTIVE" as const, config: { bucket: "demo-uploads", region: "us-east-1" } },
    { name: "PayPal Business", provider: "paypal", type: "PAYMENT" as const, status: "INACTIVE" as const, config: { sandbox: true } },
    { name: "Zapier Integration", provider: "zapier", type: "CUSTOM" as const, status: "ACTIVE" as const, config: { webhookUrl: "https://hooks.zapier.com/xxx" } },
    { name: "Claude AI", provider: "anthropic", type: "AI_MODEL" as const, status: "ACTIVE" as const, config: { model: "claude-3-sonnet" } },
  ]

  for (let i = 0; i < integrations.length; i++) {
    const integration = integrations[i]
    await prisma.integration.upsert({
      where: { id: `demo-integration-${i + 1}` },
      update: {},
      create: {
        id: `demo-integration-${i + 1}`,
        agencyId: demoAgency.id,
        name: integration.name,
        provider: integration.provider,
        type: integration.type,
        status: integration.status,
        config: integration.config,
        credentials: { encrypted: true },
      },
    })
  }
  console.log(`Created ${integrations.length} integrations`)

  console.log("\nSeed completed successfully!")
  console.log("\n--- Demo Credentials ---")
  console.log("Email: demo@example.com")
  console.log("Password: password123")
  console.log("------------------------\n")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
