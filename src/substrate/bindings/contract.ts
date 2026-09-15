// src/bindings/contract.ts — the host-agnostic binding surface (spec §5.2)
// ONE interface every host implements. The adapter is THIN by law: it translates
// host shapes; all decisions live in the substrate (Law 1).

export interface ChatMessageInput {
  readonly sessionId: string;
  readonly agent: string;
  readonly role: string;
  readonly text: string;
}
export interface ToolBeforeInput {
  readonly sessionId: string;
  readonly agent: string;
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
}
export interface ToolAfterInput extends ToolBeforeInput {
  readonly result: unknown;
}
export interface MessagesTransformInput {
  readonly messages: readonly { role: string; text: string; paragonBlock?: boolean }[];
}
export interface HostToolRegistration {
  readonly name: string;
  readonly description: string;
  readonly args: Readonly<Record<string, string>>;
  readonly handler: (args: Readonly<Record<string, unknown>>) => unknown;
}

export type ToolBeforeResult =
  | { action: 'ALLOW' }
  | { action: 'BLOCK'; code: string; remedy: string };
export interface ToolAfterResult {
  readonly splicedResult?: string;
  readonly injectedBlocks?: readonly string[];
}
export interface MessagesTransformResult {
  readonly messages: readonly { role: string; text: string; paragonBlock?: boolean }[];
}

export interface ParagonHostBinding {
  readonly hostName: string;
  onChatMessage(e: ChatMessageInput): void;
  onToolBefore(e: ToolBeforeInput): ToolBeforeResult;
  onToolAfter(e: ToolAfterInput): ToolAfterResult;
  onMessagesTransform(e: MessagesTransformInput): MessagesTransformResult;
  onSystemTransform(systemPrompt: string): string;
  readonly tools: readonly HostToolRegistration[];
}
