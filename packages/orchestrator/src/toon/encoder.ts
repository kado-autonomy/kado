import {
  MessageType,
  TOON_VERSION,
  HEADER_SIZE,
  type TOONHeader,
} from './protocol.js';
import { compress, COMPRESSION_THRESHOLD } from './compression.js';

const encoder = new TextEncoder();

export class TOONEncoder {
  encode(type: MessageType, data: unknown, sequenceId: number): Uint8Array {
    const payload = this.encodePayload(data);
    const compressed =
      payload.length > COMPRESSION_THRESHOLD ? compress(payload) : payload;
    const header: TOONHeader = {
      version: TOON_VERSION,
      type,
      payloadLength: compressed.length,
      timestamp: Date.now(),
      sequenceId,
    };
    const headerBytes = this.encodeHeader(header);
    const result = new Uint8Array(headerBytes.length + compressed.length);
    result.set(headerBytes, 0);
    result.set(compressed, headerBytes.length);
    return result;
  }

  encodeHeader(header: TOONHeader): Uint8Array {
    const buf = new ArrayBuffer(HEADER_SIZE);
    const view = new DataView(buf);
    view.setUint8(0, header.version);
    view.setUint8(1, header.type);
    view.setUint32(2, header.payloadLength, true);
    view.setBigUint64(6, BigInt(header.timestamp), true);
    view.setUint32(14, header.sequenceId, true);
    return new Uint8Array(buf);
  }

  encodePayload(data: unknown): Uint8Array {
    const json = JSON.stringify(data);
    return encoder.encode(json);
  }

  static encodeInstruction(instruction: string, seq: number): Uint8Array {
    const enc = new TOONEncoder();
    return enc.encode(MessageType.INSTRUCTION, { instruction }, seq);
  }

  static encodeToolCall(
    toolName: string,
    args: Record<string, unknown>,
    seq: number
  ): Uint8Array {
    const enc = new TOONEncoder();
    return enc.encode(MessageType.TOOL_CALL, { toolName, args }, seq);
  }

  static encodeStatus(
    status: string,
    progress: number,
    seq: number
  ): Uint8Array {
    const enc = new TOONEncoder();
    return enc.encode(MessageType.STATUS, { status, progress }, seq);
  }
}
