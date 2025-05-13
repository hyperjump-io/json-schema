import type { Json } from "@hyperjump/json-pointer";


export const fromJs: (value: Json, uri?: string) => JsonNode;

export const get: <T extends JsonNode>(url: string, context: T) => T | undefined;
export const uri: (node: JsonNode) => string;
export const value: <A>(node: JsonNode) => A;
export const has: (key: string, node: JsonNode) => boolean;
export const typeOf: (node: JsonNode) => JsonNodeType;
export const step: <T extends JsonNode>(key: string, node: T) => T | undefined;
export const iter: <T extends JsonNode>(node: T) => Generator<T>;
export const keys: <T extends JsonNode>(node: T) => Generator<T>;
export const values: <T extends JsonNode>(node: T) => Generator<T>;
export const entries: <T extends JsonNode>(node: T) => Generator<[T, T]>;
export const length: <T extends JsonNode>(node: T) => number;

export const allNodes: <T extends JsonNode>(node: T) => Generator<T>;

export type JsonNode = {
  baseUri: string;
  pointer: string;
  type: JsonNodeType;
  children: JsonNode[];
  parent?: JsonNode;
  root: JsonNode;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonNullNode = {
  type: "json";
  jsonType: "null";
  value: null;
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonBooleanNode = {
  type: "json";
  jsonType: "boolean";
  value: boolean;
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonNumberNode = {
  type: "json";
  jsonType: "number";
  value: number;
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonStringNode = {
  type: "json";
  jsonType: "string";
  value: string;
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonArrayNode = {
  type: "json";
  jsonType: "array";
  children: JsonNode[];
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

export type JsonPropertyNameNode = {
  type: "json-property-name";
  jsonType: "string";
  value: string;
};

export type JsonPropertyNode = {
  type: "json-property";
  children: [JsonPropertyNameNode, JsonNode];
};

export type JsonObjectNode = {
  type: "json";
  jsonType: "object";
  children: JsonPropertyNode<JsonNode>[];
  baseUri: string;
  pointer: string;
  annotations: Record<string, Record<string, unknown>>;
};

type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null" | "property";
