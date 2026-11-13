import { jrefMediaType } from "@hyperjump/browser";
import { defaultStack } from "#default-stack";
import { toId } from "./identifiers.js";
import { schemaMediaType } from "./schema/media-type-plugin.js";
import { jsonOrSchemaMediaType } from "./schema/json-media-type-plugin.js";
import { createSession } from "./session.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
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

/** @implements API.JsonSchema */
export class JsonSchema {
  /** @type Record<string, Keyword> */
  #keywords;

  /** @type Record<string, Format> */
  #formats;

  /** @type Record<string, Dialect> */
  #dialects;

  /** @type Record<string, Vocabulary> */
  #vocabularies;

  /** @type API.JsonSchema["registry"] */
  registry;

  /** @type API.JsonSchema["config"] */
  config;

  /** @type API.JsonSchema["stack"] */
  stack;

  /**
   * @param {API.JsonSchemaConfig} [config]
   */
  constructor(config = {}) {
    // Its media types come before the config's, and the first plugin wins
    // a tie, so JSON is always read by the plugin that finds schemas in it,
    // even when the config has browser's defaults. The config is a frozen
    // copy, with frozen copies of its lists, so changing the object it was
    // created with doesn't change it.
    this.config = Object.freeze({
      ...config,
      mediaTypes: Object.freeze([schemaMediaType, jsonOrSchemaMediaType, jrefMediaType, ...config.mediaTypes ?? []]),
      dialects: frozenCopy(config.dialects),
      keywords: frozenCopy(config.keywords),
      formats: frozenCopy(config.formats),
      vocabularies: config.vocabularies && Object.freeze({ ...config.vocabularies })
    });

    // Every session shares it, so what one retrieves over HTTP is cached
    // for the next
    this.stack = config.stack ?? defaultStack();

    this.#keywords = {};
    this.#formats = {};
    this.#dialects = {};
    this.#vocabularies = {};
    this.registry = new SchemaRegistry();

    // The config's definitions come first, so one that replaces a
    // dialect's stays replaced, whatever order the dialects are in
    for (const keyword of config.keywords ?? []) {
      this.#keywords[keyword.uri] = keyword;
    }
    for (const format of config.formats ?? []) {
      this.#formats[format.uri] = format;
    }

    // Every dialect has these
    this.#addKeyword(schemaKeyword);
    this.#addKeyword(unknownKeyword);

    for (const uri in config.vocabularies) {
      this.#vocabularies[toId(uri)] = this.#addVocabulary(config.vocabularies[uri]);
    }
    for (const dialect of config.dialects ?? []) {
      this.#addDialect(dialect);
    }

    // A dialect can name a keyword by URI that another dialect or the config
    // defines, so this waits until they're all added
    for (const dialect of Object.values(this.#dialects)) {
      this.#assertDefined(dialect.keywords, `'${dialect.uri}' dialect`);
    }
    for (const uri in this.#vocabularies) {
      this.#assertDefined(this.#vocabularies[uri].keywords, `'${uri}' vocabulary`);
    }
  }

  /** @type API.JsonSchema["session"] */
  session(options) {
    return createSession(this, options);
  }

  /** @type API.JsonSchema["hasKeyword"] */
  hasKeyword(uri) {
    return uri in this.#keywords;
  }

  /** @type API.JsonSchema["getKeyword"] */
  getKeyword(uri) {
    if (!(uri in this.#keywords)) {
      throw Error(`The '${uri}' keyword isn't supported. Add it to the dialect or the 'keywords' config.`);
    }

    return this.#keywords[uri];
  }

  /** @type API.JsonSchema["hasFormat"] */
  hasFormat(uri) {
    return uri in this.#formats;
  }

  /** @type API.JsonSchema["getFormat"] */
  getFormat(uri) {
    if (!(uri in this.#formats)) {
      throw Error(`The '${uri}' format isn't supported. Add it to the dialect or the 'formats' config.`);
    }

    return this.#formats[uri];
  }

  /** @type API.JsonSchema["hasDialect"] */
  hasDialect(uri) {
    return toId(uri) in this.#dialects;
  }

  /** @type API.JsonSchema["getDialect"] */
  getDialect(uri) {
    uri = toId(uri);
    if (!(uri in this.#dialects)) {
      throw Error(`The '${uri}' dialect isn't defined`);
    }

    return this.#dialects[uri];
  }

  /** @type API.JsonSchema["getVocabulary"] */
  getVocabulary(uri) {
    return this.#vocabularies[toId(uri)];
  }

  /**
   * Register a definition a dialect or vocabulary brings, unless one with its
   * URI already is, and name it by URI
   *
   * @type (keyword: Keyword<any, any, any> | string) => string
   */
  #addKeyword(keyword) {
    if (typeof keyword === "string") {
      return keyword;
    }
    this.#keywords[keyword.uri] ??= keyword;
    return keyword.uri;
  }

  /** @type (format: Format | string) => string */
  #addFormat(format) {
    if (typeof format === "string") {
      return format;
    }
    this.#formats[format.uri] ??= format;
    return format.uri;
  }

  /** @type (definitions: Record<string, Keyword<any, any, any> | string>) => Record<string, string> */
  #addKeywords(definitions) {
    /** @type Record<string, string> */
    const uris = {};
    for (const name in definitions) {
      uris[name] = this.#addKeyword(definitions[name]);
    }
    return uris;
  }

  /** @type (definitions: Record<string, Format | string>) => Record<string, string> */
  #addFormats(definitions) {
    /** @type Record<string, string> */
    const uris = {};
    for (const name in definitions) {
      uris[name] = this.#addFormat(definitions[name]);
    }
    return uris;
  }

  /** @type (vocabulary: VocabularyConfig) => Vocabulary */
  #addVocabulary({ keywords, formats, assertFormats }) {
    assertNoReservedKeywords(keywords);

    /** @type Vocabulary */
    const vocabulary = { keywords: this.#addKeywords(keywords) };
    if (formats !== undefined) {
      vocabulary.formats = this.#addFormats(formats);
    }
    if (assertFormats !== undefined) {
      vocabulary.assertFormats = assertFormats;
    }
    return vocabulary;
  }

  /**
   * A dialect is kept with its definitions named by URI, which is how
   * everything reads it.
   *
   * @type (dialect: DialectConfig) => void
   */
  #addDialect({ vocabularies, ...dialect }) {
    const uri = toId(dialect.uri);
    if (uri in this.#dialects) {
      throw Error(`The '${uri}' dialect is in the config more than once`);
    }
    assertNoReservedKeywords(dialect.keywords);

    for (const vocabularyUri in vocabularies) {
      this.#vocabularies[toId(vocabularyUri)] ??= this.#addVocabulary(vocabularies[vocabularyUri]);
    }

    const { formats, ...rest } = dialect;
    /** @type Dialect */
    const added = withValidateFormats({ ...rest, uri, keywords: this.#addKeywords(dialect.keywords) }, this.config);
    if (formats !== undefined) {
      added.formats = this.#addFormats(formats);
    }
    this.#dialects[uri] = added;
  }

  /** @type (keywords: Readonly<Record<string, string>>, definedIn: string) => void */
  #assertDefined(keywords, definedIn) {
    for (const name in keywords) {
      if (!(keywords[name] in this.#keywords)) {
        throw Error(`The ${definedIn} has no definition for the '${keywords[name]}' keyword. Add it to the dialect or the 'keywords' config.`);
      }
    }
  }
}
