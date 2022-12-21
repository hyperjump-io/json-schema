import type { JsonType } from "./common";
import type { Json, JsonObject } from "@hyperjump/json-pointer";


export type Instance = {
  nil: JsonDocument<undefined>;
  cons: (instance: Json, id?: string) => JsonDocument;
  get: (url: string, context?: JsonDocument) => JsonDocument;
  uri: (doc: JsonDocument) => string;
  value: <A extends Json>(doc: JsonDocument<A>) => A;
  has: (key: string, doc: JsonDocument<JsonObject>) => boolean;
  typeOf: (
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
  step: (key: string, doc: JsonDocument<JsonObject | Json[]>) => JsonDocument<typeof doc.value>;
  entries: (doc: JsonDocument<JsonObject>) => [string, JsonDocument][];
  keys: (doc: JsonDocument<JsonObject>) => string[];
  map: (
    <A>(fn: MapFn<A>, doc: JsonDocument<Json[]>) => A[]
  ) & (
    <A>(fn: MapFn<A>) => (doc: JsonDocument<Json[]>) => A[]
  );
  forEach: (
    (fn: ForEachFn, doc: JsonDocument<Json[]>) => void
  ) & (
    (fn: ForEachFn) => (doc: JsonDocument<Json[]>) => void
  );
  filter: (
    (fn: FilterFn, doc: JsonDocument<Json[]>) => JsonDocument[]
  ) & (
    (fn: FilterFn) => (doc: JsonDocument<Json[]>) => JsonDocument[]
  );
  reduce: (
    <A>(fn: ReduceFn<A>, acc: A, doc: JsonDocument<Json[]>) => A
  ) & (
    <A>(fn: ReduceFn<A>) => (acc: A, doc: JsonDocument<Json[]>) => A
  ) & (
    <A>(fn: ReduceFn<A>) => (acc: A) => (doc: JsonDocument<Json[]>) => A
  );
  every: (
    (fn: FilterFn, doc: JsonDocument<Json[]>) => boolean
  ) & (
    (fn: FilterFn) => (doc: JsonDocument<Json[]>) => boolean
  );
  some: (
    (fn: FilterFn, doc: JsonDocument<Json[]>) => boolean
  ) & (
    (fn: FilterFn) => (doc: JsonDocument<Json[]>) => boolean
  );
  length: (doc: JsonDocument<Json[] | string>) => number;
};

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

declare const instance: Instance;
export default instance;
