import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'
import { spawn, type ChildProcess } from 'child_process'
import { writeFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export class CodeExecutor implements NodeExecutor {
  type = 'code'

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const start = Date.now()
    const config = node.data.config as Record<string, unknown>
    const code = config.code as string || ''
    const language = (config.language as string) || 'javascript'
    const timeout = Math.min((config.timeout as number) || 5000, 10000) // Max 10s

    if (!code.trim()) {
      return {
        success: false,
        output: {},
        error: 'No code provided',
        duration: Date.now() - start,
      }
    }

    if (language !== 'javascript') {
      return {
        success: false,
        output: {},
        error: `Language "${language}" is not supported. Only "javascript" is available.`,
        duration: Date.now() - start,
      }
    }

    try {
      const result = await this.executeInSubprocess(code, context, timeout)
      return {
        success: true,
        output: typeof result === 'object' && result !== null
          ? result as Record<string, unknown>
          : { result },
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Code execution failed',
        duration: Date.now() - start,
      }
    }
  }

  private async executeInSubprocess(
    code: string,
    context: ExecutionContext,
    timeout: number
  ): Promise<unknown> {
    const inputs = {
      trigger: context.triggerData,
      variables: context.variables,
      nodes: context.nodeOutputs,
    }

    // Wrap user code in a sandboxed script that emits a JSON result to stdout
    const wrappedCode = `
'use strict';

const inputs = ${JSON.stringify(inputs)};
const trigger = inputs.trigger;
const variables = inputs.variables;
const nodes = inputs.nodes;

let __result;
try {
  __result = (function() {
    ${code}
  })();
} catch (err) {
  process.stdout.write(JSON.stringify({ __error: err.message }));
  process.exit(0);
}

Promise.resolve(__result).then((val) => {
  process.stdout.write(JSON.stringify({ __value: val !== undefined ? val : null }));
}).catch((err) => {
  process.stdout.write(JSON.stringify({ __error: String(err.message || err) }));
});
`

    const tmpDir = await mkdtemp(join(tmpdir(), 'workflow-code-'))
    const tmpFile = join(tmpDir, 'user-code.cjs')

    try {
      await writeFile(tmpFile, wrappedCode, 'utf8')

      return await new Promise((resolve, reject) => {
        // Run in subprocess with 128MB memory cap and strict timeout
        const child: ChildProcess = spawn(
          process.execPath,
          [
            '--max-old-space-size=128',
            '--disallow-code-generation-from-strings',
            tmpFile,
          ],
          {
            timeout,
            // Minimal env — no secrets leaked into sandbox
            env: {
              PATH: process.env.PATH ?? '',
              NODE_ENV: 'production',
            },
          }
        )

        let stdout = ''
        let stderr = ''

        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

        child.on('error', (err: Error) => reject(new Error(`Subprocess error: ${err.message}`)))

        child.on('close', (_code: number | null, signal: NodeJS.Signals | null) => {
          if (signal === 'SIGTERM' || signal === 'SIGKILL') {
            reject(new Error(`Code execution timed out after ${timeout}ms`))
            return
          }
          if (!stdout.trim()) {
            if (stderr) {
              reject(new Error(`Execution error: ${stderr.slice(0, 500)}`))
            } else {
              resolve(null)
            }
            return
          }
          try {
            const parsed = JSON.parse(stdout.trim())
            if (parsed.__error) {
              reject(new Error(parsed.__error))
            } else {
              resolve(parsed.__value)
            }
          } catch {
            reject(new Error(`Invalid output from code execution: ${stdout.slice(0, 200)}`))
          }
        })
      })
    } finally {
      unlink(tmpFile).catch(() => {})
    }
  }
}
