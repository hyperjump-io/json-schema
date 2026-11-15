/**
 * @import { Format } from "./format.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 * @import { HyperjumpConfig } from "@hyperjump/browser"
 * @import { JsonSchemaDefinitions } from "./json-schema.d.ts"
 */

// Looking up the definitions a schema needs: a config's, and a keyword or
// format in them. They aren't part of the API.

/**
 * @type (keywords: Readonly<Record<string, Keyword>>, uri: string) => Keyword
 * @throws Error if there's no definition for the keyword
 */
export const keywordOf = (keywords, uri) => {
  if (!(uri in keywords)) {
    throw Error(`The '${uri}' keyword isn't supported. Add it to the dialect or the 'keywords' option of jsonSchemaConfig.`);
  }

  return keywords[uri];
};

/**
 * @type (formats: Readonly<Record<string, Format>>, uri: string) => Format
 * @throws Error if there's no definition for the format
 */
export const formatOf = (formats, uri) => {
  if (!(uri in formats)) {
    throw Error(`The '${uri}' format isn't supported. Add it to the dialect or the 'formats' option of jsonSchemaConfig.`);
  }

  return formats[uri];
};

/**
 * The definitions of the JSON Schema media types in a config, from
 * `jsonSchemaMediaTypes`, which are on its schema plugin
 *
 * @type (config: HyperjumpConfig) => JsonSchemaDefinitions
 * @throws TypeError if the config doesn't have them
 */
export const definitionsOf = (config) => {
  const definitions = definitionsIn(config);
  if (!definitions) {
    throw TypeError("The config has no JSON Schema media types. Make it with 'jsonSchemaConfig({ dialects })'.");
  }
  return definitions;
};

/**
 * A config's JSON Schema definitions, if it has them
 *
 * @type (config: HyperjumpConfig) => JsonSchemaDefinitions | undefined
 */
export const definitionsIn = (config) => {
  for (const plugin of config.mediaTypes ?? []) {
    if ("definitions" in plugin) {
      return /** @type JsonSchemaDefinitions */ (plugin.definitions);
    }
  }
};
