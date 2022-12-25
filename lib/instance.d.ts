import type { JsonType } from "./common.js";
import type { Json, JsonObject } from "@hyperjump/json-pointer";


export const nil: JsonDocument<undefined>;
export const cons: (instance: Json, id?: string) => JsonDocument;
export const get: (url: string, context?: JsonDocument) => JsonDocument;
export const uri: (doc: JsonDocument) => string;
export const value: <A extends Json>(doc: JsonDocument<A>) => A;
export const has: (key: string, doc: JsonDocument<JsonObject>) => boolean;
export const typeOf: (
  (doc: JsonDocument, type: "null") => doc is JsonDocument<null>
) & (
  (doc: JsonDocument, type: "boolean") => doc is JsonDocument<boolean>
) & (
  (doc: JsonDocument, type: "object") => doc is JsonDocument<JsonObject>
) & (
  (doc: JsonDocument, type: "array") => doc is JsonDocument<Json[]>
) & (
  (doc: JsonDocument, type: "number" | "integer") => doc is JsonDocument<number>
) & (
  (doc: JsonDocument, type: "string") => doc is JsonDocument<string>
) & (
  (doc: JsonDocument, type: JsonType) => boolean
) & (
  (doc: JsonDocument) => (type: JsonType) => boolean
);
export const step: (key: string, doc: JsonDocument<JsonObject | Json[]>) => JsonDocument<typeof doc.value>;
export const entries: (doc: JsonDocument<JsonObject>) => [string, JsonDocument][];
export const keys: (doc: JsonDocument<JsonObject>) => string[];
export const map: (
  <A>(fn: MapFn<A>, doc: JsonDocument<Json[]>) => A[]
) & (
  <A>(fn: MapFn<A>) => (doc: JsonDocument<Json[]>) => A[]
);
export const forEach: (
  (fn: ForEachFn, doc: JsonDocument<Json[]>) => void
) & (
  (fn: ForEachFn) => (doc: JsonDocument<Json[]>) => void
);
export const filter: (
  (fn: FilterFn, doc: JsonDocument<Json[]>) => JsonDocument[]
) & (
  (fn: FilterFn) => (doc: JsonDocument<Json[]>) => JsonDocument[]
);
export const reduce: (
  <A>(fn: ReduceFn<A>, acc: A, doc: JsonDocument<Json[]>) => A
) & (
  <A>(fn: ReduceFn<A>) => (acc: A, doc: JsonDocument<Json[]>) => A
) & (
  <A>(fn: ReduceFn<A>) => (acc: A) => (doc: JsonDocument<Json[]>) => A
);
export const every: (
  (fn: FilterFn, doc: JsonDocument<Json[]>) => boolean
) & (
  (fn: FilterFn) => (doc: JsonDocument<Json[]>) => boolean
);
export const some: (
  (fn: FilterFn, doc: JsonDocument<Json[]>) => boolean
) & (
  (fn: FilterFn) => (doc: JsonDocument<Json[]>) => boolean
);
export const length: (doc: JsonDocument<Json[] | string>) => number;

type MapFn<A> = (element: JsonDocument, index: number) => A;
type ForEachFn = (element: JsonDocument, index: number) => void;
type FilterFn = (element: JsonDocument, index: number) => boolean;
type ReduceFn<A> = (accumulator: A, currentValue: JsonDocument, index: number) => A;

export type JsonDocument<A extends Json | undefined = Json> = {
  id: string;
  pointer: string;
  instance: Json;
  value: A;
};
