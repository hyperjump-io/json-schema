/**
 * @import { Format } from "./format.d.ts"
 * @import { Keyword } from "./keyword.d.ts"
 */

// Looking up a definition a schema needs, in a JsonSchema's `keywords` or
// `formats`. They aren't part of the API.

/**
 * @type (keywords: Readonly<Record<string, Keyword>>, uri: string) => Keyword
 * @throws Error if there's no definition for the keyword
 */
export const keywordOf = (keywords, uri) => {
  if (!(uri in keywords)) {
    throw Error(`The '${uri}' keyword isn't supported. Add it to the dialect or the 'keywords' config.`);
  }

  return keywords[uri];
};

/**
 * @type (formats: Readonly<Record<string, Format>>, uri: string) => Format
 * @throws Error if there's no definition for the format
 */
export const formatOf = (formats, uri) => {
  if (!(uri in formats)) {
    throw Error(`The '${uri}' format isn't supported. Add it to the dialect or the 'formats' config.`);
  }

  return formats[uri];
};
