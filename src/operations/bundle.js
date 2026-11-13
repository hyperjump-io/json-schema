import { bundle as bundleSchema } from "../bundle/bundle.js";
import { schemaUri, sessionOf } from "./context.js";

/**
 * @import * as API from "./bundle.d.ts"
 */

/** @type typeof API.bundle */
export const bundle = async (context, schema, options = {}) => {
  const session = sessionOf(context, options);
  return bundleSchema(session, schemaUri(session, schema), options);
};
