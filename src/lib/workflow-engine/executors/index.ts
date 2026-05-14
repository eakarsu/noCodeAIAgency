import { NodeExecutor } from '../types'
import { TriggerExecutor } from './trigger-executor'
import { ActionExecutor } from './action-executor'
import { ConditionExecutor } from './condition-executor'
import { SwitchExecutor } from './switch-executor'
import { LoopExecutor } from './loop-executor'
import { DelayExecutor } from './delay-executor'
import { AIExecutor } from './ai-executor'
import { FilterExecutor } from './filter-executor'
import { SplitExecutor } from './split-executor'
import { MergeExecutor } from './merge-executor'
import { CodeExecutor } from './code-executor'
import { TransformExecutor } from './transform-executor'
import { UtilityExecutor, EndExecutor } from './utility-executor'
import { WaitExecutor } from './wait-executor'
import { SubWorkflowExecutor } from './sub-workflow-executor'

const executorRegistry = new Map<string, NodeExecutor>()

export function initializeExecutors(): void {
  const executors: NodeExecutor[] = [
    new TriggerExecutor(),
    new ActionExecutor(),
    new ConditionExecutor(),
    new SwitchExecutor(),
    new LoopExecutor(),
    new DelayExecutor(),
    new AIExecutor(),
    new FilterExecutor(),
    new SplitExecutor(),
    new MergeExecutor(),
    new CodeExecutor(),
    new TransformExecutor(),
    new UtilityExecutor(),
    new EndExecutor(),
    new WaitExecutor(),
    new SubWorkflowExecutor(),
  ]

  for (const executor of executors) {
    executorRegistry.set(executor.type, executor)
  }

  // Map additional node type aliases to their executors
  executorRegistry.set('webhook', new TriggerExecutor())
  executorRegistry.set('api', new ActionExecutor())
  executorRegistry.set('email', new ActionExecutor())
}

export function getExecutor(nodeType: string): NodeExecutor | null {
  if (executorRegistry.size === 0) {
    initializeExecutors()
  }
  return executorRegistry.get(nodeType) || null
}

export {
  TriggerExecutor,
  ActionExecutor,
  ConditionExecutor,
  SwitchExecutor,
  LoopExecutor,
  DelayExecutor,
  AIExecutor,
  FilterExecutor,
  SplitExecutor,
  MergeExecutor,
  CodeExecutor,
  TransformExecutor,
  UtilityExecutor,
  EndExecutor,
  WaitExecutor,
  SubWorkflowExecutor,
}
