import * as JsonPointer from "@hyperjump/json-pointer";
import { encodeIriFragment, parseIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import schemaKeyword from "./keywords/schema.js";
import unknownKeyword from "./keywords/unknown.js";
import { vocabulariesOf } from "./vocabularies.js";

/**
 * @import { Node } from "unist"
 * @import { VFile } from "vfile"
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonDocumentNode, JsonErrorNode } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 * @import { Keyword, ResolveContext, Shape } from "./keyword.d.ts"
 * @import { Dialect } from "./dialect.d.ts"
 * @import * as API from "./jsonschema-resolve.d.ts"
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

    const dialectUri = options.dialectUri ?? options.jsonSchema.config.defaultDialectUri;
    const resolver = new Resolver(options.jsonSchema, file, tree);
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
  /** @type JsonSchema */
  #jsonSchema;

  /** @type VFile */
  #file;

  /** @type JsonDocumentNode */
  #tree;

  /** @type Record<string, JsonSchemaDocumentNode> */
  #embedded;

  /** The URI the document was retrieved from, before any `$id` */
  #documentUri = "";

  /**
   * @param {JsonSchema} jsonSchema
   * @param {VFile} file
   * @param {JsonDocumentNode} tree
   */
  constructor(jsonSchema, file, tree) {
    this.#jsonSchema = jsonSchema;
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
      if (isErrorNode(root) || (root.jsonType !== "object" && root.jsonType !== "boolean")) {
        this.#message("The root of a schema document must be an object or a boolean", root, "invalid-schema");
        this.#data(root, document, "");
      } else {
        let dialect;
        if (dialectUri !== undefined) {
          dialect = await this.#getDialect(dialectUri, root);
        } else if (!hasProperty(root, "$schema")) {
          this.#message("Unable to determine the dialect of the schema. Add '$schema' or configure a default dialect.", root, "missing-dialect");
        }
        await this.#schema(root, document, "", dialect, true);
      }
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
    if (isErrorNode(node) || (node.jsonType !== "object" && node.jsonType !== "boolean")) {
      this.#data(node, resource, pointer);
      return;
    }

    let dialect = parentDialect;

    // `$schema` is the only keyword that doesn't depend on the dialect
    const $schemaNode = node.jsonType === "object" ? propertyValue(node, "$schema") : undefined;
    if ($schemaNode !== undefined && !isErrorNode($schemaNode)) {
      if ($schemaNode.jsonType === "string") {
        dialect = isDocumentRoot && this.#isSelfDescribing($schemaNode.value)
          ? await this.#selfDescribingDialect(node, $schemaNode)
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
    }

    for (const [name, anchorNode] of effects.anchors) {
      if (name in resource.anchors) {
        this.#message(`The '${name}' anchor is already defined in '${resource.uri}'`, anchorNode, "duplicate-anchor");
      } else {
        resource.anchors[name] = pointer;
      }
    }

    for (const [name, anchorNode] of effects.dynamicAnchors) {
      if (name in resource.dynamicAnchors) {
        this.#message(`The '${name}' dynamic anchor is already defined in '${resource.uri}'`, anchorNode, "duplicate-anchor");
      } else {
        resource.dynamicAnchors[name] = pointer;
      }
    }

    Object.assign(node, {
      type: "json-schema",
      dialectUri: dialect.uri,
      location: location(resource, pointer)
    });

    for (const [property, keywordUri, keyword] of keywords) {
      property.keywordUri = keywordUri;
      const [nameNode, valueNode] = property.children;
      await this.#shape(valueNode, keyword.shape, resource, JsonPointer.append(nameNode.value, pointer), dialect);
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

        return [keywordNode, `${unknownKeyword.uri}#${encodeIriFragment(name)}`, this.#jsonSchema.getKeyword(unknownKeyword.uri)];
      }

      const keywordUri = name === "$schema" ? schemaKeyword.uri : dialect.keywords[name];

      /** @type Keyword */
      let keyword;
      try {
        keyword = this.#jsonSchema.getKeyword(keywordUri);
      } catch (error) {
        this.#message(/** @type Error */ (error).message, property, "unsupported-keyword");
        keyword = { uri: keywordUri, shape: "data", valueSchema: unknownKeyword.valueSchema };
      }

      return [keywordNode, keywordUri, keyword];
    });
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
        message: (reason, node = valueNode) => this.#message(reason, node, keyword.uri)
      };

      keyword.resolve(/** @type any */ (valueNode), context);
    }

    return effects;
  }

  /** @type (node: TreeNode, shape: Shape, resource: JsonSchemaDocumentNode, pointer: string, dialect: Dialect) => Promise<void> */
  async #shape(node, shape, resource, pointer, dialect) {
    if (Array.isArray(shape)) {
      const alternative = shape.find((alternative) => matchesShape(alternative, node));
      if (alternative === undefined) {
        this.#data(node, resource, pointer);
      } else {
        await this.#shape(node, alternative, resource, pointer, dialect);
      }
    } else if (!matchesShape(shape, node)) {
      this.#data(node, resource, pointer);
    } else if (shape === "schema") {
      await this.#schema(node, resource, pointer, dialect, false);
    } else if (shape === "data") {
      this.#data(node, resource, pointer);
    } else if ("array" in shape && !isErrorNode(node) && node.jsonType === "array") {
      node.location = location(resource, pointer);
      let index = 0;
      for (const itemNode of node.children) {
        await this.#shape(itemNode, shape.array, resource, JsonPointer.append(`${index++}`, pointer), dialect);
      }
    } else if ("map" in shape && !isErrorNode(node) && node.jsonType === "object") {
      node.location = location(resource, pointer);
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        await this.#shape(valueNode, shape.map, resource, JsonPointer.append(nameNode.value, pointer), dialect);
      }
    }
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
      fragmentKind: "json-pointer",
      anchors: {},
      dynamicAnchors: {},
      embedded: this.#embedded
    };
  }

  /** @type (uri: string, node: Node) => Promise<Dialect | undefined> */
  async #getDialect(uri, node) {
    try {
      return await this.#jsonSchema.getDialect(toAbsoluteIri(uri), { referencedFrom: this.#documentUri });
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
   * Build the dialect of a self-describing meta-schema from its own
   * `$vocabulary` if the dialect isn't already defined. A meta-schema without
   * `$vocabulary` gets its dialect the usual way, which works if the dialect
   * was added.
   *
   * @type (node: TreeNode, $schemaNode: JsonSchemaTolerantNode & { jsonType: "string" }) => Promise<Dialect | undefined>
   */
  async #selfDescribingDialect(node, $schemaNode) {
    const vocabularies = vocabulariesOf(node);
    if (!vocabularies || this.#jsonSchema.hasDialect($schemaNode.value)) {
      return this.#getDialect($schemaNode.value, $schemaNode);
    }

    try {
      return this.#jsonSchema.addDialectFromVocabularies($schemaNode.value, vocabularies);
    } catch (error) {
      const cause = /** @type Error */ (error);
      this.#message(cause.message, $schemaNode, "unknown-dialect", cause);
    }
  }

  /** @type (reason: string, node: Node, ruleId: string, cause?: Error) => VFileMessage */
  #message(reason, node, ruleId, cause) {
    return this.#file.message(reason, {
      place: node.position,
      ruleId: ruleId,
      source: "json-schema",
      cause: cause
    });
  }
}

/** @type (resource: JsonSchemaDocumentNode, pointer: string) => string */
const location = (resource, pointer) => `${resource.uri}#${encodeIriFragment(pointer)}`;

/** @type (node: TreeNode) => node is JsonErrorNode */
const isErrorNode = (node) => node.type === "json-invalid" || node.type === "json-missing";

/** @type (shape: Shape, node: TreeNode) => boolean */
const matchesShape = (shape, node) => {
  if (Array.isArray(shape)) {
    return shape.some((alternative) => matchesShape(alternative, node));
  } else if (shape === "data") {
    return true;
  } else if (isErrorNode(node)) {
    return false;
  } else if (shape === "schema") {
    return node.jsonType === "object" || node.jsonType === "boolean";
  } else if ("array" in shape) {
    return node.jsonType === "array";
  } else {
    return node.jsonType === "object";
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
