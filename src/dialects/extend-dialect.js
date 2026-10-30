/**
 * @import * as API from "../json-schema.d.ts"
 */

/** @type API.extendDialect */
export const extendDialect = (dialect, { keywords = {}, formats = {} }) => {
  assertNoReservedKeywords(keywords);

  for (const name in keywords) {
    if (name === "$schema" || name in dialect.keywords) {
      throw Error(`The '${dialect.uri}' dialect already has a '${name}' keyword`);
    }
  }

  const dialectFormats = dialect.formats ?? {};
  for (const name in formats) {
    if (name in dialectFormats) {
      throw Error(`The '${dialect.uri}' dialect already has a '${name}' format`);
    }
  }

  return {
    ...dialect,
    keywords: { ...dialect.keywords, ...keywords },
    formats: { ...dialectFormats, ...formats }
  };
};

/**
 * Keywords that start with `x-` are reserved for schema authors. They're
 * guaranteed to never collide with a keyword, so they must never assert.
 *
 * @type (keywords: Record<string, unknown>) => void
 */
export const assertNoReservedKeywords = (keywords) => {
  for (const name in keywords) {
    if (name.startsWith("x-")) {
      throw Error(`'${name}' can't be a keyword. Keywords starting with 'x-' are reserved for schema authors and must never assert.`);
    }
  }
};
