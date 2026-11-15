import { bundle as bundleSchema } from "../bundle/bundle.js";
import { schemaUri } from "./schema-source.js";
import { callSession } from "./call-session.js";

/**
 * @import * as API from "./bundle.d.ts"
 */

/** @type typeof API.bundle */
export const bundle = async (config, schema, options = {}) => {
  const session = callSession(config, options);
  return bundleSchema(session, schemaUri(session, schema), options);
};
