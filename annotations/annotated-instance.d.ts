import type { JsonType } from "../lib/common.js";
import type { Json, JsonObject } from "@hyperjump/json-pointer";


export const annotate: (instance: AnnotatedJsonDocument, keyword: string, value: string) => AnnotatedJsonDocument;
export const annotation: <A>(instance: AnnotatedJsonDocument, keyword: string, dialectId?: string) => A[];
export const annotatedWith: (instance: AnnotatedJsonDocument, keyword: string, dialectId?: string) => AnnotatedJsonDocument[];
export const nil: AnnotatedJsonDocument<undefined>;
export const cons: (instance: Json, id?: string) => AnnotatedJsonDocument;
export const get: (uri: string, context?: AnnotatedJsonDocument) => AnnotatedJsonDocument;
export const uri: (doc: AnnotatedJsonDocument) => string;
export const value: <A extends Json>(doc: AnnotatedJsonDocument<A>) => A;
export const has: (key: string, doc: AnnotatedJsonDocument<JsonObject>) => boolean;
export const typeOf: (
  (doc: AnnotatedJsonDocument, type: "null") => doc is AnnotatedJsonDocument<null>
) & (
  (doc: AnnotatedJsonDocument, type: "boolean") => doc is AnnotatedJsonDocument<boolean>
) & (
  (doc: AnnotatedJsonDocument, type: "object") => doc is AnnotatedJsonDocument<JsonObject>
) & (
  (doc: AnnotatedJsonDocument, type: "array") => doc is AnnotatedJsonDocument<Json[]>
) & (
  (doc: AnnotatedJsonDocument, type: "number" | "integer") => doc is AnnotatedJsonDocument<number>
) & (
  (doc: AnnotatedJsonDocument, type: "string") => doc is AnnotatedJsonDocument<string>
) & (
  (doc: AnnotatedJsonDocument, type: JsonType) => boolean
) & (
  (doc: AnnotatedJsonDocument) => (type: JsonType) => boolean
);
export const step: (key: string, doc: AnnotatedJsonDocument<JsonObject | Json[]>) => AnnotatedJsonDocument<typeof doc.value>;
export const entries: (doc: AnnotatedJsonDocument<JsonObject>) => [string, AnnotatedJsonDocument][];
export const keys: (doc: AnnotatedJsonDocument<JsonObject>) => string[];
export const map: (
  <A>(fn: MapFn<A>, doc: AnnotatedJsonDocument<Json[]>) => A[]
) & (
  <A>(fn: MapFn<A>) => (doc: AnnotatedJsonDocument<Json[]>) => A[]
);
export const forEach: (
  (fn: ForEachFn, doc: AnnotatedJsonDocument<Json[]>) => void
) & (
  (fn: ForEachFn) => (doc: AnnotatedJsonDocument<Json[]>) => void
);
export const filter: (
  (fn: FilterFn, doc: AnnotatedJsonDocument<Json[]>) => AnnotatedJsonDocument[]
) & (
  (fn: FilterFn) => (doc: AnnotatedJsonDocument<Json[]>) => AnnotatedJsonDocument[]
);
export const reduce: (
  <A>(fn: ReduceFn<A>, acc: A, doc: AnnotatedJsonDocument<Json[]>) => A
) & (
  <A>(fn: ReduceFn<A>) => (acc: A, doc: AnnotatedJsonDocument<Json[]>) => A
) & (
  <A>(fn: ReduceFn<A>) => (acc: A) => (doc: AnnotatedJsonDocument<Json[]>) => A
);
export const every: (
  (fn: FilterFn, doc: AnnotatedJsonDocument<Json[]>) => boolean
) & (
  (fn: FilterFn) => (doc: AnnotatedJsonDocument<Json[]>) => boolean
);
export const some: (
  (fn: FilterFn, doc: AnnotatedJsonDocument<Json[]>) => boolean
) & (
  (fn: FilterFn) => (doc: AnnotatedJsonDocument<Json[]>) => boolean
);
export const length: (doc: AnnotatedJsonDocument<Json[] | string>) => number;

type MapFn<A> = (element: AnnotatedJsonDocument, index: number) => A;
type ForEachFn = (element: AnnotatedJsonDocument, index: number) => void;
type FilterFn = (element: AnnotatedJsonDocument, index: number) => boolean;
type ReduceFn<A> = (accumulator: A, currentValue: AnnotatedJsonDocument, index: number) => A;

export type AnnotatedJsonDocument<A extends Json | undefined = Json> = {
  id: string;
  pointer: string;
  instance: Json;
  value: A;
  annotations: {
    [pointer: string]: {
      [keyword: string]: unknown[]
    }
  }
};
