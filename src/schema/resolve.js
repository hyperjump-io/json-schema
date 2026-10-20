import * as JsonPointer from "@hyperjump/json-pointer";
import { encodeIriFragment, parseIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import schemaKeyword from "../keywords/schema.js";
import unknownKeyword from "../keywords/unknown.js";

/**
 * @import { Node } from "unist"
 * @import { VFile } from "vfile"
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonDocumentNode, JsonErrorNode } from "@hyperjump/browser/json"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 * @import { Keyword, ResolveContext, Shape } from "../keyword.d.ts"
 * @import { Dialect, DialectDefinition } from "../dialect.d.ts"
 * @import * as API from "./resolve.d.ts"
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
 *   baseUri?: string;
 *   anchors: [string, Node][];
 *   dynamicAnchors: [string, Node][];
 *   reference?: string;
 *   dialect?: { definition: DialectDefinition; node: Node; keywordUri: string };
 * }} Effects
 */

/** @type API.jsonSchemaResolve */
export function jsonSchemaResolve(options) {
  return async (tree, file) => {
    const uri = options.uri ?? fileUri(file);
    if (uri === undefined) {
      return file.fail("Unable to determine the base URI of the document. Use the `uri` option or give the file a path.", {
        ruleId: "missing-base-uri",
        source: "json-schema"
      });
    }

    // Lint rules find other schemas in the same session
    file.data.jsonSchemaSession = options.session;

    const dialectUri = options.dialectUri ?? options.session.jsonSchema.config.defaultDialectUri;
    const resolver = new Resolver(options.session, file, tree);
    return resolver.resolve(toAbsoluteIri(uri), dialectUri);
  };
}

/** @type (file: VFile) => string | undefined */
const fileUri = (file) => {
  if (file.path === undefined) {
    return;
  }

  /** @type (path: string) => string */
  const encodePath = (path) => path.split("/")
    .map(encodeURIComponent)
    .join("/");
  return new URL(encodePath(file.path), `file://${encodePath(file.cwd)}/`).href;
};

class Resolver {
  /** @type JsonSchemaSession */
  #session;

  /** @type VFile */
  #file;

  /** @type JsonDocumentNode */
  #tree;

  /** @type Record<string, JsonSchemaDocumentNode> */
  #embedded;

  /** The URI the document was retrieved from, before any `$id` */
  #documentUri = "";

  /**
   * @param {JsonSchemaSession} session
   * @param {VFile} file
   * @param {JsonDocumentNode} tree
   */
  constructor(session, file, tree) {
    this.#session = session;
    this.#file = file;
    this.#tree = tree;
    this.#embedded = {};
  }

  /** @type (uri: string, dialectUri: string | undefined) => Promise<JsonSchemaDocumentNode> */
  async resolve(uri, dialectUri) {
    this.#documentUri = uri;
    const root = /** @type TreeNode | undefined */ (this.#tree.children[0]);
    const document = this.#createResource(uri, root);

    if (root) {
      let dialect;
      if (dialectUri !== undefined) {
        dialect = await this.#getDialect(dialectUri, root);
      } else if (isSchemaNode(root) && !hasProperty(root, "$schema")) {
        this.#message("Unable to determine the dialect of the schema. Add '$schema' or configure a default dialect.", root, "missing-dialect");
      }
      await this.#schema(root, document, "", dialect, true);
    }

    this.#embedded[document.uri] ??= document;

    return document;
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
      if ($schemaNode.jsonType === "string") {
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
    let messageCount = this.#file.messages.length;
    let keywords = this.#keywords(node, dialect);
    let effects = this.#collectEffects(keywords, resource, dialect);

    // `$schema` is only allowed where a schema resource starts. Anywhere else,
    // it's ignored and the schema is interpreted with its parent's dialect.
    if ($schemaNode && !isDocumentRoot && effects.baseUri === undefined && effects.reference === undefined && dialect !== parentDialect) {
      this.#file.messages.length = messageCount;
      this.#message("'$schema' is only allowed at the root of a schema resource. It's ignored.", $schemaNode, "misplaced-dialect");

      dialect = /** @type Dialect */ (parentDialect);
      messageCount = this.#file.messages.length;
      keywords = this.#keywords(node, dialect);
      effects = this.#collectEffects(keywords, resource, dialect);
    }

    if (effects.reference !== undefined) {
      // Problems with the ignored keywords don't matter
      this.#file.messages.length = messageCount;

      Object.assign(node, { type: "reference", href: effects.reference });
      // The reference replaces the whole object, so nothing else in it means
      // anything. A sibling `$id` doesn't change the base URI.
      this.#data(node, resource, pointer, false);
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
        this.#message(`There is already a schema resource identified as '${resource.uri}'`, node, "duplicate-id");
      } else {
        this.#embedded[resource.uri] = resource;
      }

      if (effects.dialect) {
        resource.definedDialect = effects.dialect.definition;
      }
    } else if (effects.dialect) {
      this.#message("A dialect can only be defined at the root of a schema resource. It's ignored.", effects.dialect.node, effects.dialect.keywordUri);
    }

    this.#addAnchors(effects.anchors, resource.anchors, resource.uri, pointer, "anchor");
    this.#addAnchors(effects.dynamicAnchors, resource.dynamicAnchors, resource.uri, pointer, "dynamic anchor");

    Object.assign(node, {
      type: "json-schema",
      dialectUri: dialect.uri,
      location: location(resource, pointer)
    });

    for (const [property, keywordUri, keyword] of keywords) {
      property.keywordUri = keywordUri;
      const [nameNode, valueNode] = property.children;
      await this.#shape(valueNode, keyword.shape, keywordUri, resource, JsonPointer.append(nameNode.value, pointer), dialect);

      // Checked after its value is annotated, so a check can tell which
      // parts are schemas
      if (keyword.check && !isErrorNode(valueNode)) {
        keyword.check(valueNode, {
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

      if (name !== "$schema" && !(name in dialect.keywords)) {
        if (dialect.unknownKeywords === "error" && !name.startsWith("x-")) {
          this.#message(`'${name}' isn't a keyword in the '${dialect.uri}' dialect`, property, "unknown-keyword");
        }

        return [keywordNode, `${unknownKeyword.uri}#${encodeIriFragment(name)}`, this.#session.jsonSchema.getKeyword(unknownKeyword.uri)];
      }

      const keywordUri = name === "$schema" ? schemaKeyword.uri : dialect.keywords[name];

      /** @type Keyword */
      let keyword;
      try {
        keyword = this.#session.jsonSchema.getKeyword(keywordUri);
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
   * @type (found: [string, Node][], anchors: Record<string, string>, resourceUri: string, pointer: string, label: string) => void
   */
  #addAnchors(found, anchors, resourceUri, pointer, label) {
    for (const [name, anchorNode] of found) {
      if (name in anchors) {
        this.#message(`The '${name}' ${label} is already defined in '${resourceUri}'`, anchorNode, "duplicate-anchor");
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
        baseUri: resource.uri,
        dialectUri: dialect.uri,
        setBaseUri: (uri) => {
          let baseUri;
          try {
            baseUri = toAbsoluteIri(uri);
          } catch (_error) {
            context.message(`'${uri}' isn't an absolute URI`);
            return;
          }

          // A document that wasn't read from the filesystem can't identify as
          // a file. Its references would be resolved as if it were one, which
          // would give it access to the filesystem.
          if (parseIri(baseUri).scheme === "file" && parseIri(this.#documentUri).scheme !== "file") {
            this.#message(`A schema that wasn't retrieved from a 'file:' URI can't be identified by one: ${baseUri}`, valueNode, "file-uri-not-allowed");
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
          try {
            effects.reference = resolveIri(href, resource.uri);
          } catch (_error) {
            context.message(`'${href}' isn't a valid URI reference`);
          }
        },
        defineDialect: (definition) => {
          const reserved = reservedKeyword(definition.keywords);
          if (reserved !== undefined) {
            context.message(`'${reserved}' can't be a keyword. Keywords starting with 'x-' are reserved for schema authors.`);
            return;
          }

          effects.dialect = { definition, node: valueNode, keywordUri: keyword.uri };
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
    } else if (shape === "schema") {
      // A position the shape says is a schema holds a schema, even one that
      // isn't valid. Only alternatives are chosen by the value.
      await this.#schema(node, resource, pointer, dialect, false);
    } else if (shape === "data") {
      this.#data(node, resource, pointer);
    } else if (!matchesShape(shape, node)) {
      this.#mismatch(node, shape, keywordUri, resource, pointer);
    } else if ("array" in shape && !isErrorNode(node) && node.jsonType === "array") {
      node.location = location(resource, pointer);
      let index = 0;
      for (const itemNode of node.children) {
        await this.#shape(itemNode, shape.array, keywordUri, resource, JsonPointer.append(`${index++}`, pointer), dialect);
      }
    } else if ("map" in shape && !isErrorNode(node) && node.jsonType === "object") {
      node.location = location(resource, pointer);
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        await this.#shape(valueNode, shape.map, keywordUri, resource, JsonPointer.append(nameNode.value, pointer), dialect);
      }
    }
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
        this.#data(itemNode, resource, JsonPointer.append(`${index++}`, pointer));
      }
    } else if (node.jsonType === "object") {
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        this.#data(valueNode, resource, JsonPointer.append(nameNode.value, pointer));
      }
    }
  }

  /** @type (uri: string, node: TreeNode | undefined) => JsonSchemaDocumentNode */
  #createResource(uri, node) {
    const root = /** @type JsonSchemaTolerantNode | undefined */ (node);
    return {
      type: "json-schema-document",
      status: this.#tree.status,
      children: root ? [root] : [],
      comments: this.#tree.comments,
      uri: uri,
      mediaType: "application/schema+json",
      anchors: {},
      dynamicAnchors: {},
      embedded: this.#embedded
    };
  }

  /** @type (uri: string, node: Node) => Promise<Dialect | undefined> */
  async #getDialect(uri, node) {
    try {
      return await this.#session.getDialect(toAbsoluteIri(uri), { referencedFrom: this.#documentUri });
    } catch (error) {
      const cause = /** @type Error */ (error);
      this.#message(cause.message, node, "unknown-dialect", cause);
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
      return toAbsoluteIri(dialectUri) === this.#documentUri;
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
  #selfDescribingDialect(uri, node) {
    uri = toAbsoluteIri(uri);
    if (this.#session.jsonSchema.hasDialect(uri)) {
      return this.#session.jsonSchema.getDialect(uri);
    }

    this.#message(`The '${uri}' meta-schema describes itself, so its dialect has to be added. Use the 'addDialect' function to add support for it.`, node, "unknown-dialect");
  }

  /** @type (reason: string, node: Node, ruleId: string, cause?: Error) => VFileMessage */
  #message(reason, node, ruleId, cause) {
    const message = this.#file.message(reason, {
      place: node.position,
      ruleId: ruleId,
      source: "json-schema",
      cause: cause
    });

    // A schema with a problem can't be used, so every problem is an error.
    // It's not thrown, so the rest of the document is still checked.
    message.fatal = true;
    return message;
  }
}

/** @type (keywords: Record<string, string>) => string | undefined */
const reservedKeyword = (keywords) => Object.keys(keywords).find((name) => name.startsWith("x-"));

/** @type (resource: JsonSchemaDocumentNode, pointer: string) => string */
const location = (resource, pointer) => `${resource.uri}#${encodeIriFragment(pointer)}`;

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
  } else if (shape === "schema") {
    return isSchemaNode(node);
  } else if (isErrorNode(node)) {
    return false;
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
  } else if (shape === "schema") {
    return "a schema";
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
