import { describe, expect, it } from "vitest";
import { validMermaid, validUuid } from "../src/validate.js";

describe("validUuid", () => {
    it("accepts a canonical UUID", () => {
        expect(validUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });

    it("accepts a UUID variant that uses a-f", () => {
        expect(validUuid("abcdefab-cdef-4aef-bcde-fabcdef01234")).toBe(true);
    });

    it("rejects a non-string", () => {
        expect(validUuid(42)).toBe(false);
    });

    it("rejects arbitrary text", () => {
        expect(validUuid("not-a-uuid")).toBe(false);
    });

    it("rejects a correct-length wrong charset", () => {
        expect(validUuid("g".repeat(36))).toBe(false);
    });
});

describe("validMermaid", () => {
    it("accepts a non-empty in-range diagram", () => {
        expect(validMermaid("graph TD; A-->B;")).toBe(true);
    });

    it("accepts a string of exactly 10_000 chars", () => {
        expect(validMermaid("a".repeat(10_000))).toBe(true);
    });

    it("rejects an empty or whitespace-only string", () => {
        expect(validMermaid("")).toBe(false);
        expect(validMermaid("   ")).toBe(false);
    });

    it("rejects a non-string", () => {
        expect(validMermaid({})).toBe(false);
    });

    it("rejects a string over 10_000 chars", () => {
        expect(validMermaid("a".repeat(10_001))).toBe(false);
    });
});
