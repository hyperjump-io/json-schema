export type JsonType = "object" | "array" | "string" | "number" | "boolean" | "null";
export type JsonSchemaType = JsonType | "integer";

type PathRelative = (from: string, to: string) => string;
export const pathRelative: PathRelative;
