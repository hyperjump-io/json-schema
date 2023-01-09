import type { JsonType } from "./common.js";


export const add: <A extends SchemaObject | boolean>(schema: A, retrievalUri?: string, defaultSchemaVersion?: string) => string;
export const get: (url: string, context?: SchemaDocument) => Promise<SchemaDocument>;
export const markValidated: (id: string) => void;
export const uri: (doc: SchemaDocument) => string;
export const value: <A extends SchemaFragment>(doc: SchemaDocument<A>) => A;
export const typeOf: (
  (doc: SchemaDocument, type: "null") => doc is SchemaDocument<null>
) & (
  (doc: SchemaDocument, type: "boolean") => doc is SchemaDocument<boolean>
) & (
  (doc: SchemaDocument, type: "object") => doc is SchemaDocument<SchemaObject>
) & (
  (doc: SchemaDocument, type: "array") => doc is SchemaDocument<SchemaFragment[]>
) & (
  (doc: SchemaDocument, type: "number" | "integer") => doc is SchemaDocument<number>
) & (
  (doc: SchemaDocument, type: "string") => doc is SchemaDocument<string>
) & (
  (doc: SchemaDocument, type: JsonType) => boolean
) & (
  (doc: SchemaDocument) => (type: JsonType) => boolean
);
export const has: (key: string, doc: SchemaDocument) => boolean;
export const step: (key: string, doc: SchemaDocument) => Promise<SchemaDocument>;
export const keys: (doc: SchemaDocument) => string[];
export const entries: (doc: SchemaDocument) => Promise<SchemaEntry[]>;
export const map: (
  <A>(fn: MapFn<Promise<A> | A>, doc: SchemaDocument) => Promise<A[]>
) & (
  <A>(fn: MapFn<Promise<A> | A>) => (doc: SchemaDocument) => Promise<A[]>
);
export const length: (doc: SchemaDocument) => number;
export const toSchema: (doc: SchemaDocument, options: ToSchemaOptions) => SchemaObject;

type MapFn<A> = (element: SchemaDocument, index: number) => A;
export type SchemaEntry = [string, SchemaDocument];

export type ToSchemaOptions = {
  parentId?: string;
  parentDialect?: string;
  includeEmbedded?: boolean;
};

export type SchemaDocument<A extends SchemaFragment = SchemaFragment> = {
  id: string;
  dialectId: string;
  pointer: string;
  schema: SchemaObject;
  value: A;
  anchors: Anchors;
  dynamicAnchors: Anchors;
  vocabulary: Record<string, boolean>;
  validated: boolean;
};

export type SchemaFragment = string | number | boolean | null | SchemaObject | SchemaFragment[];
export type SchemaObject = { // eslint-disable-line @typescript-eslint/consistent-indexed-object-style
  [keyword: string]: SchemaFragment;
};

export type Anchors = Record<string, string>;
