/**
 * Workflow builder components live under `src/components/workflow/`.
 * This re-export keeps `@/components/builder/...` import paths working
 * for any callers that haven't been migrated.
 */
export { WorkflowEditor } from '../workflow/WorkflowEditor'
export { NodePalette, NODE_CATEGORIES } from '../workflow/NodePalette'
export * from '../workflow/nodes'
