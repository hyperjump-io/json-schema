import { jrefMediaType } from "@hyperjump/browser";
import { defaultStack } from "#default-stack";
import { toId } from "./identifiers.js";
import { schemaMediaType } from "./schema/media-type-plugin.js";
import { jsonOrSchemaMediaType } from "./schema/json-media-type-plugin.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword from "./keywords/unknown.js";
import { assertNoReservedKeywords, withValidateFormats } from "./dialects/extend-dialect.js";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { extendDialect } from "./dialects/extend-dialect.js";

/**
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Format } from "./format.d.ts"
 * @import { Dialect, DialectConfig, Vocabulary, VocabularyConfig } from "./dialect.d.ts"
 * @import * as API from "./json-schema.d.ts"
 */

/**
 * @template T
 * @param {T[] | undefined} array
 * @returns {T[] | undefined}
 */
const frozenCopy = (array) => array && /** @type T[] */ (Object.freeze([...array]));

/**
 * The definitions a `JsonSchema` is building, by URI. Each one has no
 * prototype, so a URI like `constructor` isn't found in it.
 *
 * @typedef {{
 *   keywords: Record<string, Keyword>;
 *   formats: Record<string, Format>;
 *   dialects: Record<string, Dialect>;
 *   vocabularies: Record<string, Vocabulary>;
 * }} Tables
 */

/** @type typeof API.configureJsonSchema */
export const configureJsonSchema = (config = {}) => {
  // Its media types come before the config's, and the first plugin wins
  // a tie, so JSON is always read by the plugin that finds schemas in it,
  // even when the config has browser's defaults. The config is a frozen
  // copy, with frozen copies of its lists, so changing the object it was
  // created with doesn't change it.
  const frozenConfig = Object.freeze({
    ...config,
    mediaTypes: Object.freeze([schemaMediaType, jsonOrSchemaMediaType, jrefMediaType, ...config.mediaTypes ?? []]),
    dialects: frozenCopy(config.dialects),
    keywords: frozenCopy(config.keywords),
    formats: frozenCopy(config.formats),
    vocabularies: config.vocabularies && Object.freeze({ ...config.vocabularies })
  });

  /** @type Tables */
  const tables = {
    keywords: Object.create(null),
    formats: Object.create(null),
    dialects: Object.create(null),
    vocabularies: Object.create(null)
  };

  // The config's definitions come first, so one that replaces a
  // dialect's stays replaced, whatever order the dialects are in
  for (const keyword of config.keywords ?? []) {
    tables.keywords[keyword.uri] = keyword;
  }
  for (const format of config.formats ?? []) {
    tables.formats[format.uri] = format;
  }

  // Every dialect has these
  addDefinition(tables.keywords, schemaKeyword);
  addDefinition(tables.keywords, unknownKeyword);

  for (const uri in config.vocabularies) {
    tables.vocabularies[toId(uri)] = addVocabulary(tables, config.vocabularies[uri]);
  }
  for (const dialect of config.dialects ?? []) {
    addDialect(tables, dialect, frozenConfig);
  }

  // A dialect can name a keyword by URI that another dialect or the config
  // defines, so this waits until they're all added
  for (const dialect of Object.values(tables.dialects)) {
    assertDefined(tables.keywords, dialect.keywords, `'${dialect.uri}' dialect`);
  }
  for (const uri in tables.vocabularies) {
    assertDefined(tables.keywords, tables.vocabularies[uri].keywords, `'${uri}' vocabulary`);
  }

  return /** @type any */ (Object.freeze({
    config: frozenConfig,
    // Every session shares it, so what one retrieves over HTTP is cached
    // for the next
    stack: config.stack ?? defaultStack(),
    keywords: Object.freeze(tables.keywords),
    formats: Object.freeze(tables.formats),
    dialects: Object.freeze(tables.dialects),
    vocabularies: Object.freeze(tables.vocabularies)
  }));
};

/**
 * Register a definition a dialect or vocabulary brings, unless one with its
 * URI already is, and name it by URI
 *
 * @type <D extends { uri: string }>(table: Record<string, D>, definition: D | string) => string
 */
const addDefinition = (table, definition) => {
  if (typeof definition === "string") {
    return definition;
  }
  table[definition.uri] ??= definition;
  return definition.uri;
};

/** @type <D extends { uri: string }>(table: Record<string, D>, definitions: Record<string, D | string>) => Record<string, string> */
const addDefinitions = (table, definitions) => {
  /** @type Record<string, string> */
  const uris = {};
  for (const name in definitions) {
    uris[name] = addDefinition(table, definitions[name]);
  }
  return uris;
};

/** @type (tables: Tables, vocabulary: VocabularyConfig) => Vocabulary */
const addVocabulary = (tables, { keywords, formats, assertFormats }) => {
  assertNoReservedKeywords(keywords);

  /** @type Vocabulary */
  const vocabulary = { keywords: addDefinitions(tables.keywords, keywords) };
  if (formats !== undefined) {
    vocabulary.formats = addDefinitions(tables.formats, formats);
  }
  if (assertFormats !== undefined) {
    vocabulary.assertFormats = assertFormats;
  }
  return vocabulary;
};

/**
 * A dialect is kept with its definitions named by URI, which is how
 * everything reads it.
 *
 * @type (tables: Tables, dialect: DialectConfig, config: API.JsonSchemaConfig) => void
 */
const addDialect = (tables, { vocabularies, ...dialect }, config) => {
  const uri = toId(dialect.uri);
  if (uri in tables.dialects) {
    throw Error(`The '${uri}' dialect is in the config more than once`);
  }
  assertNoReservedKeywords(dialect.keywords);

  for (const vocabularyUri in vocabularies) {
    tables.vocabularies[toId(vocabularyUri)] ??= addVocabulary(tables, vocabularies[vocabularyUri]);
  }

  const { formats, ...rest } = dialect;
  /** @type Dialect */
  const added = withValidateFormats({ ...rest, uri, keywords: addDefinitions(tables.keywords, dialect.keywords) }, config);
  if (formats !== undefined) {
    added.formats = addDefinitions(tables.formats, formats);
  }
  tables.dialects[uri] = added;
};

/** @type (defined: Record<string, Keyword>, keywords: Readonly<Record<string, string>>, definedIn: string) => void */
const assertDefined = (defined, keywords, definedIn) => {
  for (const name in keywords) {
    if (!(keywords[name] in defined)) {
      throw Error(`The ${definedIn} has no definition for the '${keywords[name]}' keyword. Add it to the dialect or the 'keywords' config.`);
    }
  }
};
