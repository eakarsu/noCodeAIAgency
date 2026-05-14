import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'no-reply@example.com'
const APP_NAME = process.env.APP_NAME ?? 'NoCode AI Agency'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ id: string } | null> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('[Email] Send error:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[Email] Unexpected error:', err)
    return null
  }
}

// ── Pre-built email templates ─────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, agencyName: string) {
  return sendEmail({
    to,
    subject: `Welcome to ${APP_NAME}, ${name}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Welcome to ${APP_NAME}!</h1>
        <p>Hi ${name},</p>
        <p>Your agency <strong>${agencyName}</strong> is ready to go. You can now:</p>
        <ul>
          <li>Build automated workflows with our visual editor</li>
          <li>Leverage AI-powered suggestions</li>
          <li>Manage clients and deployments</li>
        </ul>
        <p>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/dashboard"
             style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white;
                    text-decoration: none; border-radius: 6px;">
            Go to Dashboard
          </a>
        </p>
        <p style="color: #6B7280; font-size: 14px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to ${APP_NAME}!\n\nHi ${name},\n\nYour agency "${agencyName}" is ready. Visit ${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/dashboard to get started.`,
  })
}

export async function sendWorkflowSuccessEmail(
  to: string,
  workflowName: string,
  instanceId: string,
  durationMs: number
) {
  return sendEmail({
    to,
    subject: `Workflow "${workflowName}" completed successfully`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Workflow Completed</h2>
        <p>Your workflow <strong>${workflowName}</strong> finished successfully.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; color: #6B7280;">Instance ID</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-family: monospace;">${instanceId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; color: #6B7280;">Duration</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">${(durationMs / 1000).toFixed(2)}s</td>
          </tr>
        </table>
      </div>
    `,
    text: `Workflow "${workflowName}" (instance ${instanceId}) completed in ${(durationMs / 1000).toFixed(2)}s.`,
  })
}

export async function sendWorkflowFailureEmail(
  to: string,
  workflowName: string,
  instanceId: string,
  errorMessage: string
) {
  return sendEmail({
    to,
    subject: `Workflow "${workflowName}" failed`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Workflow Failed</h2>
        <p>Your workflow <strong>${workflowName}</strong> encountered an error.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; color: #6B7280;">Instance ID</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-family: monospace;">${instanceId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; color: #6B7280;">Error</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB; color: #EF4444;">${errorMessage}</td>
          </tr>
        </table>
        <p>
          <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/dashboard"
             style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white;
                    text-decoration: none; border-radius: 6px;">
            View Dashboard
          </a>
        </p>
      </div>
    `,
    text: `Workflow "${workflowName}" (instance ${instanceId}) failed.\nError: ${errorMessage}`,
  })
}
