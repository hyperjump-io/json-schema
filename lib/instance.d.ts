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
export const iter: (doc: JsonDocument<JsonObject>) => Generator<JsonDocument>;
export const keys: (doc: JsonDocument<JsonObject>) => Generator<string>;
export const values: (doc: JsonDocument<JsonObject>) => Generator<JsonDocument>;
export const entries: (doc: JsonDocument<JsonObject>) => Generator<[string, JsonDocument]>;
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
