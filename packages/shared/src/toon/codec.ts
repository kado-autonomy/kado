export const TOON_VERSION = 1;

export enum MessageType {
  INSTRUCTION = 0x01,
  TOOL_CALL = 0x02,
  TOOL_RESULT = 0x03,
  STATUS = 0x04,
  ERROR = 0x05,
}

export interface TOONMessage {
  version: number;
  type: MessageType;
  payload: Uint8Array;
  timestamp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// TODO: implement binary protocol
export function encode(type: MessageType, data: unknown): Uint8Array {
  const json = JSON.stringify({ type, data });
  return encoder.encode(json);
}

export function decode(
  buffer: Uint8Array
): { type: MessageType; data: unknown } {
  const json = decoder.decode(buffer);
  const parsed = JSON.parse(json) as { type: MessageType; data: unknown };
  return { type: parsed.type, data: parsed.data };
}
