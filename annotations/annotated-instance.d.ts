import type { Json } from "@hyperjump/json-pointer";
import type { JsonType } from "../lib/common.js";
import type { Instance } from "../lib/instance.js";


export interface AnnotatedInstance extends Instance { // eslint-disable-line @typescript-eslint/consistent-type-definitions
  annotate: (keyword: string, value: string) => AnnotatedInstance;
  annotation: <A>(keyword: string, dialectId?: string) => A[];
  annotatedWith: (keyword: string, dialectId?: string) => AnnotatedInstance[];

  get: (url: string) => AnnotatedInstance;
  uri: () => string;
  value: <A extends Json>() => A;
  has: (key: string) => boolean;
  typeOf: () => JsonType;
  step: (key: string) => AnnotatedInstance;
  iter: () => Generator<AnnotatedInstance>;
  keys: () => Generator<string>;
  values: () => Generator<AnnotatedInstance>;
  entries: () => Generator<[string, AnnotatedInstance]>;
  length: () => number;
}

export class AnnotatedJsInstance implements AnnotatedInstance {
  constructor(instance: Json, id?: string);

  // AnnotatedInstance
  annotate: (keyword: string, value: string) => AnnotatedInstance;
  annotation: <A>(keyword: string, dialectId?: string) => A[];
  annotatedWith: (keyword: string, dialectId?: string) => AnnotatedInstance[];

  // Instance
  get: (url: string) => AnnotatedInstance;
  uri: () => string;
  value: <A extends Json>() => A;
  has: (key: string) => boolean;
  typeOf: () => JsonType;
  step: (key: string) => AnnotatedInstance;
  iter: () => Generator<AnnotatedInstance>;
  keys: () => Generator<string>;
  values: () => Generator<AnnotatedInstance>;
  entries: () => Generator<[string, AnnotatedInstance]>;
  length: () => number;
}
