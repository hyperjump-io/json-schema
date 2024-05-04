import type { Json } from "@hyperjump/json-pointer";


export const fromJs: (value: Json, uri?: string) => JsonNode;

export const cons: (
  baseUri: string,
  pointer: string,
  value: Json,
  type: JsonNodeType,
  children: JsonNode[],
  parent?: JsonNode
) => JsonNode;
export const get: (url: string, context: JsonNode) => JsonNode | undefined;
export const uri: (node: JsonNode) => string;
export const value: <A>(node: JsonNode) => A;
export const has: (key: string, node: JsonNode) => boolean;
export const typeOf: (node: JsonNode) => JsonType;
export const step: (key: string, node: JsonNode) => JsonNode;
export const iter: (node: JsonNode) => Generator<JsonNode>;
export const keys: (node: JsonNode) => Generator<JsonNode>;
export const values: (node: JsonNode) => Generator<JsonNode>;
export const entries: (node: JsonNode) => Generator<[JsonNode, JsonNode]>;
export const length: (node: JsonNode) => number;

export const allNodes: (node) => Generator<JsonNode>;

export type JsonNode = {
  baseUri: string;
  pointer: string;
  type: JsonNodeType;
  children: JsonNode[];
  parent: JsonNode;
  root: JsonNode;
  valid: boolean;
  errors: Record<string, string>;
  annotations: Record<string, Record<string, unknown>>;
};

type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null" | "property";
