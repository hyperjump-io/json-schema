import { unified } from "unified";
import { VFile } from "vfile";
import { Hyperjump, RetrievalError, Session } from "@hyperjump/browser";
import { rejsonParse } from "@hyperjump/browser/json";
import { toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchemaMediaTypePlugin } from "./json-schema-media-type-plugin.js";
import { jsonSchemaResolve } from "./jsonschema-resolve.js";
import { jsonSchemaValidateKeywords } from "./jsonschema-validate-keywords.js";
import { SchemaRegistry } from "./schema-registry.js";
import { RegistryIndex, entryText } from "./registry-index.js";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword from "./keywords/unknown.js";
import { addV1 } from "./v1/dialect.js";
import { compile, keywordDefinitionUri } from "./compile.js";
import { Validator } from "./validator.js";
import { basicOutputFormat, detailedOutputFormat } from "./output-formats.js";

export { ValidationError, DetailedValidationError, InvalidSchemaError } from "./validation-error.js";

/**
 * @import { Keyword } from "./keyword.d.ts"
 * @import { Format } from "./format.d.ts"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { CompiledSchemas } from "./compile.js"
 * @import { DocumentNode, GetOptions } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts"
 * @import { RegistryEntry } from "./registry-entries.js"
 * @import { IndexedEntry } from "./registry-index.js"
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

  /** @type Record<string, Format> */
  #formats;

  /** @type Record<string, Dialect> */
  #dialects;

  /** @type Partial<{ [F in API.OutputFormat]: API.OutputFormatDefinition<F> }> */
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
    internalRegistries.set(this, new SchemaRegistry());

    // Every dialect has these
    this.addKeyword(schemaKeyword);
    this.addKeyword(unknownKeyword);

    // Value schemas are written in v1
    addV1(this);

    this.addMediaTypePlugin(new JsonSchemaMediaTypePlugin(this));

    this.addOutputFormat("BASIC", basicOutputFormat);
    this.addOutputFormat("DETAILED", detailedOutputFormat);

    instanceRegistries.set(this, []);
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
    const registries = /** @type SchemaRegistry[] */ (instanceRegistries.get(this));
    if (registries.includes(registry)) {
      throw Error("The registry has already been added");
    }

    registries.push(registry);
  }

  /** @type API.JsonSchema["removeRegistry"] */
  removeRegistry(registry) {
    const registries = /** @type SchemaRegistry[] */ (instanceRegistries.get(this));
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
    const registry = /** @type SchemaRegistry */ (internalRegistries.get(this));
    internalRegistries.set(this, registry.without(keyword.uri).with(schema, { retrievalUri: keyword.uri }));

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
 * @implements API.JsonSchemaSession
 * @augments {Session<JsonSchemaNode>}
 */
export class JsonSchemaSession extends Session {
  /** @type JsonSchema */
  #jsonSchema;

  /**
   * Maps the URI of every resource in a schema document to the `embedded`
   * object they share, so a reference from any of them can find the others.
   *
   * @type Record<string, Record<string, JsonSchemaDocumentNode>>
   */
  #embedded;

  /**
   * Dialects built from meta-schemas in this session
   *
   * @type Record<string, Dialect>
   */
  #dialects;

  /**
   * The keyword schemas this session sees
   *
   * @type RegistryIndex
   */
  #internalRegistry;

  /**
   * The registries this session sees, session registries first
   *
   * @type RegistryIndex[]
   */
  #registries;

  /**
   * Registry entries resolved in this session, for the ones that can't be
   * shared with other sessions
   *
   * @type Map<RegistryEntry, Promise<JsonSchemaDocumentNode>>
   */
  #registryDocuments;

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
   * @param {JsonSchema} jsonSchema
   * @param {API.SessionOptions} [options]
   */
  constructor(jsonSchema, options = {}) {
    super(jsonSchema);

    this.#jsonSchema = jsonSchema;
    this.#embedded = {};
    this.#dialects = {};
    this.#registryDocuments = new Map();
    this.#pendingDialects = {};
    this.#loading = new Map();

    this.#internalRegistry = registryIndex(jsonSchema, /** @type SchemaRegistry */ (internalRegistries.get(jsonSchema)), true);

    const added = /** @type SchemaRegistry[] */ (instanceRegistries.get(jsonSchema));
    const registries = new Set([...options.registries ?? [], ...added]);
    this.#registries = [...registries].map((registry) => registryIndex(jsonSchema, registry));
  }

  get jsonSchema() {
    return this.#jsonSchema;
  }

  /**
   * An embedded resource is only found by a reference from the document that
   * contains it. Keyword schemas come next, so they can't be replaced by
   * anything else.
   *
   * @param {string} uri
   * @param {GetOptions} [options]
   */
  async getDocument(uri, options = {}) {
    if (options.referencedFrom !== undefined) {
      const embeddedDocument = this.#embedded[options.referencedFrom]?.[toAbsoluteIri(uri)];
      if (embeddedDocument) {
        return /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (embeddedDocument));
      }
    }

    /** @type DocumentNode<JsonSchemaNode> */
    let document;
    const keywordSchema = this.#keywordSchema(uri);
    const indexed = keywordSchema ? undefined : this.#registryEntry(uri);
    if (keywordSchema) {
      document = /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (await this.#registryDocument(keywordSchema, false)));
    } else if (indexed) {
      document = /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (await this.#registryDocument(indexed, true)));
    } else {
      document = await this.#retrieveDocument(uri, options);
    }

    if (document.type === "json-schema-document") {
      this.#addEmbedded(/** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)));
    }

    return document;
  }

  /**
   * A schema in a registry that's waiting for its dialect or can't be
   * identified might be the one that was asked for, so a failure says so.
   *
   * @type (uri: string, options: GetOptions) => Promise<DocumentNode<JsonSchemaNode>>
   */
  async #retrieveDocument(uri, options) {
    try {
      return await super.getDocument(uri, options);
    } catch (error) {
      /** @type Set<string> */
      const dialects = new Set();
      /** @type Error[] */
      const unidentified = [];
      for (const index of this.#registries) {
        const missing = index.missing();
        for (const dialect of missing.waitingFor) {
          dialects.add(dialect);
        }
        unidentified.push(...missing.unidentified);
      }

      /** @type Error[] */
      const reasons = [];
      if (dialects.size > 0) {
        reasons.push(Error(`Some schemas in registries can't be identified until these dialects are defined: ${[...dialects].join(", ")}`));
      }
      if (unidentified.length > 0) {
        reasons.push(new AggregateError(unidentified, "Some schemas in registries can't be identified"));
      }
      if (reasons.length === 0) {
        throw error;
      }

      throw new RetrievalError(`Unable to load resource '${uri}'`, { cause: new AggregateError([error, ...reasons], reasons[0].message) });
    }
  }

  /**
   * The keyword schema this session sees for a URI
   *
   * @type (uri: string) => IndexedEntry | undefined
   */
  #keywordSchema(uri) {
    try {
      return this.#internalRegistry.lookup(toAbsoluteIri(uri));
    } catch (_error) {
      return;
    }
  }

  /**
   * The registry entry this session sees for a URI
   *
   * @type (uri: string) => IndexedEntry | undefined
   */
  #registryEntry(uri) {
    let id;
    try {
      id = toAbsoluteIri(uri);
    } catch (_error) {
      return;
    }

    /** @type IndexedEntry | undefined */
    let found;
    for (const index of this.#registries) {
      let indexed;
      try {
        indexed = index.lookup(id);
      } catch (error) {
        throw new RetrievalError(`Unable to load resource '${uri}'`, { cause: error });
      }
      if (indexed && found && indexed.entry !== found.entry) {
        throw new RetrievalError(`Unable to load resource '${uri}'`, {
          cause: Error(`More than one registry has a schema identified as '${id}'`)
        });
      }
      found ??= indexed;
    }

    return found;
  }

  /**
   * A registry entry is resolved the first time it's needed. If it only
   * uses dialects added to the JsonSchema, it's resolved once for every
   * session.
   *
   * @type (indexed: IndexedEntry, validate: boolean) => Promise<JsonSchemaDocumentNode>
   */
  async #registryDocument(indexed, validate) {
    const shared = sharedRegistryDocuments.get(this.#jsonSchema)?.get(indexed.entry);
    if (shared) {
      return shared;
    }

    let pending = this.#registryDocuments.get(indexed.entry);
    if (!pending) {
      pending = resolveRegistryEntry(this, indexed, validate);
      this.#registryDocuments.set(indexed.entry, pending);
    }

    const document = await pending;
    if (Object.values(document.embedded).every((resource) => resource.dialectUri === undefined || this.#jsonSchema.hasDialect(resource.dialectUri))) {
      let documents = sharedRegistryDocuments.get(this.#jsonSchema);
      if (!documents) {
        documents = new WeakMap();
        sharedRegistryDocuments.set(this.#jsonSchema, documents);
      }
      documents.set(indexed.entry, pending);
    }

    return document;
  }

  /**
   * If two schema documents embed a resource with the same URI, references
   * from that resource find the resources embedded alongside it in whichever
   * document was retrieved first.
   *
   * @type (document: JsonSchemaDocumentNode) => void
   */
  #addEmbedded(document) {
    this.#embedded[document.uri] = document.embedded;
    for (const uri in document.embedded) {
      this.#embedded[uri] ??= document.embedded;
    }
  }

  /** @type API.JsonSchemaSession["hasDialect"] */
  hasDialect(uri) {
    return this.#dialect(toAbsoluteIri(uri)) !== undefined;
  }

  /** @type (uri: string) => Dialect | undefined */
  #dialect(uri) {
    return this.#jsonSchema.hasDialect(uri) ? this.#jsonSchema.getDialect(uri) : this.#dialects[uri];
  }

  /** @type API.JsonSchemaSession["getDialect"] */
  async getDialect(uri, options = {}) {
    uri = toAbsoluteIri(uri);

    const dialect = this.#dialect(uri);
    if (dialect) {
      return dialect;
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
        metaSchema = await this.getDocument(uri);
      } catch (error) {
        throw Error(`Unable to retrieve the meta-schema for the '${uri}' dialect`, { cause: error });
      }

      if (metaSchema.type !== "json-schema-document") {
        throw Error(`The meta-schema for the '${uri}' dialect isn't a schema. It needs to be retrieved as 'application/schema+json' or from a '.schema.json' file.`);
      }

      const { definedDialect } = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (metaSchema));
      if (!definedDialect) {
        throw Error(`The meta-schema for the '${uri}' dialect doesn't define a dialect (with '$vocabulary', for example). Use the 'addDialect' function to add support for this dialect.`);
      }

      // The dialect is identified by whichever URI found the meta-schema
      const dialect = { ...definedDialect, uri };
      this.#dialects[uri] = dialect;
      return dialect;
    } finally {
      this.#loading.delete(uri);
    }
  }

  /** @type API.JsonSchemaSession["compile"] */
  async compile(uri) {
    return new Validator(this.#jsonSchema, await compile(this, uri));
  }
}

/**
 * The registries added to each JsonSchema
 *
 * @type WeakMap<JsonSchema, SchemaRegistry[]>
 */
const instanceRegistries = new WeakMap();

/**
 * Each JsonSchema's keyword schemas, identified by the keywords' URIs
 *
 * @type WeakMap<JsonSchema, SchemaRegistry>
 */
const internalRegistries = new WeakMap();

/**
 * Each JsonSchema's index of each registry it's used with. Both are held
 * weakly, so a registry that was only used for one session can go away.
 *
 * @type WeakMap<JsonSchema, WeakMap<SchemaRegistry, RegistryIndex>>
 */
const registryIndexes = new WeakMap();

/**
 * A registry is indexed the first time it's used, so the keyword schemas
 * aren't identified until a session needs them.
 *
 * @type (jsonSchema: JsonSchema, registry: SchemaRegistry, isInternal?: boolean) => RegistryIndex
 */
const registryIndex = (jsonSchema, registry, isInternal = false) => {
  let indexes = registryIndexes.get(jsonSchema);
  if (!indexes) {
    indexes = new WeakMap();
    registryIndexes.set(jsonSchema, indexes);
  }

  let index = indexes.get(registry);
  if (!index) {
    index = new RegistryIndex(jsonSchema, registry, isInternal);
    indexes.set(registry, index);
  }

  return index;
};

/**
 * Registry entries resolved with only the dialects added to a JsonSchema,
 * which every session of the JsonSchema can share
 *
 * @type WeakMap<JsonSchema, WeakMap<RegistryEntry, Promise<JsonSchemaDocumentNode>>>
 */
const sharedRegistryDocuments = new WeakMap();

/**
 * A registry entry is resolved like a retrieved schema, with its retrieval
 * URI as the document's URI. A keyword schema isn't validated, because
 * validating it could need itself.
 *
 * @type (session: JsonSchemaSession, indexed: IndexedEntry, validate: boolean) => Promise<JsonSchemaDocumentNode>
 */
const resolveRegistryEntry = async (session, { entry, uri }, validate) => {
  const file = new VFile(entryText(entry));
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session, uri: entry.retrievalUri ?? uri, dialectUri: entry.dialectUri });

  if (validate && session.jsonSchema.config.validateSchemas !== false) {
    processor.use(jsonSchemaValidateKeywords, { jsonSchema: session.jsonSchema });
  }
  const document = await processor.run(processor.parse(file), file);

  // A schema with problems can't be used reliably, so any problem is fatal
  if (file.messages.length > 0) {
    const message = file.messages[0];
    message.fatal = true;
    throw new RetrievalError(`Unable to load resource '${uri}'`, { cause: message });
  }

  return document;
};

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
