import { bundle as bundleSchema } from "../bundle/bundle.js";
import { callSession } from "./call-session.js";

/**
 * @import * as API from "./bundle.d.ts"
 */

/** @type typeof API.bundle */
export const bundle = async (config, schema, options = {}) => {
  const { session, uri } = callSession(config, schema, options);
  return bundleSchema(session, uri, options);
};
