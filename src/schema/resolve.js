import { relativeFileUrl } from "@hyperjump/browser";
import { pointerAppend } from "@hyperjump/json-pointer";
import { InvalidIriError, assertIriReference, encodeIriFragment, getScheme, isIriReference, normalizeIri, resolveIri, urlToIri } from "@hyperjump/uri";
import { iriPlace, iriProblem, resolveId, toId } from "../identifiers.js";
import { definitionsOf, keywordOf } from "../definition-of.js";
import definitionsKeyword from "../keywords/definitions.js";
import schemaKeyword from "../keywords/schema.js";
import unknownKeyword from "../keywords/unknown.js";
import { siblingValues } from "../keywords/utilities.js";
import { getDialect } from "../session.js";

/**
 * @import { Node } from "unist"
 * @import { VFile } from "vfile"
 * @import { JsonDocumentNode, JsonErrorNode } from "@hyperjump/browser"
 * @import { SchemaMessage } from "./schema-error.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 * @import { Keyword, ResolveContext, Shape } from "../keyword.d.ts"
 * @import { Dialect, DialectDefinition } from "../dialect.d.ts"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { Id } from "../identifiers.js"
 * @import * as API from "./resolve.d.ts"
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/**
 * @typedef {JsonSchemaTolerantNode | JsonErrorNode} TreeNode
 */

/**
 * A property of a schema with its keyword URI and definition
 *
 * @typedef {[JsonSchemaKeywordNode<JsonErrorNode>, string, Keyword]} KeywordProperty
 */

/**
 * What the keywords of a schema asked for while it was resolved. Nothing is
 * applied until every keyword has been seen, so keyword order doesn't matter.
 *
 * @typedef {{
 *   baseUri?: Id;
 *   anchors: [string, Node][];
 *   dynamicAnchors: [string, Node][];
 *   reference?: NormalizedIri;
 *   dialect?: DialectDefinition;
 * }} Effects
 */

/** @type typeof API.resolveSchema */
export const resolveSchema = async (tree, options) => {
  const resolver = new Resolver(options.session, tree, toId(options.uri));
  return resolver.resolve(/** @type TreeNode | undefined */ (tree.children[0]), options.dialectUri);
};

/** @type typeof API.resolveSchemaAt */
export const resolveSchemaAt = async (node, options) => {
  const resolver = new Resolver(options.session, options.document, toId(options.uri), options.document.embedded);
  return resolver.resolveAt(/** @type TreeNode */ (node), options.document, options.pointer, options.dialectUri);
};

/**
 * `resolveSchema` as a unified plugin: the base URI can come from the
 * file's path, and each problem is a message on the file
 *
 * @type typeof API.jsonSchemaResolve
 */
export function jsonSchemaResolve(options) {
  return async (tree, file) => {
    // The parser gives the document its URL, from the file's path or its
    // `url` option, and a schema's identifiers are IRIs
    const uri = urlToIri(new URL(tree.url));

    // Lint rules find other schemas in the same session
    file.data.jsonSchemaSession = options.session;

    const { document, messages } = await resolveSchema(tree, { ...options, uri });
    for (const { message, place, ruleId, source, cause } of messages) {
      // A schema with a problem can't be used, so every problem is an error.
      // It's not thrown, so the rest of the document is still checked.
      file.message(message, { place, ruleId, source, cause: /** @type Error | undefined */ (cause) }).fatal = true;
    }
    return document;
  };
}

class Resolver {
  /** @type Hyperjump<JsonSchemaConfig> */
  #session;

  /**
   * Every problem found, in the order they're found
   *
   * @type SchemaMessage[]
   */
  #messages;

  /**
   * What every resource made in the document shares with it
   *
   * @type Pick<JsonDocumentNode, "status" | "comments">
   */
  #tree;

  /** @type Record<string, JsonSchemaDocumentNode> */
  #embedded;

  /**
   * The URI the document was retrieved from, before any `$id`
   *
   * @type Id
   */
  #documentUri;

  /**
   * @param {Hyperjump<JsonSchemaConfig>} session
   * @param {Pick<JsonDocumentNode, "status" | "comments">} tree
   * @param {Id} uri
   * @param {Record<string, JsonSchemaDocumentNode>} [embedded] - The
   * document's resources, when a schema is resolved in a document made
   * elsewhere
   */
  constructor(session, tree, uri, embedded = {}) {
    this.#documentUri = uri;
    this.#session = session;
    this.#messages = [];
    this.#tree = tree;
    this.#embedded = embedded;
  }

  /** @type (root: TreeNode | undefined, dialectUri: string | undefined) => Promise<{ document: JsonSchemaDocumentNode; messages: SchemaMessage[] }> */
  async resolve(root, dialectUri) {
    const document = this.#createResource(this.#documentUri, root);

    if (root) {
      let dialect;
      if (dialectUri !== undefined) {
        dialect = await this.#getDialect(dialectUri, root);
      } else if (isSchemaNode(root) && !hasProperty(root, "$schema")) {
        this.#message("Unable to determine the dialect of the schema. Add '$schema', or give its URL a dialect in 'defaultDialects'.", root, "missing-dialect");
      }
      await this.#schema(root, document, "", dialect, true);
    }

    this.#embedded[document.uri] ??= document;

    return { document, messages: this.#messages };
  }

  /**
   * A schema in a document that isn't a schema at its root, like a Schema
   * Object in an OpenAPI document. It isn't a resource's root, so `$schema`
   * is only allowed next to `$id`.
   *
   * @type (node: TreeNode, resource: JsonSchemaDocumentNode, pointer: string, dialectUri: string) => Promise<SchemaMessage[]>
   */
  async resolveAt(node, resource, pointer, dialectUri) {
    const dialect = await this.#getDialect(dialectUri, node);
    if (dialect === undefined) {
      // It's reported, and nothing in the schema can be interpreted
      this.#data(node, resource, pointer);
    } else {
      await this.#schema(node, resource, pointer, dialect, false);
    }
    return this.#messages;
  }

  /**
   * @param {TreeNode} node
   * @param {JsonSchemaDocumentNode} resource
   * @param {string} pointer
   * @param {Dialect | undefined} parentDialect
   * @param {boolean} isDocumentRoot
   */
  async #schema(node, resource, pointer, parentDialect, isDocumentRoot) {
    if (isErrorNode(node)) {
      // The syntax error is already reported
      this.#data(node, resource, pointer);
      return;
    }

    if (!isSchemaNode(node)) {
      // It's still a schema, because that's what its position holds. It's
      // just not a valid one.
      this.#message("A schema must be an object or a boolean", node, "invalid-schema");
      this.#data(node, resource, pointer);
      if (parentDialect !== undefined) {
        Object.assign(node, { type: "json-schema", dialectUri: parentDialect.uri });
      }
      return;
    }

    let dialect = parentDialect;

    // `$schema` is the only keyword that doesn't depend on the dialect
    const $schemaNode = node.jsonType === "object" ? propertyValue(node, "$schema") : undefined;
    if ($schemaNode !== undefined && !isErrorNode($schemaNode)) {
      if ($schemaNode.jsonType === "string" && isFileUri($schemaNode.value)) {
        // A dialect in a file is only found on this machine. Its meta-schema
        // can't be identified by a file either, so it has another URI.
        this.#message(`The '${$schemaNode.value}' dialect is a 'file:' URI, which only finds the file on this machine. Use the URI its meta-schema's '$id' identifies it with.`, $schemaNode, "file-uri-not-allowed");
        dialect = undefined;
      } else if ($schemaNode.jsonType === "string") {
        dialect = isDocumentRoot && this.#isSelfDescribing($schemaNode.value)
          ? this.#selfDescribingDialect($schemaNode.value, $schemaNode)
          : await this.#getDialect($schemaNode.value, $schemaNode);
      } else {
        this.#message("'$schema' must be a string", $schemaNode, "invalid-dialect");
        dialect = undefined;
      }
    }

    if (dialect === undefined) {
      // Nothing in this schema can be interpreted without a dialect
      this.#data(node, resource, pointer);
      return;
    }

    // Messages about this schema's keywords are discarded if the keywords
    // turn out to be interpreted differently or ignored
    let messageCount = this.#messages.length;
    let keywords = this.#keywords(node, dialect);
    let effects = this.#collectEffects(keywords, resource, dialect);

    // `$schema` is only allowed where a schema resource starts. Anywhere else,
    // it's ignored and the schema is interpreted with its parent's dialect.
    // `misplaced-dialect` reports it.
    if ($schemaNode && !isDocumentRoot && effects.baseUri === undefined && effects.reference === undefined && dialect !== parentDialect) {
      this.#messages.length = messageCount;

      dialect = /** @type Dialect */ (parentDialect);
      messageCount = this.#messages.length;
      keywords = this.#keywords(node, dialect);
      effects = this.#collectEffects(keywords, resource, dialect);
    }

    if (effects.reference !== undefined) {
      // Problems with the ignored keywords don't matter
      this.#messages.length = messageCount;

      Object.assign(node, { type: "reference", href: effects.reference });
      // The reference replaces the whole object, so nothing else in it means
      // anything. A sibling `$id` doesn't change the base URI.
      this.#data(node, resource, pointer, false);

      // Except that `definitions` still holds schemas. It evaluates nothing,
      // so ignoring it is only about finding them, and tools generate a root
      // `$ref` to one of them. `ignored-ref-siblings` reports it, because
      // other implementations might not.
      for (const [property, keywordUri, keyword] of keywords) {
        if (keywordUri === definitionsKeyword.uri) {
          property.keywordUri = keywordUri;
          const [nameNode, valueNode] = property.children;
          await this.#shape(valueNode, keyword.shape, keywordUri, resource, pointerAppend(nameNode.value, pointer), dialect);
        }
      }
      return;
    }

    if (effects.baseUri !== undefined) {
      if (isDocumentRoot) {
        resource.uri = effects.baseUri;
      } else {
        resource = this.#createResource(effects.baseUri, node);
        pointer = "";
      }
    }

    if (isDocumentRoot || effects.baseUri !== undefined) {
      resource.dialectUri = dialect.uri;
      if (resource.uri in this.#embedded) {
        this.#message(`There is already a schema resource identified as '${relativeFileUrl(resource.uri)}'`, node, "duplicate-id");
      } else {
        this.#embedded[resource.uri] = resource;
      }

      // A dialect is only defined at the document's root, because a
      // dialect's meta-schema is found by its URI, and that only finds a
      // document. Anywhere else, its definition is ignored, and
      // `misplaced-vocabulary` reports it.
      if (isDocumentRoot && effects.dialect) {
        resource.definedDialect = effects.dialect;
      }
    }

    this.#addAnchors(effects.anchors, resource.anchors, resource.uri, pointer, "anchor");
    this.#addAnchors(effects.dynamicAnchors, resource.dynamicAnchors, resource.uri, pointer, "dynamic anchor");

    Object.assign(node, {
      type: "json-schema",
      dialectUri: dialect.uri,
      location: location(resource, pointer)
    });

    // Every keyword is identified before any is checked, so a check can find
    // its siblings
    for (const [property, keywordUri] of keywords) {
      property.keywordUri = keywordUri;
    }

    const schemaNode = /** @type JsonSchemaNode */ (node);
    for (const [property, keywordUri, keyword] of keywords) {
      const [nameNode, valueNode] = property.children;
      await this.#shape(valueNode, keyword.shape, keywordUri, resource, pointerAppend(nameNode.value, pointer), dialect);

      // Checked after its value is annotated, so a check can tell which
      // parts are schemas
      if (keyword.check && !isErrorNode(valueNode)) {
        keyword.check(valueNode, {
          dialect,
          siblings: siblingValues(/** @type JsonSchemaTolerantNode */ (schemaNode), keyword.siblings),
          message: (reason, node = valueNode) => this.#message(reason, node, keyword.uri)
        });
      }
    }
  }

  /**
   * The keyword URI and definition of each property of a schema. `$schema`
   * is part of every dialect. A property that isn't in the dialect is an
   * unknown keyword, which every dialect also has. The AST records it even if
   * the dialect doesn't allow unknown keywords.
   *
   * @type (node: TreeNode, dialect: Dialect) => KeywordProperty[]
   */
  #keywords(node, dialect) {
    if (isErrorNode(node) || node.jsonType !== "object") {
      return [];
    }

    return node.children.map((property) => {
      const keywordNode = /** @type JsonSchemaKeywordNode<JsonErrorNode> */ (property);
      const name = property.children[0].value;

      if (name !== "$schema" && !Object.hasOwn(dialect.keywords, name)) {
        if (dialect.unknownKeywords === "error" && !name.startsWith("x-")) {
          this.#message(`'${name}' isn't a keyword in the '${dialect.uri}' dialect`, property, "unknown-keyword");
        }

        return [keywordNode, `${unknownKeyword.uri}#${encodeIriFragment(name)}`, definitionsOf(this.#session.config).keywords[unknownKeyword.uri]];
      }

      const keywordUri = name === "$schema" ? schemaKeyword.uri : dialect.keywords[name];

      /** @type Keyword */
      let keyword;
      try {
        keyword = keywordOf(definitionsOf(this.#session.config).keywords, keywordUri);
      } catch (error) {
        this.#message(/** @type Error */ (error).message, property, "unsupported-keyword");
        keyword = { uri: keywordUri, shape: "data" };
      }

      return [keywordNode, keywordUri, keyword];
    });
  }

  /**
   * Add the anchors a schema defines to its resource. A name can only be
   * defined once in a resource.
   *
   * @type (found: [string, Node][], anchors: Record<string, string>, resourceUri: Id, pointer: string, label: string) => void
   */
  #addAnchors(found, anchors, resourceUri, pointer, label) {
    for (const [name, anchorNode] of found) {
      if (name in anchors) {
        this.#message(`The '${name}' ${label} is already defined in '${relativeFileUrl(resourceUri)}'`, anchorNode, "duplicate-anchor");
      } else {
        anchors[name] = pointer;
      }
    }
  }

  /** @type (keywords: KeywordProperty[], resource: JsonSchemaDocumentNode, dialect: Dialect) => Effects */
  #collectEffects(keywords, resource, dialect) {
    /** @type Effects */
    const effects = { anchors: [], dynamicAnchors: [] };

    for (const [property, , keyword] of keywords) {
      if (!keyword.resolve) {
        continue;
      }

      const valueNode = property.children[1];

      /** @type ResolveContext */
      const context = {
        vocabulary: (uri) => definitionsOf(this.#session.config).vocabularies[toId(uri)],
        dialectUri: dialect.uri,
        setBaseUri: (reference) => {
          let baseUri;
          try {
            baseUri = resolveId(reference, resource.uri);
          } catch (error) {
            // There's always a base here, so it's an invalid reference
            this.#invalidIri(`'${reference}' isn't a valid URI reference: ${iriProblem(error)}`, valueNode, keyword.uri, error);
            return;
          }

          // A file is where a schema is, not what it is. An identifier that's a
          // file, including a relative one resolved against a file, isn't the
          // same on another machine, and in a document that wasn't read from
          // the filesystem, its references would be resolved as if it were a
          // file, which would give it access to the filesystem.
          if (getScheme(baseUri) === "file") {
            // It's said as it's written, which is in the document already
            const written = valueNode.type === "json" && valueNode.jsonType === "string" ? valueNode.value : reference;
            this.#message(`'${written}' identifies the schema by a 'file:' URI. Give it an absolute URI that isn't a file, or no identifier.`, valueNode, "file-uri-not-allowed");
            return;
          }

          effects.baseUri = baseUri;
        },
        addAnchor: (name) => {
          effects.anchors.push([name, valueNode]);
        },
        addDynamicAnchor: (name) => {
          effects.dynamicAnchors.push([name, valueNode]);
        },
        setReference: (href) => {
          if (isFileUri(href)) {
            this.#fileReference(href, valueNode);
            return;
          }

          try {
            assertIriReference(href);
            effects.reference = normalizeIri(resolveIri(href, resource.uri));
          } catch (error) {
            this.#invalidIri(`'${href}' isn't a valid URI reference: ${iriProblem(error)}`, valueNode, keyword.uri, error);
          }
        },
        defineDialect: (definition) => {
          const reserved = reservedKeyword(definition.keywords);
          if (reserved !== undefined) {
            context.message(`'${reserved}' can't be a keyword. Keywords starting with 'x-' are reserved for schema authors.`);
            return;
          }

          effects.dialect = definition;
        },
        message: (reason, node = valueNode) => this.#message(reason, node, keyword.uri)
      };

      keyword.resolve(/** @type any */ (valueNode), context);
    }

    return effects;
  }

  /**
   * Annotate a keyword's value by its shape. A value that doesn't fit the
   * shape is reported, unless the shape has a `"data"` alternative, which
   * leaves anything else to the keyword's check.
   *
   * @type (node: TreeNode, shape: Shape, keywordUri: string, resource: JsonSchemaDocumentNode, pointer: string, dialect: Dialect) => Promise<void>
   */
  async #shape(node, shape, keywordUri, resource, pointer, dialect) {
    if (Array.isArray(shape)) {
      const alternative = shape.find((alternative) => matchesShape(alternative, node));
      if (alternative === undefined) {
        this.#mismatch(node, shape, keywordUri, resource, pointer);
      } else {
        await this.#shape(node, alternative, keywordUri, resource, pointer, dialect);
      }
    } else if (shape === "schema" || shape === "unappliedSchema") {
      // A position the shape says is a schema holds a schema, even one that
      // isn't valid. Only alternatives are chosen by the value.
      await this.#schema(node, resource, pointer, dialect, false);
    } else if (shape === "data") {
      this.#data(node, resource, pointer);
    } else if (shape === "reference") {
      this.#reference(node, keywordUri, resource, pointer);
    } else if (!matchesShape(shape, node)) {
      this.#mismatch(node, shape, keywordUri, resource, pointer);
    } else if ("array" in shape && !isErrorNode(node) && node.jsonType === "array") {
      node.location = location(resource, pointer);
      let index = 0;
      for (const itemNode of node.children) {
        await this.#shape(itemNode, shape.array, keywordUri, resource, pointerAppend(`${index++}`, pointer), dialect);
      }
    } else if ("map" in shape && !isErrorNode(node) && node.jsonType === "object") {
      node.location = location(resource, pointer);
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        await this.#shape(valueNode, shape.map, keywordUri, resource, pointerAppend(nameNode.value, pointer), dialect);
      }
    }
  }

  /**
   * A value whose shape is a reference, which has the URI it resolves to as
   * `href`, normalized so it's the same as the `location` it finds. It's
   * checked here, rather than with `matchesShape`, so it's checked once.
   *
   * @type (node: TreeNode, keywordUri: string, resource: JsonSchemaDocumentNode, pointer: string) => void
   */
  #reference(node, keywordUri, resource, pointer) {
    if (isErrorNode(node) || node.jsonType !== "string") {
      this.#mismatch(node, "reference", keywordUri, resource, pointer);
      return;
    }

    try {
      assertIriReference(node.value);
    } catch (error) {
      this.#invalidIri(`'${node.value}' isn't a valid URI reference: ${iriProblem(error)}`, node, keywordUri, error);
      return;
    }

    this.#data(node, resource, pointer);
    if (isFileUri(node.value)) {
      this.#fileReference(node.value, node);
      return;
    }

    try {
      Object.assign(node, { type: "reference", href: normalizeIri(resolveIri(node.value, resource.uri)) });
    } catch (error) {
      this.#invalidIri(`'${node.value}' isn't a valid URI reference: ${iriProblem(error)}`, node, keywordUri, error);
    }
  }

  /**
   * A reference written as a `file:` URI names a file on one machine, so it
   * doesn't find the same schema anywhere else, and in a bundle it still
   * names the file instead of the schema embedded from it. A file references
   * another file with a relative reference.
   *
   * @type (href: string, node: TreeNode) => void
   */
  #fileReference(href, node) {
    this.#message(`The reference to '${href}' is a 'file:' URI, which only finds the file on this machine. Use a reference relative to the schema.`, node, "file-uri-not-allowed");
  }

  /** @type (node: TreeNode, shape: Shape, keywordUri: string, resource: JsonSchemaDocumentNode, pointer: string) => void */
  #mismatch(node, shape, keywordUri, resource, pointer) {
    // A value that couldn't be parsed already has a syntax error
    if (!isErrorNode(node)) {
      this.#message(`Expected ${describeShape(shape)}`, node, keywordUri);
    }
    this.#data(node, resource, pointer);
  }

  /**
   * Annotate a value that isn't a schema. Its nodes get their locations in
   * the resource that contains them, but nothing else changes.
   *
   * @param {TreeNode} node
   * @param {JsonSchemaDocumentNode} resource
   * @param {string} pointer
   * @param {boolean} [isPlainJson] - False to keep the node's type (for references)
   */
  #data(node, resource, pointer, isPlainJson = true) {
    node.location = location(resource, pointer);
    if (isErrorNode(node)) {
      return;
    }

    if (isPlainJson) {
      node.type = "json";
    }

    if (node.jsonType === "array") {
      let index = 0;
      for (const itemNode of node.children) {
        this.#data(itemNode, resource, pointerAppend(`${index++}`, pointer));
      }
    } else if (node.jsonType === "object") {
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        this.#data(valueNode, resource, pointerAppend(nameNode.value, pointer));
      }
    }
  }

  /** @type (uri: Id, node: TreeNode | undefined) => JsonSchemaDocumentNode */
  #createResource(uri, node) {
    const root = /** @type JsonSchemaTolerantNode | undefined */ (node);
    return {
      type: "json-schema-document",
      status: this.#tree.status,
      children: root ? [root] : [],
      comments: this.#tree.comments,
      uri: uri,
      url: new URL(uri).href,
      anchors: {},
      dynamicAnchors: {},
      embedded: this.#embedded
    };
  }

  /** @type (uri: string, node: Node) => Promise<Dialect | undefined> */
  async #getDialect(uri, node) {
    try {
      return await getDialect(this.#session, uri, { referencedFrom: this.#documentUri });
    } catch (error) {
      if (error instanceof InvalidIriError) {
        this.#invalidIri(`'${uri}' isn't a valid URI: ${iriProblem(error)}`, node, "unknown-dialect", error);
        return;
      }

      // The error's message is the message, so what caused it is the cause
      const { message, cause } = /** @type Error */ (error);
      this.#message(message, node, "unknown-dialect", cause instanceof Error ? cause : undefined);
    }
  }

  /**
   * A meta-schema that describes itself, such as the 2020-12 meta-schema,
   * names its own URI in `$schema`. Its dialect can't be retrieved because
   * that's the document being resolved. This uses the document's URI rather
   * than its `$id` because the dialect is needed to find the `$id`.
   *
   * @type (dialectUri: string) => boolean
   */
  #isSelfDescribing(dialectUri) {
    try {
      return toId(dialectUri) === this.#documentUri;
    } catch (_error) {
      return false;
    }
  }

  /**
   * A self-describing meta-schema can't define its own dialect, because the
   * dialect is needed to find out what the meta-schema defines. Retrieving
   * it as its own meta-schema would wait for itself, so its dialect has to
   * have been added.
   *
   * @type (uri: string, node: Node) => Dialect | undefined
   */
  #selfDescribingDialect(dialectUri, node) {
    const uri = toId(dialectUri);
    const dialect = definitionsOf(this.#session.config).dialects[uri];
    if (dialect) {
      return dialect;
    }

    this.#message(`The '${uri}' meta-schema describes itself, so its dialect has to be in the 'dialects' option of jsonSchemaConfig.`, node, "unknown-dialect");
  }

  /**
   * A problem with a string that isn't a valid identifier, on the
   * characters that are wrong when they can be found (see `iriPlace`)
   *
   * @type (reason: string, node: Node, ruleId: string, error: unknown) => void
   */
  #invalidIri(reason, node, ruleId, error) {
    this.#message(reason, { type: node.type, position: iriPlace(node, error) }, ruleId);
  }

  /**
   * A schema with a problem can't be used, so every problem is an error
   *
   * @type (reason: string, node: Node, ruleId: string, cause?: Error) => void
   */
  #message(reason, node, ruleId, cause) {
    /** @type SchemaMessage */
    const message = { source: "json-schema", ruleId, severity: "error", uri: this.#documentUri, place: node.position, message: reason };
    if (cause !== undefined) {
      message.cause = cause;
    }
    this.#messages.push(message);
  }
}

/** @type (keywords: Record<string, string>) => string | undefined */
const reservedKeyword = (keywords) => Object.keys(keywords).find((name) => name.startsWith("x-"));

/**
 * The resource's URI is normalized and has no fragment, and the pointer is
 * encoded for one, which leaves it normalized, so it's a normalized IRI
 *
 * @type (resource: JsonSchemaDocumentNode, pointer: string) => NormalizedIri
 */
const location = (resource, pointer) => /** @type NormalizedIri */ (`${resource.uri}#${encodeIriFragment(pointer)}`);

/** @type (node: TreeNode) => node is JsonErrorNode */
const isErrorNode = (node) => node.type === "json-invalid" || node.type === "json-missing";

/** @type (node: TreeNode) => node is JsonSchemaTolerantNode & { jsonType: "object" | "boolean" } */
const isSchemaNode = (node) => !isErrorNode(node) && (node.jsonType === "object" || node.jsonType === "boolean");

/** @type (shape: Shape, node: TreeNode) => boolean */
const matchesShape = (shape, node) => {
  if (Array.isArray(shape)) {
    return shape.some((alternative) => matchesShape(alternative, node));
  } else if (shape === "data") {
    return true;
  } else if (shape === "schema" || shape === "unappliedSchema") {
    return isSchemaNode(node);
  } else if (isErrorNode(node)) {
    return false;
  } else if (shape === "reference") {
    return node.jsonType === "string" && isIriReference(node.value);
  } else if ("array" in shape) {
    return node.jsonType === "array";
  } else {
    return node.jsonType === "object";
  }
};

/** @type (shape: Shape) => string */
const describeShape = (shape) => {
  if (Array.isArray(shape)) {
    const descriptions = shape.map(describeShape);
    return descriptions.length > 2
      ? `${descriptions.slice(0, -1).join(", ")}, or ${descriptions.at(-1)}`
      : descriptions.join(" or ");
  } else if (shape === "schema" || shape === "unappliedSchema") {
    return "a schema";
  } else if (shape === "reference") {
    return "a URI reference";
  } else if (shape === "data") {
    return "any value";
  } else if ("array" in shape) {
    return "an array";
  } else {
    return "an object";
  }
};

/** @type (node: TreeNode, name: string) => TreeNode | undefined */
const propertyValue = (node, name) => {
  if (isErrorNode(node) || node.jsonType !== "object") {
    return;
  }

  for (const property of node.children) {
    if (property.children[0].value === name) {
      return property.children[1];
    }
  }
};

/** @type (node: TreeNode, name: string) => boolean */
const hasProperty = (node, name) => propertyValue(node, name) !== undefined;

/** @type (uriReference: string) => boolean */
const isFileUri = (uriReference) => /^file:/i.test(uriReference);
