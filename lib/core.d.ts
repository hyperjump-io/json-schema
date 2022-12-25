import type { add, SchemaDocument, SchemaObject, Anchors } from "./schema.js";


export const validate: (
  (url: string, value: unknown, outputFormat?: OutputFormat) => Promise<Result>
) & (
  (url: string) => Promise<Validator>
);
export const compile: (schema: SchemaDocument<SchemaObject>) => Promise<CompiledSchema>;
export const interpret: (
  (compiledSchema: CompiledSchema, value: unknown, outputFormat?: OutputFormat) => Result
) & (
  (compiledSchema: CompiledSchema) => Validator
);
export const FLAG: "FLAG";
export const BASIC: "BASIC";
export const DETAILED: "DETAILED";
export const VERBOSE: "VERBOSE";
export const addSchema: typeof add;

export type Validator = (value: unknown, outputFormat?: OutputFormat) => Result;

export type OutputFormat = "FLAG" | "BASIC" | "DETAILED" | "VERBOSE" | string;

export type CompiledSchema = {
  schemaUri: string;
  ast: AST;
};

export type AST = {
  metaData: Record<string, MetaData>;
} & Record<string, Node<Node<unknown>[] | boolean>>;

export type Node<A> = [keywordId: string, schemaUri: string, keywordValue: A];

export type MetaData = {
  id: string;
  dynamicAnchors: Anchors;
  anchors: Anchors;
};

export type Result = {
  keyword: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;
  valid: boolean;
  errors?: Result[];
};
