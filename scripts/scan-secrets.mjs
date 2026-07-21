import { readFileSync, readdirSync } from "node:fs"
import { extname, join, relative } from "node:path"

const root = new URL("../", import.meta.url).pathname
const excludedDirectories = new Set([".git", ".next", "node_modules", "coverage", "dist", "build"])
const textExtensions = new Set(["", ".css", ".env", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".prisma", ".sh", ".sql", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml"])
const signatures = [
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/],
  ["OpenAI-style key", /\bsk-(?!or-v1-replace)[A-Za-z0-9_-]{32,}\b/],
  ["assigned provider secret", /\b(?:OPENROUTER_API_KEY|STRIPE_SECRET_KEY|NEXTAUTH_SECRET)\s*=\s*["'](?!replace|test-|a-valid-|\$\{)[A-Za-z0-9_./:+-]{24,}["']/i],
]

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return files(path)
    if (!entry.isFile() || !textExtensions.has(extname(entry.name))) return []
    return [path]
  })
}

const findings = []
for (const path of files(root)) {
  const content = readFileSync(path, "utf8")
  for (const [label, signature] of signatures) if (signature.test(content)) findings.push(`${relative(root, path)}: ${label}`)
}
if (findings.length) {
  console.error(`Secret scan failed:\n${findings.join("\n")}`)
  process.exit(1)
}
console.log("Current-tree secret scan passed.")
