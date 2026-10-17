import { siblingKeyword } from "./utilities.js";

/**
 * @import { Keyword, SchemaHandle } from "../keyword.d.ts"
 */

/**
 * `if`. It evaluates the sibling `then` if it passes and the sibling `else`
 * if it doesn't, so `if` is only evaluated once. Errors from `then` and
 * `else` have their own keyword locations.
 *
 * @type Keyword<{ if: SchemaHandle; then: SchemaHandle | null; else: SchemaHandle | null }>
 */
export default {
  uri: "https://json-schema.org/keyword/if",
  shape: "schema",
  async compile(valueNode, context) {
    const thenNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/then");
    const elseNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/else");

    return {
      if: await context.compileSchema(valueNode),
      then: thenNode === undefined ? null : await context.compileSchema(thenNode),
      else: elseNode === undefined ? null : await context.compileSchema(elseNode)
    };
  },
  evaluate(compiled, { schema }) {
    const evaluateIf = schema(compiled.if);
    const evaluateThen = compiled.then === null ? undefined : schema(compiled.then);
    const evaluateElse = compiled.else === null ? undefined : schema(compiled.else);

    return (node) => {
      const evaluate = evaluateIf(node) ? evaluateThen : evaluateElse;
      return evaluate === undefined || evaluate(node);
    };
  },
  simpleApplicator: true
};
