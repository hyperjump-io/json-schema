import { encodeIriFragment } from "@hyperjump/uri";
import { toId } from "./identifiers.js";
import { definitionsOf } from "./definition-of.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";

/**
 * @import * as API from "./annotation.d.ts"
 */

// Not imported from the v1 dialect, which would load all of its keywords
const v1DialectUri = "https://json-schema.org/v1";

/** @type typeof API.annotation */
export const annotation = (config, node, keyword, dialectUri = v1DialectUri) => {
  const values = node.data?.annotations?.get(keywordUri(config, keyword, dialectUri)) ?? [];
  return /** @type any[] */ (values);
};

/**
 * A keyword URI is used as it is, so it doesn't need the dialect. An
 * unknown keyword's URI has its name as the fragment, and its definition is
 * registered without it. A name that isn't a keyword in the dialect is an
 * unknown keyword.
 *
 * @type (config: Parameters<typeof API.annotation>[0], keyword: string, dialectUri: string) => string
 */
const keywordUri = (config, keyword, dialectUri) => {
  const definitions = definitionsOf(config);
  if (keywordDefinitionUri(keyword) in definitions.keywords) {
    return keyword;
  }

  const id = toId(dialectUri);
  const dialect = definitions.dialects[id];
  if (!dialect) {
    throw Error(`The '${id}' dialect isn't one the JSON Schema media types were made with. Read an annotation of a dialect a meta-schema defines by its keyword URI.`);
  }

  return Object.hasOwn(dialect.keywords, keyword)
    ? dialect.keywords[keyword]
    : `${unknownKeyword.uri}#${encodeIriFragment(keyword)}`;
};
