import type { Schema, SchemaDocument, SchemaObject, Anchors } from "./schema";


export type Core = {
  validate: (
    (url: string, value: unknown, outputFormat?: OutputFormat) => Promise<Result>
  ) & (
    (url: string) => Promise<Validator>
  );
  compile: (schema: SchemaDocument<SchemaObject>) => Promise<CompiledSchema>;
  interpret: (
    (compiledSchema: CompiledSchema, value: unknown, outputFormat?: OutputFormat) => Result
  ) & (
    (compiledSchema: CompiledSchema) => Validator
  );
  get: Schema["get"];
  addMediaTypePlugin: (contentType: string, plugin: MediaTypePlugin) => void;
  FLAG: "FLAG";
  BASIC: "BASIC";
  DETAILED: "DETAILED";
  VERBOSE: "VERBOSE";
  add: Schema["add"];
};

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

export type MediaTypePlugin = {
  parse: (response: Response, mediaTypeParameters: { [parameter: string]: string }) => Promise<[SchemaObject, string | undefined]>;
  matcher: (path: string) => boolean;
};

declare const core: Core;
export default core;
