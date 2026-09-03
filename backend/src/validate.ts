export const validUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export const validMermaid = (v: unknown): boolean => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    return trimmed.length >= 1 && trimmed.length <= 10_000;
};
