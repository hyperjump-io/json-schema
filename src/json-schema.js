import { Hyperjump } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchemaMediaTypePlugin } from "./json-schema-media-type-plugin.js";
import { vocabulariesOf } from "./vocabularies.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword from "./keywords/unknown.js";
import { compile, keywordDefinitionUri } from "./compile.js";
import { Validator } from "./validator.js";
import { basicOutputFormat, detailedOutputFormat } from "./output-formats.js";

export { ValidationError, DetailedValidationError, InvalidSchemaError } from "./validation-error.js";

/**
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Dialect, Vocabulary } from "./dialect.d.ts"
 * @import { CompiledSchemas } from "./compile.js"
 * @import { JsonSchemaNode } from "./schema-ast.d.ts"
 * @import * as API from "./json-schema.d.ts"
 */

/**
 * @implements API.JsonSchema
 * @augments {Hyperjump<JsonSchemaNode>}
 */
export class JsonSchema extends Hyperjump {
  /** @type API.JsonSchemaConfig */
  #config;

  /** @type Record<string, Keyword> */
  #keywords;

  /** @type Record<string, Vocabulary> */
  #vocabularies;

  /** @type Record<string, Dialect> */
  #dialects;

  /** @type Partial<{ [F in API.OutputFormat]: API.OutputFormatDefinition<F> }> */
  #outputFormats;

  /**
   * Dialects whose meta-schemas are being retrieved
   *
   * @type Record<string, Promise<Dialect>>
   */
  #pendingDialects;

  /**
   * Dialects whose meta-schemas are being retrieved, mapped to the dialects
   * their meta-schemas are waiting on.
   *
   * @type Map<string, Set<string>>
   */
  #loading;

  /**
   * @param {API.JsonSchemaConfig} [config]
   */
  constructor(config = {}) {
    super(config);

    this.#config = config;
    this.#keywords = {};
    this.#vocabularies = {};
    this.#dialects = {};
    this.#pendingDialects = {};
    this.#loading = new Map();
    this.#outputFormats = {};

    // Every dialect has these
    this.addKeyword(schemaKeyword);
    this.addKeyword(unknownKeyword);

    this.addMediaTypePlugin(new JsonSchemaMediaTypePlugin(this));

    this.addOutputFormat("BASIC", basicOutputFormat);
    this.addOutputFormat("DETAILED", detailedOutputFormat);
  }

  get config() {
    return this.#config;
  }

  /** @type API.JsonSchema["addKeyword"] */
  addKeyword(keyword) {
    this.#keywords[keyword.uri] = keyword;
  }

  /** @type API.JsonSchema["getKeyword"] */
  getKeyword(uri) {
    if (!(uri in this.#keywords)) {
      throw Error(`The '${uri}' keyword isn't supported. Use the 'addKeyword' function to add support for it.`);
    }

    return this.#keywords[uri];
  }

  /** @type API.JsonSchema["addVocabulary"] */
  addVocabulary(vocabulary) {
    assertNoReservedKeywords(vocabulary.keywords);
    this.#vocabularies[vocabulary.uri] = vocabulary;
  }

  /** @type API.JsonSchema["addDialect"] */
  addDialect(dialect) {
    const uri = toAbsoluteIri(dialect.uri);
    if (uri in this.#dialects) {
      throw Error(`The '${uri}' dialect is already defined. Use the 'removeDialect' function first to replace it.`);
    }
    assertNoReservedKeywords(dialect.keywords);

    this.#dialects[uri] = { ...dialect, uri };
  }

  /** @type API.JsonSchema["extendDialect"] */
  extendDialect(uri, keywords) {
    uri = toAbsoluteIri(uri);
    const dialect = this.#dialects[uri];
    if (!dialect) {
      throw Error(`The '${uri}' dialect isn't defined`);
    }
    assertNoReservedKeywords(keywords);

    for (const name in keywords) {
      if (name === "$schema" || name in dialect.keywords) {
        throw Error(`The '${uri}' dialect already has a '${name}' keyword`);
      }
    }

    // Dialects aren't changed in place so the schemas that already use one
    // aren't affected
    this.#dialects[uri] = { ...dialect, keywords: { ...dialect.keywords, ...keywords } };
  }

  /** @type API.JsonSchema["addDialectFromVocabularies"] */
  addDialectFromVocabularies(uri, vocabularies) {
    uri = toAbsoluteIri(uri);

    /** @type Record<string, string> */
    const keywords = {};
    for (const vocabularyUri in vocabularies) {
      const vocabulary = this.#vocabularies[vocabularyUri];
      if (vocabulary) {
        Object.assign(keywords, vocabulary.keywords);
      } else if (vocabularies[vocabularyUri]) {
        throw Error(`The '${uri}' dialect requires the '${vocabularyUri}' vocabulary, which isn't supported. Use the 'addVocabulary' function to add support for it.`);
      }
    }

    /** @type Dialect */
    const dialect = { uri, keywords, unknownKeywords: "annotation" };
    this.addDialect(dialect);

    return dialect;
  }

  /** @type API.JsonSchema["hasDialect"] */
  hasDialect(uri) {
    return toAbsoluteIri(uri) in this.#dialects;
  }

  /** @type API.JsonSchema["removeDialect"] */
  removeDialect(uri) {
    delete this.#dialects[toAbsoluteIri(uri)];
  }

  /** @type API.JsonSchema["getDialect"] */
  async getDialect(uri, options = {}) {
    uri = toAbsoluteIri(uri);

    if (uri in this.#dialects) {
      return this.#dialects[uri];
    }

    // A meta-schema that's being retrieved to build a dialect is asking for
    // another dialect. If that one is waiting on this one, neither will ever
    // finish.
    const referencedFrom = options.referencedFrom === undefined ? undefined : toAbsoluteIri(options.referencedFrom);
    const waitingOn = referencedFrom === undefined ? undefined : this.#loading.get(referencedFrom);
    if (referencedFrom !== undefined && waitingOn) {
      if (this.#isWaitingOn(uri, referencedFrom)) {
        throw Error(`The meta-schemas for the '${referencedFrom}' and '${uri}' dialects depend on each other`);
      }
      waitingOn.add(uri);
    }

    this.#pendingDialects[uri] ??= this.#loadDialect(uri).finally(() => {
      delete this.#pendingDialects[uri];
    });

    return this.#pendingDialects[uri];
  }

  /** @type (uri: string, target: string, visited?: Set<string>) => boolean */
  #isWaitingOn(uri, target, visited = new Set()) {
    if (uri === target) {
      return true;
    }

    visited.add(uri);
    for (const next of this.#loading.get(uri) ?? []) {
      if (!visited.has(next) && this.#isWaitingOn(next, target, visited)) {
        return true;
      }
    }

    return false;
  }

  /** @type (uri: string) => Promise<Dialect> */
  async #loadDialect(uri) {
    this.#loading.set(uri, new Set());
    try {
      let metaSchema;
      try {
        metaSchema = await this.get(uri);
      } catch (error) {
        throw Error(`Unable to retrieve the meta-schema for the '${uri}' dialect`, { cause: error });
      }

      // A meta-schema that describes itself defines its dialect while it's
      // resolved
      if (uri in this.#dialects) {
        return this.#dialects[uri];
      }

      if (metaSchema.type !== "json-schema") {
        throw Error(`The meta-schema for the '${uri}' dialect isn't a schema. It needs to be retrieved as 'application/schema+json' or from a '.schema.json' file.`);
      }

      const vocabularies = vocabulariesOf(metaSchema);
      if (!vocabularies) {
        throw Error(`The meta-schema for the '${uri}' dialect doesn't have a '$vocabulary'. Use the 'addDialect' function to add support for this dialect.`);
      }

      return this.addDialectFromVocabularies(uri, vocabularies);
    } finally {
      this.#loading.delete(uri);
    }
  }

  /** @type API.JsonSchema["compile"] */
  async compile(uri) {
    return new Validator(this, await compile(this, uri));
  }

  /** @type API.JsonSchema["addOutputFormat"] */
  addOutputFormat(name, definition) {
    if (name === "FLAG") {
      throw Error("The FLAG output format is built in and can't be replaced");
    }

    this.#outputFormats[name] = /** @type any */ (definition);
  }

  /** @type API.JsonSchema["getOutputFormat"] */
  getOutputFormat(name) {
    const definition = this.#outputFormats[name];
    if (!definition) {
      throw Error(`The '${name}' output format isn't supported. Use the 'addOutputFormat' function to add support for it.`);
    }

    return definition;
  }

  /** @type API.JsonSchema["restoreValidator"] */
  restoreValidator(compiled) {
    const compiledSchemas = /** @type CompiledSchemas */ (compiled);
    for (const handle in compiledSchemas.schemas) {
      const schema = compiledSchemas.schemas[handle];
      if (typeof schema !== "boolean") {
        for (const [keywordUri] of schema.keywords) {
          this.getKeyword(keywordDefinitionUri(keywordUri));
        }
      }
    }

    return new Validator(this, compiledSchemas);
  }

  /** @type API.JsonSchema["validate"] */
  async validate(uri, instance, options) {
    return (await this.compile(uri)).validate(instance, options);
  }

  /** @type API.JsonSchema["validateJson"] */
  async validateJson(uri, json, options) {
    return (await this.compile(uri)).validateJson(json, options);
  }

  /** @type API.JsonSchema["annotate"] */
  async annotate(uri, instance, options) {
    return (await this.compile(uri)).annotate(instance, options);
  }

  /** @type API.JsonSchema["annotateJson"] */
  async annotateJson(uri, json, options) {
    return (await this.compile(uri)).annotateJson(json, options);
  }
}

/**
 * Keywords that start with `x-` are reserved for schema authors. They're
 * guaranteed to never collide with a keyword, so they must never assert.
 *
 * @type (keywords: Record<string, string>) => void
 */
const assertNoReservedKeywords = (keywords) => {
  for (const name in keywords) {
    if (name.startsWith("x-")) {
      throw Error(`'${name}' can't be a keyword. Keywords starting with 'x-' are reserved for schema authors and must never assert.`);
    }
  }
};
