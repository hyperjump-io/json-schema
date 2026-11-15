import { bundle as bundleSchema } from "../bundle/bundle.js";
import { schemaUri } from "./schema-source.js";
import { JsonSchemaHyperjump } from "../session.js";

/**
 * @import * as API from "./bundle.d.ts"
 */

/** @type typeof API.bundle */
export const bundle = async (jsonSchema, schema, options = {}) => {
  const session = new JsonSchemaHyperjump(jsonSchema, options);
  return bundleSchema(session, schemaUri(session, schema), options);
};
