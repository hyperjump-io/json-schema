import { Hyperjump } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { defaultAllowRetrieval, realUrl } from "#retrieval";
import { RetrievalNotAllowedError } from "./retrieval/retrieval-not-allowed-error.js";
import { JsonSchemaMediaTypePlugin } from "./schema/media-type-plugin.js";
import { JsonSchemaSession } from "./session.js";
import { addedRegistriesOf } from "./registry/session-registries.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";
import { Validator } from "./evaluate/validator.js";
import { basicOutputFormat } from "./output/basic.js";
import { detailedOutputFormat } from "./output/detailed.js";

export { ValidationError, DetailedValidationError, InvalidSchemaError } from "./output/validation-error.js";
export { RetrievalNotAllowedError } from "./retrieval/retrieval-not-allowed-error.js";

/**
 * @import { GetOptions } from "@hyperjump/browser"
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Format } from "./format.d.ts"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { CompiledSchemas } from "./evaluate/compile.js"
 * @import { JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import * as API from "./json-schema.d.ts"
 * @import { OutputFormat, OutputFormatDefinition } from "./output/output-format.d.ts"
 */

/** @type (allowRetrieval: API.AllowRetrieval, uri: string, requestedUri?: string) => Promise<void> */
const checkRetrieval = async (allowRetrieval, uri, requestedUri) => {
  if (!await allowRetrieval(await realUrl(new URL(uri)))) {
    throw requestedUri === undefined
      ? new RetrievalNotAllowedError(uri)
      : new RetrievalNotAllowedError(uri, `Retrieving '${requestedUri}' led to '${uri}', which isn't allowed. Use the 'allowRetrieval' config to allow it.`);
  }
};

/**
 * @implements API.JsonSchema
 * @augments {Hyperjump<JsonSchemaNode>}
 */
export class JsonSchema extends Hyperjump {
  /** @type API.JsonSchemaConfig */
  #config;

  /** @type Record<string, Keyword> */
  #keywords;

  /** @type Record<string, Format> */
  #formats;

  /** @type Record<string, Dialect> */
  #dialects;

  /** @type Partial<{ [F in OutputFormat]: OutputFormatDefinition<F> }> */
  #outputFormats;

  /**
   * @param {API.JsonSchemaConfig} [config]
   */
  constructor(config = {}) {
    super(config);

    this.#config = config;
    this.#keywords = {};
    this.#formats = {};
    this.#dialects = {};
    this.#outputFormats = {};

    // Every dialect has these
    this.addKeyword(schemaKeyword);
    this.addKeyword(unknownKeyword);

    this.addMediaTypePlugin(new JsonSchemaMediaTypePlugin());

    this.addOutputFormat("BASIC", basicOutputFormat);
    this.addOutputFormat("DETAILED", detailedOutputFormat);
  }

  get config() {
    return this.#config;
  }

  /**
   * Every retrieval comes through here, after embedded resources and
   * registries and before the URI scheme plugins and their HTTP cache. The
   * response is checked too, because a redirect can lead somewhere else.
   *
   * browser's `Session` passes on the options `getDocument` got, so a
   * `JsonSchemaSession` adds its own `allowRetrieval` to them.
   *
   * @param {string} uri
   * @param {GetOptions & { allowRetrieval?: API.AllowRetrieval }} options
   * @returns {Promise<Response>}
   */
  async retrieve(uri, options) {
    const allowRetrieval = options.allowRetrieval ?? this.#config.allowRetrieval ?? defaultAllowRetrieval;
    await checkRetrieval(allowRetrieval, toAbsoluteIri(uri));
    const response = await super.retrieve(uri, options);

    if (response.url && response.url !== toAbsoluteIri(uri)) {
      try {
        await checkRetrieval(allowRetrieval, response.url, uri);
      } catch (error) {
        await response.body?.cancel();
        throw error;
      }
    }

    return response;
  }

  /** @type API.JsonSchema["session"] */
  session(options) {
    return new JsonSchemaSession(this, options);
  }

  /** @type API.JsonSchema["addRegistry"] */
  addRegistry(registry) {
    const registries = addedRegistriesOf(this);
    if (registries.includes(registry)) {
      throw Error("The registry has already been added");
    }

    registries.push(registry);
  }

  /** @type API.JsonSchema["removeRegistry"] */
  removeRegistry(registry) {
    const registries = addedRegistriesOf(this);
    const index = registries.indexOf(registry);
    if (index !== -1) {
      registries.splice(index, 1);
    }
  }

  /** @type API.JsonSchema["addKeyword"] */
  addKeyword(keyword) {
    this.#keywords[keyword.uri] = keyword;
  }

  /** @type API.JsonSchema["hasKeyword"] */
  hasKeyword(uri) {
    return uri in this.#keywords;
  }

  /** @type API.JsonSchema["getKeyword"] */
  getKeyword(uri) {
    if (!(uri in this.#keywords)) {
      throw Error(`The '${uri}' keyword isn't supported. Use the 'addKeyword' function to add support for it.`);
    }

    return this.#keywords[uri];
  }

  /** @type API.JsonSchema["addFormat"] */
  addFormat(format) {
    this.#formats[format.uri] = format;
  }

  /** @type API.JsonSchema["hasFormat"] */
  hasFormat(uri) {
    return uri in this.#formats;
  }

  /** @type API.JsonSchema["getFormat"] */
  getFormat(uri) {
    if (!(uri in this.#formats)) {
      throw Error(`The '${uri}' format isn't supported. Use the 'addFormat' function to add support for it.`);
    }

    return this.#formats[uri];
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
  extendDialect(uri, { keywords = {}, formats = {} }) {
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

    const dialectFormats = dialect.formats ?? {};
    for (const name in formats) {
      if (name in dialectFormats) {
        throw Error(`The '${uri}' dialect already has a '${name}' format`);
      }
    }

    // Dialects aren't changed in place so the schemas that already use one
    // aren't affected
    this.#dialects[uri] = {
      ...dialect,
      keywords: { ...dialect.keywords, ...keywords },
      formats: { ...dialectFormats, ...formats }
    };
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
  getDialect(uri) {
    uri = toAbsoluteIri(uri);
    if (!(uri in this.#dialects)) {
      throw Error(`The '${uri}' dialect isn't defined`);
    }

    return this.#dialects[uri];
  }

  /** @type API.JsonSchema["compile"] */
  async compile(uri, options) {
    return this.session(options).compile(uri);
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
