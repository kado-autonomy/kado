import { describe, it, expect } from 'vitest';
import { encode, decode, MessageType } from '../toon/codec.js';

describe('toon-codec', () => {
  describe('encode/decode roundtrip', () => {
    it('roundtrips instruction message', () => {
      const data = { instruction: 'run' };
      const buf = encode(MessageType.INSTRUCTION, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(MessageType.INSTRUCTION);
      expect(decoded.data).toEqual(data);
    });

    it('roundtrips tool call message', () => {
      const data = { toolName: 'file_read', args: { path: 'x' } };
      const buf = encode(MessageType.TOOL_CALL, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(MessageType.TOOL_CALL);
      expect(decoded.data).toEqual(data);
    });

    it('roundtrips tool result message', () => {
      const data = { success: true, data: 'content' };
      const buf = encode(MessageType.TOOL_RESULT, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(MessageType.TOOL_RESULT);
      expect(decoded.data).toEqual(data);
    });

    it('roundtrips status message', () => {
      const data = { status: 'running', progress: 0.5 };
      const buf = encode(MessageType.STATUS, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(MessageType.STATUS);
      expect(decoded.data).toEqual(data);
    });

    it('roundtrips error message', () => {
      const data = { message: 'error' };
      const buf = encode(MessageType.ERROR, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(MessageType.ERROR);
      expect(decoded.data).toEqual(data);
    });
  });

  describe('all message types', () => {
    it.each([
      [MessageType.INSTRUCTION, { instruction: 'x' }],
      [MessageType.TOOL_CALL, { toolName: 't', args: {} }],
      [MessageType.TOOL_RESULT, { success: true }],
      [MessageType.STATUS, { status: 'ok', progress: 1 }],
      [MessageType.ERROR, { message: 'err' }],
    ])('encodes and decodes type %s', (type, data) => {
      const buf = encode(type, data);
      const decoded = decode(buf);
      expect(decoded.type).toBe(type);
      expect(decoded.data).toEqual(data);
    });
  });
});
