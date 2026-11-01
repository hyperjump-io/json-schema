import { jsonValue, relativeFileUri, RetrievalError, Session } from "@hyperjump/browser";
import { encodeIriFragment, toAbsoluteIri } from "@hyperjump/uri";
import { SessionRegistries } from "./registry/session-registries.js";
import { SchemaError } from "./schema/schema-error.js";
import { withValidateFormats } from "./dialects/extend-dialect.js";
import unknownKeyword, { keywordDefinitionUri } from "./keywords/unknown.js";

/**
 * @import { DocumentNode, GetOptions, Json } from "@hyperjump/browser"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import { SchemaMessage } from "./schema/schema-error.d.ts"
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
   * A URI is only in more than one document if its resources are identical.
   *
   * @type Map<string, Record<string, JsonSchemaDocumentNode>[]>
   */
  #embedded;

  /**
   * The documents in `#embedded` by their `embedded` objects
   *
   * @type WeakMap<Record<string, JsonSchemaDocumentNode>, JsonSchemaDocumentNode>
   */
  #documents;

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
    this.#embedded = new Map();
    this.#documents = new WeakMap();
    this.#dialects = {};
    this.#pendingDialects = {};
    this.#loading = new Map();
    this.#registries = new SessionRegistries(this, options.registry);
  }

  get jsonSchema() {
    return this.#jsonSchema;
  }

  /**
   * An embedded resource is only found by a reference from the document that
   * contains it. Registries come next, then the URI is retrieved.
   *
   * A resource that's in more than one document is identical in each, but
   * only some of them might embed what it references. Where one doesn't, the
   * reference finds a schema the usual way, so that has to be identical too.
   * Otherwise, a document could change what a reference in another one
   * finds.
   *
   * @param {string} uri
   * @param {GetOptions} [options]
   */
  async getDocument(uri, options = {}) {
    if (options.referencedFrom !== undefined) {
      const id = toAbsoluteIri(uri);
      const resources = (this.#embedded.get(options.referencedFrom) ?? []).map((embedded) => embedded[id]);
      const embeddedDocument = resources.find((resource) => resource !== undefined);
      if (embeddedDocument) {
        if (resources.some((resource) => resource === undefined)) {
          await this.#getDocument(uri, options);
        }
        return /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (embeddedDocument));
      }
    }

    return this.#getDocument(uri, options);
  }

  /**
   * A document from a registry or retrieved
   *
   * @type (uri: string, options: GetOptions) => Promise<DocumentNode<JsonSchemaNode>>
   */
  async #getDocument(uri, options) {
    /** @type DocumentNode<JsonSchemaNode> */
    let document;
    const registryDocument = this.#registries.get(uri);
    if (registryDocument) {
      document = /** @type DocumentNode<JsonSchemaNode> */ (/** @type unknown */ (await registryDocument));
    } else {
      try {
        document = await super.getDocument(uri, options);
      } catch (error) {
        // A schema with problems was retrieved. It isn't a failure to
        // retrieve it.
        if (error instanceof RetrievalError && error.cause instanceof SchemaError) {
          throw error.cause;
        }
        throw this.#registries.retrievalError(uri, error);
      }
    }

    if (document.type === "json-schema-document") {
      this.#addEmbedded(/** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document)));
    }

    return document;
  }

  /**
   * A URI identifies one resource in a session. Two documents can only have
   * a resource with the same URI if it's identical in both, like a schema
   * and a bundle that includes it.
   *
   * @type (document: JsonSchemaDocumentNode) => void
   */
  #addEmbedded(document) {
    const embedded = document.embedded;
    if (this.#documents.has(embedded)) {
      return;
    }

    /** @type SchemaMessage[] */
    const messages = [];
    for (const uri in embedded) {
      const otherEmbedded = this.#embedded.get(uri)?.[0];
      if (otherEmbedded && !sameResource(otherEmbedded[uri], embedded[uri])) {
        const otherDocument = /** @type JsonSchemaDocumentNode */ (this.#documents.get(otherEmbedded));
        /** @type SchemaMessage */
        const message = {
          source: "json-schema",
          ruleId: "duplicate-id",
          severity: "error",
          uri: document.uri,
          place: embedded[uri].children[0]?.position,
          message: `'${relativeFileUri(otherDocument.uri)}' has a different schema resource identified as '${relativeFileUri(uri)}'`
        };
        if (document.origin !== undefined) {
          message.origin = document.origin;
        }
        messages.push(message);
      }
    }
    if (messages.length > 0) {
      throw new SchemaError(messages);
    }

    for (const uri of new Set([document.uri, ...Object.keys(embedded)])) {
      const documents = this.#embedded.get(uri);
      if (documents) {
        documents.push(embedded);
      } else {
        this.#embedded.set(uri, [embedded]);
      }
    }
    this.#documents.set(embedded, document);
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
      throw Error(`The meta-schemas for the '${relativeFileUri(referencedFrom)}' and '${relativeFileUri(uri)}' dialects depend on each other`);
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
        throw Error(`Unable to retrieve the meta-schema for the '${relativeFileUri(uri)}' dialect`, { cause: error });
      }

      if (metaSchema.type !== "json-schema-document") {
        throw Error(`The meta-schema for the '${relativeFileUri(uri)}' dialect isn't a schema. It needs to be retrieved as 'application/schema+json' or from a '.schema.json' file.`);
      }

      const { definedDialect } = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (metaSchema));
      if (!definedDialect) {
        throw Error(`The meta-schema for the '${relativeFileUri(uri)}' dialect doesn't define a dialect (with '$vocabulary', for example). Add it to the 'dialects' config.`);
      }

      // The dialect is identified by whichever URI found the meta-schema
      const dialect = withValidateFormats({ ...definedDialect, uri }, this.#jsonSchema.config);
      this.#dialects[uri] = dialect;
      return dialect;
    } finally {
      this.#loading.delete(uri);
    }
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
      throw Error(`The '${relativeFileUri(dialectUri)}' dialect isn't defined in this session`);
    }

    return Object.hasOwn(dialect.keywords, keyword)
      ? dialect.keywords[keyword]
      : `${unknownKeyword.uri}#${encodeIriFragment(keyword)}`;
  }
}

/**
 * Resources are the same if they have the same dialect and the same JSON.
 * `$schema` isn't compared, because a bundle leaves it off a resource with
 * the same dialect as the one it's in. Only resources with the same URI are
 * compared, so references in them resolve the same way.
 *
 * @type (a: JsonSchemaDocumentNode, b: JsonSchemaDocumentNode) => boolean
 */
const sameResource = (a, b) => a === b || (a.dialectUri === b.dialectUri && jsonEqual(resourceValue(a), resourceValue(b)));

/** @type (resource: JsonSchemaDocumentNode) => Json */
const resourceValue = (resource) => {
  const value = jsonValue(/** @type JsonSchemaNode */ (resource.children[0]));
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    delete value.$schema;
  }
  return value;
};

/** @type (a: Json, b: Json) => boolean */
const jsonEqual = (a, b) => {
  if (a === b) {
    return true;
  } else if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  } else if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => jsonEqual(item, b[index]));
  } else {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && jsonEqual(a[key], b[key]));
  }
};
