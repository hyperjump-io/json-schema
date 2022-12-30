import type { add, SchemaDocument, SchemaObject, Anchors } from "./schema.js";


export const validate: (
  (url: string, value: unknown, outputFormat?: OutputFormat) => Promise<OutputUnit>
) & (
  (url: string) => Promise<Validator>
);
export const compile: (schema: SchemaDocument<SchemaObject>) => Promise<CompiledSchema>;
export const interpret: (
  (compiledSchema: CompiledSchema, value: unknown, outputFormat?: OutputFormat) => OutputUnit
) & (
  (compiledSchema: CompiledSchema) => Validator
);
export const FLAG: "FLAG";
export const BASIC: "BASIC";
export const DETAILED: "DETAILED";
export const VERBOSE: "VERBOSE";
export const addSchema: typeof add;

export type Validator = (value: unknown, outputFormat?: OutputFormat) => OutputUnit;

export type OutputFormat = "FLAG" | "BASIC" | "DETAILED" | "VERBOSE" | string;

export type OutputUnit = {
  keyword: string;
  absoluteKeywordLocation: string;
  instanceLocation: string;
  valid: boolean;
  errors?: OutputUnit[];
};

export type CompiledSchema = {
  schemaUri: string;
  ast: AST;
};

type AST = {
  metaData: Record<string, MetaData>;
} & Record<string, Node<Node<unknown>[] | boolean>>;

type Node<A> = [keywordId: string, schemaUri: string, keywordValue: A];

type MetaData = {
  id: string;
  dynamicAnchors: Anchors;
  anchors: Anchors;
};
