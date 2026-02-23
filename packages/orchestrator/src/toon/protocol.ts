export const TOON_VERSION = 1;

export enum MessageType {
  INSTRUCTION = 0x01,
  TOOL_CALL = 0x02,
  TOOL_RESULT = 0x03,
  STATUS = 0x04,
  ERROR = 0x05,
  HEARTBEAT = 0x06,
  CONTEXT_REQUEST = 0x07,
  CONTEXT_RESPONSE = 0x08,
}

export interface TOONHeader {
  version: number;
  type: MessageType;
  payloadLength: number;
  timestamp: number;
  sequenceId: number;
}

export const HEADER_SIZE = 18;

export interface TOONMessage {
  header: TOONHeader;
  payload: unknown;
}
