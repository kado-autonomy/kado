# TOON Protocol Specification

**T**ask **O**rchestration **O**ver **N**ode (TOON) is a binary message protocol used for communication between the orchestrator and subagents within the Kado agent system.

## Overview

TOON provides a lightweight, versioned binary framing for JSON payloads. It supports optional RLE compression for large messages and includes sequence tracking for ordered delivery.

Implementations exist in both TypeScript (`@kado/orchestrator`, `@kado/shared`) and Python (`@kado/ai-engine`).

## Binary Header

Every TOON message begins with an 18-byte fixed-size header.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│  Version  │   Type    │         Payload Length (LE)               │
├───────────┼───────────┼───────────────────────────────────────────┤
│                    Timestamp (LE, 8 bytes)                        │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│              Sequence ID (LE, 4 bytes)                            │
├───────────────────────────────────────────────────────────────────┤
│                    Payload (variable length)                      │
│                         ...                                       │
└───────────────────────────────────────────────────────────────────┘
```

### Header Fields

| Offset | Size | Type | Field | Description |
|--------|------|------|-------|-------------|
| 0 | 1 | `uint8` | `version` | Protocol version (currently `1`) |
| 1 | 1 | `uint8` | `type` | Message type enum value |
| 2 | 4 | `uint32 LE` | `payloadLength` | Length of the payload in bytes |
| 6 | 8 | `uint64 LE` | `timestamp` | Unix timestamp in milliseconds |
| 14 | 4 | `uint32 LE` | `sequenceId` | Monotonically increasing sequence number |

**Total header size:** 18 bytes (`HEADER_SIZE` constant).

### TypeScript Header Layout

```typescript
interface TOONHeader {
  version: number;      // uint8
  type: MessageType;    // uint8
  payloadLength: number; // uint32
  timestamp: number;    // uint64 (as JS number)
  sequenceId: number;   // uint32
}
```

### Python Header Layout

```python
HEADER_FORMAT = "<BBIQI"  # version(B), type(B), payloadLength(I), timestamp(Q), sequenceId(I)
HEADER_SIZE = 18
```

## Message Types

| Value | Name | Direction | Description |
|-------|------|-----------|-------------|
| `0x01` | `INSTRUCTION` | Orchestrator → Subagent | Task instruction for the subagent |
| `0x02` | `TOOL_CALL` | Subagent → Orchestrator | Request to invoke a tool |
| `0x03` | `TOOL_RESULT` | Orchestrator → Subagent | Result of a tool invocation |
| `0x04` | `STATUS` | Subagent → Orchestrator | Progress update |
| `0x05` | `ERROR` | Either direction | Error notification |
| `0x06` | `HEARTBEAT` | Either direction | Keep-alive signal |
| `0x07` | `CONTEXT_REQUEST` | Subagent → Orchestrator | Request additional context |
| `0x08` | `CONTEXT_RESPONSE` | Orchestrator → Subagent | Response with requested context |

### TypeScript Enum

```typescript
enum MessageType {
  INSTRUCTION      = 0x01,
  TOOL_CALL        = 0x02,
  TOOL_RESULT      = 0x03,
  STATUS           = 0x04,
  ERROR            = 0x05,
  HEARTBEAT        = 0x06,
  CONTEXT_REQUEST  = 0x07,
  CONTEXT_RESPONSE = 0x08,
}
```

### Python Enum

```python
class MessageType(IntEnum):
    INSTRUCTION      = 0x01
    TOOL_CALL        = 0x02
    TOOL_RESULT      = 0x03
    STATUS           = 0x04
    ERROR            = 0x05
    HEARTBEAT        = 0x06
    CONTEXT_REQUEST  = 0x07
    CONTEXT_RESPONSE = 0x08
```

## Payload Format

The payload is a UTF-8 JSON-encoded byte string. Payload structure varies by message type:

### INSTRUCTION

```json
{ "instruction": "Write unit tests for the UserService class" }
```

### TOOL_CALL

```json
{
  "toolName": "file_read",
  "args": { "path": "src/services/user.ts" }
}
```

### TOOL_RESULT

```json
{
  "success": true,
  "data": "export class UserService { ... }",
  "duration": 12
}
```

### STATUS

```json
{
  "status": "analyzing",
  "progress": 0.45
}
```

### ERROR

```json
{
  "code": "TOOL_FAILED",
  "message": "File not found: src/missing.ts"
}
```

### HEARTBEAT

```json
{}
```

### CONTEXT_REQUEST / CONTEXT_RESPONSE

```json
{ "type": "file", "path": "src/config.ts" }
```

## Compression

Payloads exceeding 1,024 bytes (`COMPRESSION_THRESHOLD`) are optionally compressed using a simple RLE scheme.

### RLE Encoding

- A compressed payload is prefixed with the magic byte `0x5A`.
- The RLE encoder scans for runs of identical bytes. Runs of 4+ bytes (or the escape byte `0xFF`) are encoded as: `0xFF <byte> <count>`.
- Single bytes (non-runs) are written verbatim.
- Compression is only applied if the encoded result is smaller than the original.

### Detecting Compression

```typescript
function isCompressed(buffer: Uint8Array): boolean {
  return buffer.length > 0 && buffer[0] === 0x5A;
}
```

### Decompression

1. Check the first byte for magic `0x5A`.
2. If present, strip the magic byte and decode the RLE payload.
3. If absent, the payload is uncompressed — use as-is.

## Encoding & Decoding

### TypeScript (Orchestrator)

```typescript
import { TOONEncoder } from '@kado/orchestrator/toon';
import { TOONDecoder } from '@kado/orchestrator/toon';
import { MessageType } from '@kado/orchestrator/toon';

// Encode
const encoder = new TOONEncoder();
const bytes = encoder.encode(MessageType.INSTRUCTION, { instruction: "..." }, 1);

// Convenience methods
const instrBytes = TOONEncoder.encodeInstruction("...", 1);
const toolBytes = TOONEncoder.encodeToolCall("file_read", { path: "..." }, 2);
const statusBytes = TOONEncoder.encodeStatus("working", 0.5, 3);

// Decode
const decoder = new TOONDecoder();
const message = decoder.decode(bytes);
// message.header → TOONHeader
// message.payload → parsed JSON object

// Validate
const isValid = decoder.validate(bytes);
```

### Python (AI Engine)

```python
from src.toon.protocol import encode, decode, MessageType

# Encode
buffer = encode(MessageType.INSTRUCTION, {"instruction": "..."}, sequence_id=1)

# Decode
result = decode(buffer)
# result["header"] → dict with version, type, payload_length, timestamp, sequence_id
# result["payload"] → parsed JSON object
```

## Schema Versioning

The `version` field in the header enables forward compatibility:

- **Version 1** (current) — JSON payloads, optional RLE compression.
- Future versions may introduce new payload encodings (e.g., MessagePack, Protobuf) while maintaining the same header layout.
- Decoders should reject messages with unsupported version numbers.

## Validation Rules

A valid TOON message must satisfy:

1. Buffer length >= `HEADER_SIZE` (18 bytes).
2. `version` equals `TOON_VERSION` (currently `1`).
3. `type` is one of the defined `MessageType` values.
4. Buffer length >= `HEADER_SIZE + payloadLength`.
