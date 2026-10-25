import { toAbsoluteIri } from "@hyperjump/uri";
import { VFileMessage } from "vfile-message";
import { appendToLocation, jsonValue, pointerGet } from "@hyperjump/browser/json";
import { isErrorNode } from "../keywords/checks.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { siblingValues } from "../keywords/utilities.js";
import { readsDynamicScope, readsMarks } from "./kernel.js";
import { normalForm } from "./normalize.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { Keyword, LowerInput, Reference, Shape } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { Expression, Handle, Kernel, KeywordGroup } from "./kernel.d.ts"
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

  /** @type Kernel["reads"] */
  #reads;

  /** @type Inputs */
  #inputs;

  // Lowering asks for the same few things over and over: a schema's
  // resource, its dialect, and the node a reference refers to. They don't change
  // during a lowering, so each is only worked out once.

  /** @type Map<string, string> */
  #absoluteIris;

  /** @type Map<string, Promise<Dialect>> */
  #dialects;

  /** @type Map<string, Promise<JsonSchemaNode>> */
  #nodes;

  /**
   * @param {JsonSchemaSession} session
   */
  constructor(session) {
    this.#session = session;
    this.#schemas = {};
    this.#resources = {};
    this.#reads = { evaluated: [], dynamicScope: [] };
    this.#absoluteIris = new Map();
    this.#dialects = new Map();
    this.#nodes = new Map();
    this.#inputs = {
      schema: (node) => this.#compileNode(node),
      reference: async (node) => {
        const uri = /** @type {{ href: string }} */ (node).href;
        const handle = await this.#compileUri(uri, this.#absoluteIri(node.location));
        const { dynamicAnchors } = this.#resources[this.#absoluteIri(handle)];
        return { uri, schema: { op: "apply", schema: handle }, handle, dynamicAnchors };
      }
    };
  }

  /** @type (uri: string) => Promise<Kernel> */
  async lower(uri) {
    const handle = await this.#compileUri(uri);
    return { kernel: 1, uri: handle, schemas: this.#schemas, resources: this.#resources, reads: this.#reads };
  }

  /** @type (uri: string, referencedFrom?: string) => Promise<Handle> */
  async #compileUri(uri, referencedFrom) {
    const key = `${referencedFrom ?? ""} ${uri}`;
    let node = this.#nodes.get(key);
    if (node === undefined) {
      node = this.#session.get(uri, referencedFrom === undefined ? undefined : { referencedFrom });
      this.#nodes.set(key, node);
    }
    return this.#compileNode(await node);
  }

  /**
   * The absolute IRI of a location, worked out once for each part before the
   * fragment, so once for each resource
   *
   * @type (location: string) => string
   */
  #absoluteIri(location) {
    const position = location.indexOf("#");
    const prefix = position === -1 ? location : location.slice(0, position);
    let absoluteIri = this.#absoluteIris.get(prefix);
    if (absoluteIri === undefined) {
      absoluteIri = toAbsoluteIri(prefix);
      this.#absoluteIris.set(prefix, absoluteIri);
    }
    return absoluteIri;
  }

  /** @type (uri: string) => Promise<Dialect> */
  #dialect(uri) {
    let dialect = this.#dialects.get(uri);
    if (dialect === undefined) {
      dialect = this.#session.getDialect(uri);
      this.#dialects.set(uri, dialect);
    }
    return dialect;
  }

  /** @type (node: JsonSchemaNode) => Promise<Handle> */
  async #compileNode(node) {
    if (node.type === "reference") {
      return this.#compileUri(node.href, this.#absoluteIri(node.location));
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

    const resource = this.#absoluteIri(handle);
    await this.#compileResource(resource);

    if (node.jsonType === "boolean") {
      this.#schemas[handle] = node.value;
      return handle;
    } else if (node.jsonType !== "object") {
      throw Error(`No schema found at '${handle}'`);
    }

    const dialect = await this.#dialect(node.dialectUri);
    const lowered = await lowerKeywords(this.#session.jsonSchema, /** @type ObjectSchemaNode */ (node), dialect, this.#inputs, false);
    const keywords = lowered.map(({ group }) => group);
    this.#schemas[handle] = { resource, keywords };

    // The groups that read marks are last, so only the last one is checked
    const last = keywords.at(-1);
    if (last !== undefined && readsMarks(last.expression)) {
      this.#reads.evaluated.push(handle);
    }
    if (keywords.some(({ expression }) => readsDynamicScope(expression))) {
      this.#reads.dynamicScope.push(handle);
    }
    return handle;
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
 * How the schemas and references in a keyword's value become its inputs.
 * Compiling compiles them and retrieves what references refer to. Lint
 * doesn't.
 *
 * @typedef {{
 *   schema: (node: JsonSchemaNode) => Promise<Handle>;
 *   reference: (node: JsonSchemaNode) => Promise<Reference>;
 * }} Inputs
 */

/**
 * A keyword group and the nodes it came from, for lint messages. When
 * lowering for lint, `withoutSiblings` has what the keyword lowers to without
 * each sibling it read, in the order of `sourceNodes`, or `undefined` if it
 * can't be lowered without it.
 *
 * @typedef {{
 *   group: KeywordGroup;
 *   keywordNode: JsonSchemaKeywordNode;
 *   sourceNodes: JsonSchemaKeywordNode[];
 *   withoutSiblings?: (Expression | undefined)[];
 * }} LoweredKeyword
 */

/** A value that doesn't fit its keyword's shape */
class Misfit extends Error {}

/**
 * An object schema's keyword groups, in the order they're evaluated: a group
 * that reads marks comes after the groups that don't, so it sees what they
 * marked, in document order otherwise. A keyword without `lower` has no
 * group, and its value isn't parsed, like `$defs`. The expressions are in
 * the normal form.
 *
 * The resolver reports values that don't fit their shape or that their
 * keyword's `check` rejects, and a schema with a problem isn't compiled, so
 * when compiling, every value fits. Lint lowers broken documents, so if
 * `tolerant`, a keyword whose value doesn't fit or is rejected, or whose
 * `lower` throws, has no group, and a sibling whose value doesn't fit or is
 * rejected is left out. Each keyword is also lowered without each sibling
 * it read, so lint knows where each operation came from.
 *
 * @type (jsonSchema: JsonSchema, node: ObjectSchemaNode, dialect: Dialect, inputs: Inputs, tolerant: boolean) => Promise<LoweredKeyword[]>
 */
export const lowerKeywords = async (jsonSchema, node, dialect, inputs, tolerant) => {
  const properties = node.children;

  /** @type LoweredKeyword[] */
  const lowered = [];
  /** @type LoweredKeyword[] */
  const readingMarks = [];
  for (const keywordNode of properties) {
    const [nameNode, valueNode] = keywordNode.children;
    const keywordUri = keywordNode.keywordUri;
    const keyword = jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
    if (keyword.lower === undefined || (tolerant && !accepts(keyword, valueNode, node))) {
      continue;
    }

    try {
      const value = await parse(valueNode, keyword.shape, inputs);

      /** @type Record<string, LowerInput | undefined> */
      const siblings = {};
      /** @type JsonSchemaKeywordNode[] */
      const sourceNodes = [];
      /** @type string[] */
      const sourceNames = [];
      for (const [name, siblingUri] of Object.entries(keyword.siblings ?? {})) {
        siblings[name] = undefined;
        const sibling = properties.find((property) => property.keywordUri === siblingUri);
        if (sibling === undefined) {
          continue;
        }

        const siblingKeyword = jsonSchema.getKeyword(keywordDefinitionUri(siblingUri));
        if (tolerant && !accepts(siblingKeyword, sibling.children[1], node)) {
          continue;
        }

        try {
          siblings[name] = await parse(sibling.children[1], siblingKeyword.shape, inputs);
          sourceNodes.push(sibling);
          sourceNames.push(name);
        } catch (error) {
          if (!tolerant || !(error instanceof Misfit)) {
            throw error;
          }
        }
      }

      const lowerKeyword = keyword.lower;
      const context = { jsonSchema, dialect, keywordName: nameNode.value };
      const expression = normalForm(lowerKeyword(value, siblings, context));
      const group = {
        keywordUri,
        location: appendToLocation(nameNode.value, node.location),
        sources: sourceNodes.map((sourceNode) => appendToLocation(sourceNode.children[0].value, node.location)),
        expression
      };

      /** @type LoweredKeyword */
      const loweredKeyword = { group, keywordNode, sourceNodes };
      if (tolerant) {
        loweredKeyword.withoutSiblings = sourceNames.map((name) => {
          try {
            return normalForm(lowerKeyword(value, { ...siblings, [name]: undefined }, context));
          } catch {
            return undefined;
          }
        });
      }
      (readsMarks(expression) ? readingMarks : lowered).push(loweredKeyword);
    } catch (error) {
      if (!tolerant) {
        throw error;
      }
    }
  }

  return [...lowered, ...readingMarks];
};

/**
 * Whether a keyword's `check` accepts its value, as the resolver checks it
 *
 * @type (keyword: Keyword, valueNode: JsonSchemaNode, schemaNode: ObjectSchemaNode) => boolean
 */
const accepts = (keyword, valueNode, schemaNode) => {
  const tolerantNode = /** @type JsonSchemaTolerantNode */ (valueNode);
  if (isErrorNode(tolerantNode)) {
    return false;
  }

  let accepted = true;
  keyword.check?.(tolerantNode, {
    siblings: siblingValues(/** @type JsonSchemaTolerantNode */ (schemaNode), keyword.siblings),
    message: (reason) => {
      accepted = false;
      return new VFileMessage(reason);
    }
  });
  return accepted;
};

/**
 * A value as `lower` gets it, by its shape
 *
 * @type (node: JsonSchemaNode, shape: Shape, inputs: Inputs) => Promise<LowerInput>
 */
const parse = async (node, shape, inputs) => {
  if (shape === "schema") {
    if (node.type !== "json-schema" && node.type !== "reference") {
      throw new Misfit();
    }
    return { op: "apply", schema: await inputs.schema(node) };
  } else if (shape === "reference") {
    if (node.jsonType !== "string" || /** @type {{ href?: string }} */ (node).href === undefined) {
      throw new Misfit();
    }
    return inputs.reference(node);
  } else if (shape === "data" || shape === "unappliedSchema") {
    const value = /** @type Json | undefined */ (jsonValue(node));
    if (value === undefined) {
      throw new Misfit();
    }
    return value;
  } else if (Array.isArray(shape)) {
    const alternative = shape.find((alternative) => fits(node, alternative));
    if (alternative === undefined) {
      throw new Misfit();
    }
    return parse(node, alternative, inputs);
  } else if ("array" in shape) {
    if (node.jsonType !== "array") {
      throw new Misfit();
    }

    /** @type LowerInput[] */
    const items = [];
    for (const itemNode of /** @type JsonSchemaNode[] */ (/** @type ContainerNode */ (node).children)) {
      items.push(await parse(itemNode, shape.array, inputs));
    }
    return items;
  } else {
    if (node.jsonType !== "object") {
      throw new Misfit();
    }

    // Pairs, because a name like `__proto__` can't be a property of a plain
    // object
    /** @type [string, LowerInput][] */
    const pairs = [];
    for (const propertyNode of /** @type JsonSchemaKeywordNode[] */ (/** @type ContainerNode */ (node).children)) {
      const [nameNode, valueNode] = propertyNode.children;
      pairs.push([nameNode.value, await parse(valueNode, shape.map, inputs)]);
    }
    return pairs;
  }
};

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
