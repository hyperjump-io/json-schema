import { jsonSchemaMediaTypes } from "./media-types.js";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { extendDialect } from "./dialects/extend-dialect.js";

/**
 * @import * as API from "./json-schema.d.ts"
 */

/** @type typeof API.jsonSchemaConfig */
export const jsonSchemaConfig = (options = {}) => {
  const { dialects, keywords, formats, vocabularies, defaultDialectUri, validateFormats, mediaTypes = [], ...config } = options;
  // JSON is read by the plugin that finds schemas in it, so the JSON Schema
  // media types come first, and the first plugin wins a tie
  return /** @type any */ ({
    ...config,
    mediaTypes: Object.freeze([
      ...jsonSchemaMediaTypes({ dialects, keywords, formats, vocabularies, defaultDialectUri, validateFormats }),
      ...mediaTypes
    ])
  });
};
