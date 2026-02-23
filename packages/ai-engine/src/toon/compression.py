"""
TOON RLE compression — Python port of packages/orchestrator/src/toon/compression.ts

Uses a simple run-length encoding scheme with a 0xFF escape byte.
Runs of >3 identical bytes (or any run of 0xFF) are encoded as [0xFF, byte, count].
A single magic byte (0x5A) prefix marks compressed payloads.
"""

COMPRESSION_THRESHOLD = 1024
MAGIC_COMPRESSED = 0x5A


def is_compressed(data: bytes) -> bool:
    return len(data) > 0 and data[0] == MAGIC_COMPRESSED


def _simple_rle_encode(data: bytes) -> bytes:
    result = bytearray()
    i = 0
    length = len(data)

    while i < length:
        byte = data[i]
        count = 1
        while i + count < length and data[i + count] == byte and count < 255:
            count += 1

        if count > 3 or byte == 0xFF:
            result.append(0xFF)
            result.append(byte)
            result.append(count)
        else:
            for _ in range(count):
                result.append(byte)

        i += count

    return bytes(result)


def _simple_rle_decode(data: bytes) -> bytes:
    result = bytearray()
    i = 0
    length = len(data)

    while i < length:
        if data[i] == 0xFF and i + 2 < length:
            byte = data[i + 1]
            count = data[i + 2]
            for _ in range(count):
                result.append(byte)
            i += 3
        else:
            result.append(data[i])
            i += 1

    return bytes(result)


def compress(data: bytes) -> bytes:
    if len(data) < COMPRESSION_THRESHOLD:
        return data
    encoded = _simple_rle_encode(data)
    if len(encoded) >= len(data):
        return data
    return bytes([MAGIC_COMPRESSED]) + encoded


def decompress(data: bytes) -> bytes:
    if not is_compressed(data):
        return data
    return _simple_rle_decode(data[1:])
