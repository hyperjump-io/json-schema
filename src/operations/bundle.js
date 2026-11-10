import { bundle as bundleSchema } from "../bundle/bundle.js";
import { schemaErrorOf, schemaUri, sessionOf } from "./context.js";

/**
 * @import * as API from "./bundle.d.ts"
 */

/** @type typeof API.bundle */
export const bundle = async (context, schema, options = {}) => {
  const session = sessionOf(context, options);
  try {
    return await bundleSchema(session, schemaUri(session, schema), options);
  } catch (error) {
    throw schemaErrorOf(error);
  }
};
