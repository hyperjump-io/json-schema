import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `default` value, or a value in `examples`, that isn't valid against the
 * schema it's in. Tools use them as values to start with or to show, so an
 * invalid one misleads, and it's often out of date with the schema. The
 * specs recommend that they be valid, so it's lint. Draft-04 doesn't say,
 * but it's a mistake there too.
 *
 * The schema is compiled with the session it was resolved in, the way it's
 * used, including what it references, and formats are validated as the
 * configuration says. A schema that can't be compiled isn't checked. Values
 * are checked against the schema they're in, not the schemas around it,
 * like one with an `allOf` that includes it.
 *
 * It compiles each schema with a `default` or `examples`, so it can be
 * expensive on large schemas, and it isn't in `recommended`. It has no
 * options.
 */
declare const invalidDefaultOrExample: Plugin<JsonSchemaDocumentNode, void>;
export default invalidDefaultOrExample;
