// src/bindings/index.ts
export type {
  ChatMessageInput, ToolBeforeInput, ToolAfterInput, MessagesTransformInput,
  MessagesTransformResult, ToolBeforeResult, ToolAfterResult, HostToolRegistration,
  ParagonHostBinding,
} from './contract';
export { createOpenCodeBinding, PARAGON_STATIC_MARKER } from './opencode';
export type { OpenCodeBindingOptions } from './opencode';
export { OpenCodeHooks } from './opencode/hooks';
