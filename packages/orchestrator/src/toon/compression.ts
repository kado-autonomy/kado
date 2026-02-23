export const COMPRESSION_THRESHOLD = 1024;
const MAGIC_COMPRESSED = 0x5a;

export function isCompressed(buffer: Uint8Array): boolean {
  return buffer.length > 0 && buffer[0] === MAGIC_COMPRESSED;
}

function simpleRLEEncode(data: Uint8Array): Uint8Array {
  const result: number[] = [];
  let i = 0;
  while (i < data.length) {
    const byte = data[i] ?? 0;
    let count = 1;
    while (i + count < data.length && data[i + count] === byte && count < 255) {
      count++;
    }
    if (count > 3 || byte === 0xff) {
      result.push(0xff, byte, count);
    } else {
      for (let j = 0; j < count; j++) result.push(byte);
    }
    i += count;
  }
  return new Uint8Array(result);
}

function simpleRLEDecode(data: Uint8Array): Uint8Array {
  const result: number[] = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] === 0xff && i + 2 < data.length) {
      const byte = data[i + 1] ?? 0;
      const count = data[i + 2] ?? 0;
      for (let j = 0; j < count; j++) result.push(byte);
      i += 3;
    } else {
      result.push(data[i] ?? 0);
      i++;
    }
  }
  return new Uint8Array(result);
}

export function compress(data: Uint8Array): Uint8Array {
  if (data.length < COMPRESSION_THRESHOLD) return data;
  const encoded = simpleRLEEncode(data);
  if (encoded.length >= data.length) return data;
  const result = new Uint8Array(1 + encoded.length);
  result[0] = MAGIC_COMPRESSED;
  result.set(encoded, 1);
  return result;
}

export function decompress(data: Uint8Array): Uint8Array {
  if (!isCompressed(data)) return data;
  return simpleRLEDecode(data.subarray(1));
}
