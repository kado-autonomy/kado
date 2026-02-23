import json
import struct
from enum import IntEnum
from typing import Any


class MessageType(IntEnum):
    INSTRUCTION = 0x01
    TOOL_CALL = 0x02
    TOOL_RESULT = 0x03
    STATUS = 0x04
    ERROR = 0x05
    HEARTBEAT = 0x06
    CONTEXT_REQUEST = 0x07
    CONTEXT_RESPONSE = 0x08


TOON_VERSION = 1
HEADER_SIZE = 18
HEADER_FORMAT = "<BBIQI"
HEADER_STRUCT = struct.Struct(HEADER_FORMAT)


def encode_header(
    msg_type: MessageType,
    payload_length: int,
    sequence_id: int,
    timestamp: int | None = None,
) -> bytes:
    if timestamp is None:
        import time
        timestamp = int(time.time() * 1000)
    return HEADER_STRUCT.pack(
        TOON_VERSION,
        int(msg_type),
        payload_length,
        timestamp,
        sequence_id,
    )


def decode_header(buffer: bytes) -> dict[str, Any]:
    if len(buffer) < HEADER_SIZE:
        raise ValueError("Buffer too short for header")
    unpacked = HEADER_STRUCT.unpack_from(buffer)
    return {
        "version": unpacked[0],
        "type": unpacked[1],
        "payload_length": unpacked[2],
        "timestamp": unpacked[3],
        "sequence_id": unpacked[4],
    }


def encode(msg_type: MessageType, data: Any, sequence_id: int) -> bytes:
    payload_bytes = json.dumps(data).encode("utf-8")
    header = encode_header(msg_type, len(payload_bytes), sequence_id)
    return header + payload_bytes


def decode(buffer: bytes) -> dict[str, Any]:
    header = decode_header(buffer)
    payload_start = HEADER_SIZE
    payload_end = payload_start + header["payload_length"]
    if len(buffer) < payload_end:
        raise ValueError("Buffer too short for payload")
    payload_bytes = buffer[payload_start:payload_end]
    payload = json.loads(payload_bytes.decode("utf-8"))
    return {"header": header, "payload": payload}
