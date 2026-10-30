import { lower } from "../kernel/lower.js";
import { Validator } from "../kernel/validator.js";
import { withResolvedUris } from "../kernel/kernel-uris.js";
import { schemaReads, subexpressions } from "../kernel/kernel.js";
import { keywordEvaluate } from "../kernel/fast.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { schemaUri, sessionOf } from "./context.js";

/**
 * @import { Expression, Kernel } from "../kernel/kernel.d.ts"
 * @import * as API from "./compile.d.ts"
 */

/** @type API.compile */
export const compile = async (context, schema, options) => {
  const session = sessionOf(context, options);
  return /** @type any */ (new Validator(session.jsonSchema, await lower(session, schemaUri(session, schema))));
};

/** @type API.serialize */
export const serialize = (compiled) => /** @type Validator */ (/** @type unknown */ (compiled)).serialize();

/** @type API.restore */
export const restore = (jsonSchema, serialized, options = {}) => {
  const kernel = /** @type Kernel */ (serialized);
  const version = typeof serialized === "object" && serialized !== null && !Array.isArray(serialized) ? kernel.kernel : undefined;
  if (version !== 1) {
    throw Error(`Can't restore a compiled schema in kernel version ${JSON.stringify(version)}. This version of the library only supports version 1.`);
  }

  // Plugins see each keyword's definition, asserting formats are
  // validated with theirs, and escape hatches by their keyword's
  // `evaluate`
  /** @type (expression: Expression) => void */
  const checkDefinitions = (expression) => {
    if (expression.op === "format" && expression.assert) {
      jsonSchema.getFormat(/** @type string */ (expression.uri));
    } else if (expression.op === "predicate" || expression.op === "opaque") {
      keywordEvaluate(jsonSchema, expression.keyword);
    }
    subexpressions(expression).forEach(checkDefinitions);
  };

  // What's read is worked out again rather than trusted, because an
  // evaluator that doesn't track what an expression reads fails
  /** @type Kernel["reads"] */
  const reads = { evaluated: [], dynamicScope: [] };
  for (const handle in kernel.schemas) {
    const schema = kernel.schemas[handle];
    if (typeof schema !== "boolean") {
      for (const { keywordUri, expression } of schema.keywords) {
        jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
        checkDefinitions(expression);
      }
    }
    for (const state of schemaReads(schema)) {
      reads[state].push(handle);
    }
  }

  return /** @type any */ (new Validator(jsonSchema, withResolvedUris({ ...kernel, reads }, options.uri)));
};
