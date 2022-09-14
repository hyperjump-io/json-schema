export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";

type PathRelative = (from: string, to: string) => string;
export const pathRelative: PathRelative;
