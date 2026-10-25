import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

export type UnknownKeywordOptions = {
  /** Names of unknown keywords that aren't reported, like `"x-internal"` */
  ignore?: string[];
};

/**
 * A property of a schema that isn't a keyword in its dialect, which is
 * usually a misspelling. If a keyword in the dialect is close to it, the
 * message suggests it. In draft-04 through draft-07, an unknown keyword has
 * no effect, and in 2019-09 and 2020-12 it's an annotation, so either way,
 * a misspelled keyword doesn't do what it was meant to.
 *
 * Not reported: names in the `ignore` option, `$comment` in a dialect
 * without it (it's a comment for lint anyway), `definitions` or `$defs` in a
 * dialect with the other, which `misnamed-definitions` reports, and unknown
 * keywords in a dialect where they're schema errors (v1), which the
 * resolver reports, and where `x-` keywords are allowed.
 *
 * ```js
 * [unknownKeyword, ["warn", { ignore: ["x-internal", "tsType"] }]]
 * ```
 */
declare const unknownKeywordRule: Plugin<JsonSchemaDocumentNode, UnknownKeywordOptions | void>;
export default unknownKeywordRule;
