import type { JsonType } from "@hyperjump/browser/json";
import type { LintDocument } from "./document.d.ts";
import type { JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts";

/**
 * The types of value a `format` keyword's format applies to, from the
 * format's definition (`types`). The format is found by the URI the
 * schema's dialect maps its name to, so it works whatever a dialect names
 * it. It's undefined if the keyword isn't `format`, the dialect doesn't
 * support the format, its definition isn't in the config, or the definition
 * doesn't say, because then the format could apply to any type.
 */
export const formatTypes: (
  document: LintDocument,
  schemaNode: JsonSchemaNode,
  keywordNode: JsonSchemaKeywordNode
) => JsonType[] | undefined;
