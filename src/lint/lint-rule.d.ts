import type { Meta, Plugin, Rule } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts";

/**
 * Makes a lint rule. It's `unified-lint-rule`'s `lintRule`, so the rule's
 * config is a severity and its options, and its origin
 * (`<source>:<ruleId>`) identifies its messages.
 *
 * It also applies configuration comments. A `$comment` that starts with
 * `json-schema-lint-disable` turns rules off for the schema it's in,
 * including its subschemas, and one that starts with
 * `json-schema-lint-enable` turns them back on. Rule IDs after it, separated
 * by spaces, are the rules it covers. Without any, it covers every rule. A
 * rule is named by its rule ID, without its source. The innermost schema
 * with a directive that covers a rule decides whether it's on.
 *
 * ```json
 * {
 *   "$comment": "json-schema-lint-disable then-else-without-if",
 *   "then": true,
 *   "properties": {
 *     "foo": { "$comment": "json-schema-lint-enable then-else-without-if", "then": true }
 *   }
 * }
 * ```
 *
 * `$comment` is a comment in every dialect, including ones without it, such
 * as draft-04, where it's an unknown keyword.
 *
 * A directive that names a rule that isn't used is a warning
 * (`unknown-rule`), and so is a `$comment` that starts with
 * `json-schema-lint-` but isn't a directive (`unknown-directive`). A rule is
 * used if it's made with this function and added to the processor, even if
 * it's off.
 *
 * Directives are applied to each rule's messages as it finishes, so they
 * work whatever order rules are used in. A message without a position can't
 * be turned off. A rule made with `unified-lint-rule` directly ignores
 * directives.
 *
 * Then the rule's messages are put in document order, by where they start,
 * so a rule can report things in whatever order it finds them. Messages in
 * the same place stay in the order they were reported, and ones without a
 * position go last.
 */
export const lintRule: <Option = unknown>(meta: Meta | string, rule: Rule<JsonSchemaDocumentNode, Option>) => Plugin<JsonSchemaDocumentNode, Option>;
