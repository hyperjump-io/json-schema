export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";
export type JsonSchemaType = JsonType | "integer";

export type Replacer = (key: string, value: unknown) => unknown;
export const jsonStringify: (value: unknown, replacer?: Replacer, space?: string) => string;
export const deterministicStringify: (value: unknown) => string;
