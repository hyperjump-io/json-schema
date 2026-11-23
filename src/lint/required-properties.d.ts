import type { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";
import type { LoweredKeyword } from "./lower.d.ts";

/**
 * A way for an object to pass a schema, as far as properties go: the
 * properties it has to have, the ones it can't have, and the keywords in
 * the schema that require any of them
 */
export type Alternative = {
  names: Set<string>;
  absent: Set<string>;
  keywordNodes: Set<JsonSchemaKeywordNode>;
};

/**
 * The ways for an object to pass a schema, given its lowered keywords, like
 * `LintDocument.reached`'s. Schemas that are applied are followed, if
 * they're in `schemas`, by location. Only alternatives that are possible
 * are included, so if there are none, no object passes. `present` are
 * properties the object is known to have.
 */
export const propertyAlternatives: (schemaNode: JsonSchemaNode, keywords: LoweredKeyword[], schemas: Map<string, LoweredKeyword[]>, present?: string[]) => Alternative[];

/**
 * The fewest properties an object can have and pass, and whether every way
 * to pass with that few has the same ones
 */
export const fewestProperties: (alternatives: Alternative[]) => { count: number; exact: boolean };

/**
 * The properties every object that passes a schema's other keywords than
 * one has. It's undefined if no object passes them.
 */
export const requiredByOthers: (schemaNode: JsonSchemaNode, keywords: LoweredKeyword[], schemas: Map<string, LoweredKeyword[]>, keyword: LoweredKeyword) => Set<string> | undefined;
