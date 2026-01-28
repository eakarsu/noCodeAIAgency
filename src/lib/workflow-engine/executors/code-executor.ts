import { WorkflowNode } from '@/types'
import { ExecutionContext, NodeExecutionResult, NodeExecutor } from '../types'

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
      const result = await this.executeJavaScript(code, context, timeout)
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

  private async executeJavaScript(
    code: string,
    context: ExecutionContext,
    timeout: number
  ): Promise<unknown> {
    // Create a sandboxed-ish execution environment
    // Note: this is not a true sandbox - for production, use vm2 or isolated-vm
    const inputs = {
      trigger: context.triggerData,
      variables: context.variables,
      nodes: context.nodeOutputs,
    }

    const wrappedCode = `
      'use strict';
      const inputs = ${JSON.stringify(inputs)};
      const trigger = inputs.trigger;
      const variables = inputs.variables;
      const nodes = inputs.nodes;
      ${code}
    `

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeout}ms`))
      }, timeout)

      try {
        // Using Function constructor for basic JS execution
        const fn = new Function(wrappedCode)
        const result = fn()
        clearTimeout(timer)
        resolve(result)
      } catch (error) {
        clearTimeout(timer)
        reject(error)
      }
    })
  }
}
