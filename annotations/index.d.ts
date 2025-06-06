import type { OutputFormat, OutputUnit, ValidationOptions } from "../lib/index.js";
import type { CompiledSchema } from "../lib/experimental.js";
import type { JsonNode } from "../lib/json-node.js";
import type { Json } from "@hyperjump/json-pointer";


export const annotate: (
  (schemaUrl: string, value: Json, options?: OutputFormat | ValidationOptions) => Promise<JsonNode>
) & (
  (schemaUrl: string) => Promise<Annotator>
);

export type Annotator = (value: Json, options?: OutputFormat | ValidationOptions) => JsonNode;

export const interpret: (compiledSchema: CompiledSchema, value: JsonNode, options?: OutputFormat | ValidationOptions) => JsonNode;

export class ValidationError extends Error {
  public output: OutputUnit;

  public constructor(output: OutputUnit);
}
