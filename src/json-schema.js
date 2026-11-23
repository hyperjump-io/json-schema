import { compose, defaultStack, httpCache as httpCacheLayer } from "@hyperjump/browser";
import { jsonSchemaMediaTypes } from "./media-types.js";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { extendDialect } from "./dialects/extend-dialect.js";

/**
 * @import * as API from "./json-schema.d.ts"
 */

/** @type typeof API.jsonSchemaConfig */
export const jsonSchemaConfig = (options = {}) => {
  const { dialects, keywords, formats, vocabularies, validateFormats, mediaTypes = [], httpCache, ...config } = options;

  // The cache is made here, so every session made from the config shares it
  if (httpCache !== undefined) {
    config.stack = compose(httpCacheLayer({ store: httpCache }))(config.stack ?? defaultStack());
  }

  // JSON is read by the plugin that finds schemas in it, so the JSON Schema
  // media types come first, and the first plugin wins a tie
  return /** @type any */ ({
    ...config,
    mediaTypes: Object.freeze([
      ...jsonSchemaMediaTypes({ dialects, keywords, formats, vocabularies, validateFormats }),
      ...mediaTypes
    ])
  });
};
