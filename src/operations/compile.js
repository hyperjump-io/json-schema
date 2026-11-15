import { lower } from "../kernel/lower.js";
import { Validator } from "../kernel/validator.js";
import { withResolvedUris } from "../kernel/kernel-uris.js";
import { schemaReads } from "../kernel/kernel.js";
import { kernelDefinitions } from "../kernel/definitions.js";
import { callSession } from "./call-session.js";
import { definitionsOf } from "../definition-of.js";

/**
 * @import { Kernel } from "../kernel/kernel.d.ts"
 * @import * as API from "./compile.d.ts"
 */

/** @type typeof API.compile */
export const compile = async (config, schema, options) => {
  const { session, uri } = callSession(config, schema, options);
  const kernel = await lower(session, uri);
  return /** @type any */ (new Validator(kernelDefinitions(definitionsOf(config), kernel), kernel));
};

/** @type typeof API.serialize */
export const serialize = (compiled) => /** @type Validator */ (/** @type unknown */ (compiled)).serialize();

/** @type typeof API.restore */
export const restore = (config, serialized, options = {}) => {
  const kernel = /** @type Kernel */ (serialized);
  const version = typeof serialized === "object" && serialized !== null && !Array.isArray(serialized) ? kernel.kernel : undefined;
  if (version !== 1) {
    throw Error(`Can't restore a compiled schema in kernel version ${JSON.stringify(version)}. This version of the library only supports version 1.`);
  }

  // What's read is worked out again rather than trusted, because an
  // evaluator that doesn't track what an expression reads fails
  /** @type Kernel["reads"] */
  const reads = { evaluated: [], dynamicScope: [] };
  for (const handle in kernel.schemas) {
    const schema = kernel.schemas[handle];
    for (const state of schemaReads(schema)) {
      reads[state].push(handle);
    }
  }

  // Plugins see each keyword's definition, asserting formats are
  // validated with theirs, and escape hatches by their keyword's `evaluate`
  const restored = withResolvedUris({ ...kernel, reads }, options.uri);
  return /** @type any */ (new Validator(kernelDefinitions(definitionsOf(config), restored), restored));
};
