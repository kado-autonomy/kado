import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from toon.compression import (
    COMPRESSION_THRESHOLD,
    MAGIC_COMPRESSED,
    compress,
    decompress,
    is_compressed,
    _simple_rle_encode,
    _simple_rle_decode,
)


class TestIsCompressed:
    def test_empty_bytes(self):
        assert is_compressed(b"") is False

    def test_uncompressed_data(self):
        assert is_compressed(b"\x00\x01\x02") is False

    def test_compressed_magic_byte(self):
        assert is_compressed(bytes([MAGIC_COMPRESSED, 0x01, 0x02])) is True


class TestSimpleRLEEncode:
    def test_no_runs(self):
        data = bytes([1, 2, 3])
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([1, 2, 3])

    def test_short_run_stays_literal(self):
        data = bytes([7, 7, 7])
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([7, 7, 7])

    def test_run_of_four_encodes(self):
        data = bytes([0x42] * 4)
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([0xFF, 0x42, 4])

    def test_long_run(self):
        data = bytes([0xAB] * 100)
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([0xFF, 0xAB, 100])

    def test_0xff_byte_always_encoded(self):
        data = bytes([0xFF])
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([0xFF, 0xFF, 1])

    def test_max_run_255(self):
        data = bytes([0x00] * 300)
        encoded = _simple_rle_encode(data)
        assert encoded == bytes([0xFF, 0x00, 255, 0xFF, 0x00, 45])


class TestSimpleRLEDecode:
    def test_literal_bytes(self):
        data = bytes([1, 2, 3])
        assert _simple_rle_decode(data) == bytes([1, 2, 3])

    def test_encoded_run(self):
        data = bytes([0xFF, 0x42, 5])
        assert _simple_rle_decode(data) == bytes([0x42] * 5)

    def test_mixed(self):
        data = bytes([0x01, 0xFF, 0x42, 3, 0x02])
        decoded = _simple_rle_decode(data)
        assert decoded == bytes([0x01, 0x42, 0x42, 0x42, 0x02])


class TestRoundTrip:
    def test_encode_decode_roundtrip(self):
        original = bytes(range(256)) * 2
        encoded = _simple_rle_encode(original)
        decoded = _simple_rle_decode(encoded)
        assert decoded == original

    def test_all_same_bytes(self):
        original = bytes([0x33] * 200)
        encoded = _simple_rle_encode(original)
        decoded = _simple_rle_decode(encoded)
        assert decoded == original

    def test_alternating_pattern(self):
        original = bytes([0xAA, 0xBB] * 150)
        encoded = _simple_rle_encode(original)
        decoded = _simple_rle_decode(encoded)
        assert decoded == original


class TestCompress:
    def test_below_threshold_returns_unchanged(self):
        data = b"short"
        assert compress(data) is data

    def test_exactly_at_threshold(self):
        data = bytes([0x00] * COMPRESSION_THRESHOLD)
        result = compress(data)
        assert result[0] == MAGIC_COMPRESSED
        assert len(result) < len(data)

    def test_incompressible_data_returns_original(self):
        data = bytes(range(256)) * (COMPRESSION_THRESHOLD // 256 + 1)
        data = data[:COMPRESSION_THRESHOLD]
        result = compress(data)
        assert result == data

    def test_highly_compressible(self):
        data = bytes([0x00] * 10000)
        result = compress(data)
        assert result[0] == MAGIC_COMPRESSED
        assert len(result) < 200


class TestDecompress:
    def test_uncompressed_passthrough(self):
        data = b"hello"
        assert decompress(data) is data

    def test_empty_data(self):
        assert decompress(b"") == b""


class TestCompressDecompressRoundTrip:
    def test_roundtrip_zeros(self):
        original = bytes([0x00] * 5000)
        assert decompress(compress(original)) == original

    def test_roundtrip_repeated_pattern(self):
        original = bytes([0xDE, 0xAD, 0xBE, 0xEF] * 500)
        assert decompress(compress(original)) == original

    def test_roundtrip_random_like(self):
        import hashlib
        original = hashlib.sha512(b"seed").digest() * (COMPRESSION_THRESHOLD // 64 + 1)
        original = original[:COMPRESSION_THRESHOLD + 500]
        assert decompress(compress(original)) == original

    def test_roundtrip_with_0xff_bytes(self):
        original = bytes([0xFF] * 3000)
        assert decompress(compress(original)) == original

    def test_roundtrip_below_threshold(self):
        original = b"small payload"
        assert decompress(compress(original)) == original
