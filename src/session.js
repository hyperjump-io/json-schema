import { Session } from "@hyperjump/browser";
import { encodeIriFragment, toAbsoluteIri } from "@hyperjump/uri";
import { SessionRegistries } from "./registry/session-registries.js";
import { compile } from "./evaluate/compile.js";
import { optimize } from "./evaluate/optimize.js";
import { Validator } from "./evaluate/validator.js";
import { bundle } from "./bundle/bundle.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";

/**
 * @import { DocumentNode, GetOptions } from "@hyperjump/browser"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import * as API from "./session.d.ts"
 */

// Not imported from the v1 dialect, which would load all of its keywords
const v1DialectUri = "https://json-schema.org/v1";

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

  /** @type SessionRegistries */
  #registries;

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
    super(jsonSchema, { allowRetrieval: options.allowRetrieval });

    this.#jsonSchema = jsonSchema;
    this.#embedded = {};
    this.#dialects = {};
    this.#pendingDialects = {};
    this.#loading = new Map();
    this.#registries = new SessionRegistries(this, options.registries ?? []);
  }

  get jsonSchema() {
    return this.#jsonSchema;
  }

  /**
   * An embedded resource is only found by a reference from the document that
   * contains it. Registries come next, then the URI is retrieved.
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
    const registryDocument = this.#registries.get(uri);
    if (registryDocument) {
      document = /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (await registryDocument));
    } else {
      try {
        document = await super.getDocument(uri, options);
      } catch (error) {
        throw this.#registries.retrievalError(uri, error);
      }
    }

    if (document.type === "json-schema-document") {
      this.#addEmbedded(/** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)));
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

    if (options.referencedFrom !== undefined) {
      this.#waitOn(toAbsoluteIri(options.referencedFrom), uri);
    }

    this.#pendingDialects[uri] ??= this.#loadDialect(uri).finally(() => {
      delete this.#pendingDialects[uri];
    });

    return this.#pendingDialects[uri];
  }

  /**
   * If the reference is from a meta-schema that's being retrieved to build a
   * dialect, that dialect is waiting on the one it asked for. If that one is
   * waiting on this one, neither will ever finish.
   *
   * @type (referencedFrom: string, uri: string) => void
   */
  #waitOn(referencedFrom, uri) {
    const waitingOn = this.#loading.get(referencedFrom);
    if (!waitingOn) {
      return;
    }

    if (this.#isWaitingOn(uri, referencedFrom)) {
      throw Error(`The meta-schemas for the '${referencedFrom}' and '${uri}' dialects depend on each other`);
    }
    waitingOn.add(uri);
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
    return new Validator(this.#jsonSchema, optimize(await compile(this, uri), false));
  }

  /** @type API.JsonSchemaSession["bundle"] */
  async bundle(uri, options) {
    return bundle(this, uri, options);
  }

  /** @type API.JsonSchemaSession["annotation"] */
  annotation(node, keyword, dialectUri = v1DialectUri) {
    const values = node.data?.annotations?.get(this.#keywordUri(keyword, dialectUri)) ?? [];
    return /** @type any[] */ (values);
  }

  /**
   * A keyword URI is used as it is, so it doesn't need the dialect. An
   * unknown keyword's URI has its name as the fragment, and its definition is
   * registered without it. A name that isn't a keyword in the dialect is an
   * unknown keyword.
   *
   * @type (keyword: string, dialectUri: string) => string
   */
  #keywordUri(keyword, dialectUri) {
    if (this.#jsonSchema.hasKeyword(keywordDefinitionUri(keyword))) {
      return keyword;
    }

    const dialect = this.#dialect(toAbsoluteIri(dialectUri));
    if (!dialect) {
      throw Error(`The '${dialectUri}' dialect isn't defined in this session`);
    }

    return Object.hasOwn(dialect.keywords, keyword)
      ? dialect.keywords[keyword]
      : `${unknownKeyword.uri}#${encodeIriFragment(keyword)}`;
  }
}
