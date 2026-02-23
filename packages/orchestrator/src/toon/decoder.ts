import {
  MessageType,
  TOON_VERSION,
  HEADER_SIZE,
  type TOONHeader,
  type TOONMessage,
} from './protocol.js';
import { decompress, isCompressed } from './compression.js';

const decoder = new TextDecoder();
const VALID_TYPES = new Set(
  Object.values(MessageType).filter((v): v is number => typeof v === 'number')
);

export class TOONDecoder {
  decode(buffer: Uint8Array): TOONMessage {
    const header = this.decodeHeader(buffer.subarray(0, HEADER_SIZE));
    const payloadBytes = buffer.subarray(HEADER_SIZE, HEADER_SIZE + header.payloadLength);
    const payload = this.decodePayload(payloadBytes, header.type);
    return { header, payload };
  }

  decodeHeader(buffer: Uint8Array): TOONHeader {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return {
      version: view.getUint8(0),
      type: view.getUint8(1),
      payloadLength: view.getUint32(2, true),
      timestamp: Number(view.getBigUint64(6, true)),
      sequenceId: view.getUint32(14, true),
    };
  }

  decodePayload(buffer: Uint8Array, _type: MessageType): unknown {
    const raw = isCompressed(buffer) ? decompress(buffer) : buffer;
    const json = decoder.decode(raw);
    return JSON.parse(json) as unknown;
  }

  validate(buffer: Uint8Array): boolean {
    if (buffer.length < HEADER_SIZE) return false;
    const header = this.decodeHeader(buffer.subarray(0, HEADER_SIZE));
    if (header.version !== TOON_VERSION) return false;
    if (!VALID_TYPES.has(header.type)) return false;
    if (buffer.length < HEADER_SIZE + header.payloadLength) return false;
    return true;
  }
}
