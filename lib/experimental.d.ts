import type { Browser, Document } from "@hyperjump/browser";
import type { Validator, OutputUnit, OutputFormat, SchemaObject } from "./index.js";
import type { JsonNode } from "./instance.js";


// Compile/interpret
export const compile: (schema: Browser<SchemaDocument>) => Promise<CompiledSchema>;
export const interpret: (
  (compiledSchema: CompiledSchema, value: JsonNode, outputFormat?: OutputFormat) => OutputUnit
) & (
  (compiledSchema: CompiledSchema) => Validator
);

export type CompiledSchema = {
  schemaUri: string;
  ast: AST;
};

type AST = {
  metaData: Record<string, MetaData>;
  plugins: Set<EvaluationPlugin>;
} & Record<string, Node<unknown>[] | boolean>;

type Node<A> = [keywordId: string, schemaUri: string, keywordValue: A];

type MetaData = {
  id: string;
  dynamicAnchors: Anchors;
  anchors: Anchors;
};

type Anchors = Record<string, string>;

// Output Formats
export const BASIC: "BASIC";
export const DETAILED: "DETAILED";

// Schema
export const getSchema: (uri: string, browser?: Browser) => Promise<Browser<SchemaDocument>>;
export const buildSchemaDocument: (schema: SchemaObject | boolean, retrievalUri?: string, contextDialectId?: string) => SchemaDocument;
export const canonicalUri: (browser: Browser<SchemaDocument>) => string;
export const toSchema: (browser: Browser<SchemaDocument>, options?: ToSchemaOptions) => SchemaObject;

export type ToSchemaOptions = {
  contextDialectId?: string;
  includeDialect?: "auto" | "always" | "never";
  selfIdentify?: boolean;
  contextUri?: string;
  includeEmbedded?: boolean;
};

export type SchemaDocument = Document & {
  dialectId: string;
  anchors: Record<string, string>;
  dynamicAnchors: Record<string, string>;
};

// Vocabulary System
export const addKeyword: <A>(keywordHandler: Keyword<A>) => void;
export const getKeywordName: (dialectId: string, keywordId: string) => string;
export const getKeyword: <A>(id: string) => Keyword<A>;
export const getKeywordByName: <A>(keywordName: string, dialectId: string) => Keyword<A>;
export const getKeywordId: (keywordName: string, dialectId: string) => string;
export const defineVocabulary: (id: string, keywords: Record<string, string>) => void;
export const loadDialect: (dialectId: string, dialect: Record<string, boolean>, allowUnknownKeywords?: boolean) => void;
export const unloadDialect: (dialectId: string) => void;
export const hasDialect: (dialectId: string) => boolean;

export type Keyword<A, Context extends ValidationContext = ValidationContext> = {
  id: string;
  compile: (schema: Browser<SchemaDocument>, ast: AST, parentSchema: Browser<SchemaDocument>) => Promise<A>;
  interpret: (compiledKeywordValue: A, instance: JsonNode, context: Context) => boolean;
  simpleApplicator?: boolean;
  annotation?: <B>(compiledKeywordValue: A, instance: JsonNode) => B | undefined;
  plugin?: EvaluationPlugin<Context>;
};

export type ValidationContext = {
  ast: AST;
  plugins: EvaluationPlugin[];
};

// Evaluation Plugins
export type EvaluationPlugin<Context extends ValidationContext = ValidationContext> = {
  beforeSchema?(url: string, instance: JsonNode, context: Context): void;
  beforeKeyword?(keywordNode: Node<unknown>, instance: JsonNode, context: Context, schemaContext: Context, keyword: Keyword): void;
  afterKeyword?(keywordNode: Node<unknown>, instance: JsonNode, context: Context, valid: boolean, schemaContext: Context, keyword: Keyword): void;
  afterSchema?(url: string, instance: JsonNode, context: Context, valid: boolean): void;
};

export class BasicOutputPlugin implements EvaluationPlugin<ErrorsContext> {
  errors: OutputUnit[];

  beforeSchema(url: string, instance: JsonNode, context: ErrorsContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ErrorsContext, schemaContext: ErrorsContext, keyword: Keyword<unknown>): void;
  afterKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ErrorsContext, valid: boolean, schemaContext: ErrorsContext, keyword: Keyword<unknown>): void;
  afterSchema(url: string, instance: JsonNode, context: ErrorsContext, valid: boolean): void;
}

export class DetailedOutputPlugin implements EvaluationPlugin<ErrorsContext> {
  errors: OutputUnit[];

  beforeSchema(url: string, instance: JsonNode, context: ErrorsContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ErrorsContext, schemaContext: ErrorsContext, keyword: Keyword<unknown>): void;
  afterKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: ErrorsContext, valid: boolean, schemaContext: ErrorsContext, keyword: Keyword<unknown>): void;
  afterSchema(url: string, instance: JsonNode, context: ErrorsContext, valid: boolean): void;
}

export type ErrorsContext = ValidationContext & {
  errors: OutputUnit[];
};

export class AnnotationsPlugin implements EvaluationPlugin<AnnotationsContext> {
  annotations: OutputUnit[];

  beforeSchema(url: string, instance: JsonNode, context: AnnotationsContext): void;
  beforeKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: AnnotationsContext, schemaContext: AnnotationsContext, keyword: Keyword<unknown>): void;
  afterKeyword(keywordNode: Node<unknown>, instance: JsonNode, context: AnnotationsContext, valid: boolean, schemaContext: AnnotationsContext, keyword: Keyword<unknown>): void;
  afterSchema(url: string, instance: JsonNode, context: AnnotationsContext, valid: boolean): void;
}

export type AnnotationsContext = ValidationContext & {
  annotations: OutputUnit[];
};

export const Validation: Keyword<string>;
