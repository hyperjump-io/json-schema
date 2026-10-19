import { Hyperjump } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchemaMediaTypePlugin } from "./schema/media-type-plugin.js";
import { JsonSchemaSession } from "./session.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import { addedRegistriesOf, keywordSchemasOf, setKeywordSchemas } from "./registry/session-registries.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";
import { addV1 } from "./dialects/v1/dialect.js";
import { Validator } from "./evaluate/validator.js";
import { basicOutputFormat, detailedOutputFormat } from "./output/output-formats.js";

export { ValidationError, DetailedValidationError, InvalidSchemaError } from "./output/validation-error.js";

/**
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Format } from "./format.d.ts"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { CompiledSchemas } from "./evaluate/compile.js"
 * @import { JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import * as API from "./json-schema.d.ts"
 * @import { OutputFormat, OutputFormatDefinition } from "./output/output-format.d.ts"
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

    // Keyword schemas
    setKeywordSchemas(this, new SchemaRegistry());

    // Every dialect has these
    this.addKeyword(schemaKeyword);
    this.addKeyword(unknownKeyword);

    // Value schemas are written in v1
    addV1(this);

    this.addMediaTypePlugin(new JsonSchemaMediaTypePlugin(this));

    this.addOutputFormat("BASIC", basicOutputFormat);
    this.addOutputFormat("DETAILED", detailedOutputFormat);
  }

  get config() {
    return this.#config;
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
    const schema = keyword.schema;
    if (typeof schema === "object" && schema !== null && !Array.isArray(schema) && "$id" in schema) {
      if (typeof schema.$id !== "string" || toAbsoluteIri(schema.$id) !== keyword.uri) {
        throw Error(`The schema for the '${keyword.uri}' keyword can only be identified by the keyword's URI`);
      }
    }

    // The keyword's schema is identified by the keyword's URI
    const registry = keywordSchemasOf(this);
    setKeywordSchemas(this, registry.without(keyword.uri).with(schema, { retrievalUri: keyword.uri }));

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
