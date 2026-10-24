import { toAbsoluteIri } from "@hyperjump/uri";
import { appendToLocation, jsonValue, pointerGet } from "@hyperjump/browser/json";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { readsMarks } from "./kernel.js";
import { normalForm } from "./normalize.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LowerInput, Reference, Shape } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { Handle, Kernel, KeywordGroup } from "./kernel.d.ts"
 */

/**
 * @typedef {JsonSchemaNode & { type: "json-schema"; dialectUri: string; children: JsonSchemaKeywordNode[] }} ObjectSchemaNode
 * @typedef {{ children: unknown[] }} ContainerNode
 */

/**
 * Compile a schema: lower it and every schema it applies, retrieving what
 * references refer to. All I/O happens here. Each keyword's value is parsed
 * by its shape, with the schemas in it compiled, and given to its `lower`,
 * with its siblings parsed the same way. The expressions are in the normal
 * form.
 *
 * @type (session: JsonSchemaSession, uri: string) => Promise<Kernel>
 */
export const lower = async (session, uri) => {
  return new Lowerer(session).lower(uri);
};

class Lowerer {
  /** @type JsonSchemaSession */
  #session;

  /** @type Kernel["schemas"] */
  #schemas;

  /** @type Kernel["resources"] */
  #resources;

  /**
   * @param {JsonSchemaSession} session
   */
  constructor(session) {
    this.#session = session;
    this.#schemas = {};
    this.#resources = {};
  }

  /** @type (uri: string) => Promise<Kernel> */
  async lower(uri) {
    const handle = await this.#compileUri(uri);
    return { kernel: 1, uri: handle, schemas: this.#schemas, resources: this.#resources };
  }

  /** @type (uri: string, referencedFrom?: string) => Promise<Handle> */
  async #compileUri(uri, referencedFrom) {
    const node = await this.#session.get(uri, referencedFrom === undefined ? undefined : { referencedFrom });
    return this.#compileNode(node);
  }

  /** @type (node: JsonSchemaNode) => Promise<Handle> */
  async #compileNode(node) {
    if (node.type === "reference") {
      return this.#compileUri(node.href, toAbsoluteIri(node.location));
    } else if (node.type !== "json-schema") {
      throw Error(`No schema found at '${node.location}'`);
    }

    const handle = node.location;
    if (handle in this.#schemas) {
      return handle;
    }

    // A placeholder so schemas that refer to each other are only compiled
    // once
    this.#schemas[handle] = false;

    const resource = toAbsoluteIri(handle);
    await this.#compileResource(resource);

    if (node.jsonType === "boolean") {
      this.#schemas[handle] = node.value;
      return handle;
    } else if (node.jsonType !== "object") {
      throw Error(`No schema found at '${handle}'`);
    }

    this.#schemas[handle] = { resource, keywords: await this.#lowerKeywords(/** @type ObjectSchemaNode */ (node)) };
    return handle;
  }

  /**
   * A schema's keyword groups, in the order they're evaluated: a group that
   * reads marks comes after the groups that don't, so it sees what they
   * marked, in document order otherwise. A keyword without `lower` has no
   * group, and its value isn't compiled, like `$defs`.
   *
   * @type (node: ObjectSchemaNode) => Promise<KeywordGroup[]>
   */
  async #lowerKeywords(node) {
    const { jsonSchema } = this.#session;
    const dialect = await this.#session.getDialect(node.dialectUri);
    const properties = node.children;

    /** @type KeywordGroup[] */
    const groups = [];
    /** @type KeywordGroup[] */
    const readingMarks = [];
    for (const property of properties) {
      const [nameNode, valueNode] = property.children;
      const keywordUri = property.keywordUri;
      const keyword = jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
      if (keyword.lower === undefined) {
        continue;
      }

      const value = await this.#parse(valueNode, keyword.shape);

      /** @type Record<string, LowerInput | undefined> */
      const siblings = {};
      /** @type string[] */
      const sources = [];
      for (const [name, siblingUri] of Object.entries(keyword.siblings ?? {})) {
        siblings[name] = undefined;
        const sibling = properties.find((property) => property.keywordUri === siblingUri);
        if (sibling !== undefined) {
          const siblingKeyword = jsonSchema.getKeyword(keywordDefinitionUri(siblingUri));
          siblings[name] = await this.#parse(sibling.children[1], siblingKeyword.shape);
          sources.push(appendToLocation(sibling.children[0].value, node.location));
        }
      }

      const expression = normalForm(keyword.lower(value, siblings, { jsonSchema, dialect, keywordName: nameNode.value }));
      const group = { keywordUri, location: appendToLocation(nameNode.value, node.location), sources, expression };
      (readsMarks(expression) ? readingMarks : groups).push(group);
    }

    return [...groups, ...readingMarks];
  }

  /**
   * A value as `lower` gets it, by its shape. The resolver already reported
   * values that don't fit, and a schema with a problem isn't compiled, so
   * every value fits here.
   *
   * @type (node: JsonSchemaNode, shape: Shape) => Promise<LowerInput>
   */
  async #parse(node, shape) {
    if (shape === "schema") {
      return { op: "apply", schema: await this.#compileNode(node) };
    } else if (shape === "reference") {
      return this.#reference(node);
    } else if (shape === "data" || shape === "unappliedSchema") {
      return /** @type Json */ (jsonValue(node));
    } else if (Array.isArray(shape)) {
      const alternative = /** @type Shape */ (shape.find((alternative) => fits(node, alternative)));
      return this.#parse(node, alternative);
    } else if ("array" in shape) {
      /** @type LowerInput[] */
      const items = [];
      for (const itemNode of /** @type JsonSchemaNode[] */ (/** @type ContainerNode */ (node).children)) {
        items.push(await this.#parse(itemNode, shape.array));
      }
      return items;
    } else {
      // Pairs, because a name like `__proto__` can't be a property of a
      // plain object
      /** @type [string, LowerInput][] */
      const pairs = [];
      for (const propertyNode of /** @type JsonSchemaKeywordNode[] */ (/** @type ContainerNode */ (node).children)) {
        const [nameNode, valueNode] = propertyNode.children;
        pairs.push([nameNode.value, await this.#parse(valueNode, shape.map)]);
      }
      return pairs;
    }
  }

  /** @type (node: JsonSchemaNode) => Promise<Reference> */
  async #reference(node) {
    const uri = /** @type {{ href: string }} */ (node).href;
    const handle = await this.#compileUri(uri, toAbsoluteIri(node.location));
    const { dynamicAnchors } = this.#resources[toAbsoluteIri(handle)];
    return { uri, schema: { op: "apply", schema: handle }, handle, dynamicAnchors };
  }

  /**
   * Compile a resource's dynamic anchors. Evaluation might need them
   * whenever it enters the resource, and nothing can be retrieved then.
   * They're recorded before their schemas are compiled, so a reference
   * that's lowered while they're compiled, like `meta/core`'s `$dynamicRef`
   * to its own `"meta"` anchor, sees every one.
   *
   * @type (uri: string) => Promise<void>
   */
  async #compileResource(uri) {
    if (uri in this.#resources) {
      return;
    }

    /** @type Record<string, Handle> */
    const dynamicAnchors = {};
    this.#resources[uri] = { dynamicAnchors };

    const resource = /** @type JsonSchemaDocumentNode */ (await this.#session.getDocument(uri, { referencedFrom: uri }));
    const root = /** @type JsonSchemaNode */ (resource.children[0]);

    /** @type JsonSchemaNode[] */
    const anchorNodes = [];
    for (const name in resource.dynamicAnchors) {
      const anchorNode = /** @type JsonSchemaNode */ (pointerGet(resource.dynamicAnchors[name], root));
      dynamicAnchors[name] = anchorNode.location;
      anchorNodes.push(anchorNode);
    }

    for (const anchorNode of anchorNodes) {
      await this.#compileNode(anchorNode);
    }
  }
}

/**
 * Whether a value has the JSON type an alternative of a shape is for
 *
 * @type (node: JsonSchemaNode, shape: Shape) => boolean
 */
const fits = (node, shape) => {
  if (shape === "data" || shape === "unappliedSchema") {
    return true;
  } else if (shape === "schema") {
    return node.type === "json-schema" || node.type === "reference";
  } else if (shape === "reference") {
    return node.jsonType === "string";
  } else if (Array.isArray(shape)) {
    return shape.some((alternative) => fits(node, alternative));
  }

  return "array" in shape ? node.jsonType === "array" : node.jsonType === "object";
};
