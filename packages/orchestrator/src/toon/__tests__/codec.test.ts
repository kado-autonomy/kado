import { describe, it, expect } from 'vitest';
import { TOONEncoder, TOONDecoder, MessageType, HEADER_SIZE, TOON_VERSION } from '../index.js';

describe('TOON Codec', () => {
  const encoder = new TOONEncoder();
  const decoder = new TOONDecoder();

  describe('encode then decode roundtrip', () => {
    it.each([
      [MessageType.INSTRUCTION, { instruction: 'do something' }],
      [MessageType.TOOL_CALL, { toolName: 'file_read', args: { path: 'x' } }],
      [MessageType.TOOL_RESULT, { success: true, data: 'content' }],
      [MessageType.STATUS, { status: 'running', progress: 0.5 }],
      [MessageType.ERROR, { message: 'error' }],
      [MessageType.HEARTBEAT, {}],
      [MessageType.CONTEXT_REQUEST, { requestId: 'r1' }],
      [MessageType.CONTEXT_RESPONSE, { requestId: 'r1', data: {} }],
    ])('roundtrips MessageType %s', (type, payload) => {
      const encoded = encoder.encode(type, payload, 1);
      const decoded = decoder.decode(encoded);
      expect(decoded.header.type).toBe(type);
      expect(decoded.header.version).toBe(TOON_VERSION);
      expect(decoded.payload).toEqual(payload);
    });
  });

  describe('header encoding/decoding', () => {
    it('encodes and decodes header fields correctly', () => {
      const encoded = encoder.encode(MessageType.STATUS, { status: 'ok', progress: 1 }, 42);
      const decoded = decoder.decode(encoded);
      expect(decoded.header.version).toBe(TOON_VERSION);
      expect(decoded.header.type).toBe(MessageType.STATUS);
      expect(decoded.header.sequenceId).toBe(42);
      expect(decoded.header.timestamp).toBeGreaterThan(0);
      expect(decoded.header.payloadLength).toBeGreaterThan(0);
    });

    it('produces buffer with correct header size', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      expect(encoded.length).toBeGreaterThanOrEqual(HEADER_SIZE);
    });
  });

  describe('payload encoding/decoding', () => {
    it('handles nested objects', () => {
      const payload = { a: { b: [1, 2, 3] }, c: 'str' };
      const encoded = encoder.encode(MessageType.TOOL_RESULT, payload, 1);
      const decoded = decoder.decode(encoded);
      expect(decoded.payload).toEqual(payload);
    });

    it('handles unicode', () => {
      const payload = { text: '日本語 🎉' };
      const encoded = encoder.encode(MessageType.INSTRUCTION, payload, 1);
      const decoded = decoder.decode(encoded);
      expect(decoded.payload).toEqual(payload);
    });
  });

  describe('compression', () => {
    it('triggers compression on large payloads', () => {
      const largePayload = { data: 'x'.repeat(2000) };
      const encoded = encoder.encode(MessageType.TOOL_RESULT, largePayload, 1);
      const decoded = decoder.decode(encoded);
      expect(decoded.payload).toEqual(largePayload);
    });
  });

  describe('invalid buffer validation', () => {
    it('validate returns false for buffer shorter than header', () => {
      expect(decoder.validate(new Uint8Array(HEADER_SIZE - 1))).toBe(false);
    });

    it('validate returns false for empty buffer', () => {
      expect(decoder.validate(new Uint8Array(0))).toBe(false);
    });

    it('validate returns false for wrong version', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      encoded[0] = 99;
      expect(decoder.validate(encoded)).toBe(false);
    });

    it('validate returns false for invalid message type', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      encoded[1] = 0xff;
      expect(decoder.validate(encoded)).toBe(false);
    });

    it('validate returns false when payload length exceeds buffer', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      view.setUint32(2, 999999, true);
      expect(decoder.validate(encoded)).toBe(false);
    });

    it('validate returns true for valid buffer', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      expect(decoder.validate(encoded)).toBe(true);
    });
  });

  describe('version check', () => {
    it('validate returns false for wrong version', () => {
      const encoded = encoder.encode(MessageType.HEARTBEAT, {}, 0);
      encoded[0] = TOON_VERSION + 1;
      expect(decoder.validate(encoded)).toBe(false);
    });
  });

  describe('static encode helpers', () => {
    it('encodeInstruction produces decodable message', () => {
      const buf = TOONEncoder.encodeInstruction('test', 1);
      const decoded = decoder.decode(buf);
      expect(decoded.header.type).toBe(MessageType.INSTRUCTION);
      expect(decoded.payload).toEqual({ instruction: 'test' });
    });

    it('encodeToolCall produces decodable message', () => {
      const buf = TOONEncoder.encodeToolCall('file_read', { path: 'a' }, 2);
      const decoded = decoder.decode(buf);
      expect(decoded.header.type).toBe(MessageType.TOOL_CALL);
      expect(decoded.payload).toEqual({ toolName: 'file_read', args: { path: 'a' } });
    });

    it('encodeStatus produces decodable message', () => {
      const buf = TOONEncoder.encodeStatus('done', 1, 3);
      const decoded = decoder.decode(buf);
      expect(decoded.header.type).toBe(MessageType.STATUS);
      expect(decoded.payload).toEqual({ status: 'done', progress: 1 });
    });
  });
});
