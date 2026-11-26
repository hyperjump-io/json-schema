/**
 * @import { Dialect } from "../dialect.d.ts"
 * @import * as API from "../json-schema.d.ts"
 */

/** @type typeof API.extendDialect */
export const extendDialect = (dialect, { keywords = {}, formats = {} }) => {
  assertNoReservedKeywords(keywords);

  for (const name in keywords) {
    if (name === "$schema" || Object.hasOwn(dialect.keywords, name)) {
      throw Error(`The '${dialect.uri}' dialect already has a '${name}' keyword`);
    }
  }

  const dialectFormats = dialect.formats ?? {};
  for (const name in formats) {
    if (Object.hasOwn(dialectFormats, name)) {
      throw Error(`The '${dialect.uri}' dialect already has a '${name}' format`);
    }
  }

  return {
    ...dialect,
    keywords: /** @type any */ ({ ...dialect.keywords, ...keywords }),
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

/**
 * A dialect as it's used: the `validateFormats` option, if there is one,
 * decides whether `format` validates, instead of the dialect
 *
 * @type (dialect: Dialect, options: { validateFormats?: boolean }) => Dialect
 */
export const withValidateFormats = (dialect, options) => {
  return options.validateFormats === undefined ? dialect : { ...dialect, assertFormats: options.validateFormats };
};
