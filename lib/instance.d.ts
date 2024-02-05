import type { JsonType } from "./common.js";
import type { Json } from "@hyperjump/json-pointer";


export interface Instance {
  get: (url: string) => Instance;
  uri: () => string;
  value: <A extends Json>() => A;
  has: (key: string) => boolean;
  typeOf: () => JsonType;
  step: (key: string) => Instance;
  iter: () => Generator<Instance>;
  keys: () => Generator<string>;
  values: () => Generator<Instance>;
  entries: () => Generator<[string, Instance]>;
  length: () => number;
}

export class JsInstance implements Instance {
  constructor(instance: Json, id?: string, pointer?: string);

  get: (url: string) => JsInstance;
  uri: () => string;
  value: <A extends Json>() => A;
  has: (key: string) => boolean;
  typeOf: () => JsonType;
  step: (key: string) => JsInstance;
  iter: () => Generator<JsInstance>;
  keys: () => Generator<string>;
  values: () => Generator<JsInstance>;
  entries: () => Generator<[string, JsInstance]>;
  length: () => number;
}
