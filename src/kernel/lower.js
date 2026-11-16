import { appendToLocation, get, jsonValue, jsonPointerGet, relativeFileUrl } from "@hyperjump/browser";
import { isErrorNode } from "../keywords/checks.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { siblingValues } from "../keywords/utilities.js";
import { readsDynamicScope, readsMarks } from "./kernel.js";
import { normalForm } from "./normalize.js";
import { getDialect } from "../session.js";
import { definitionsOf } from "../definition-of.js";
import { isSchemaDocument, isSchemaNode } from "../schema/schema-nodes.js";
import { differentResources, sameResource } from "../schema/same-resource.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Iri } from "@hyperjump/uri"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { Keyword, LowerInput, Reference, Shape } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { Expression, Handle, Kernel, KeywordGroup } from "./kernel.d.ts"
 * @import { Hyperjump, Target } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/**
 * @typedef {JsonSchemaNode & { type: "json-schema"; dialectUri: string; children: JsonSchemaKeywordNode[] }} ObjectSchemaNode
 * @typedef {{ children: unknown[] }} ContainerNode
 */

/**
 * How the schemas and references in a keyword's value become its inputs.
 * Compiling follows a reference to find what it refers to, so they can be
 * asynchronous. Lint knows everything from the document.
 *
 * @typedef {{
 *   schema: (node: JsonSchemaNode) => Handle | Promise<Handle>;
 *   reference: (node: JsonSchemaNode) => Reference | Promise<Reference>;
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
 * `keywords` are the definitions, by URI. A resolved schema only has
 * keywords that have one.
 *
 * @type (keywords: Readonly<Record<string, Keyword>>, node: ObjectSchemaNode, dialect: Dialect, inputs: Inputs, tolerant: boolean) => Promise<LoweredKeyword[]>
 */
export const lowerKeywords = async (keywords, node, dialect, inputs, tolerant) => {
  const properties = node.children;

  /** @type LoweredKeyword[] */
  const lowered = [];
  /** @type LoweredKeyword[] */
  const readingMarks = [];
  for (const keywordNode of properties) {
    const [nameNode, valueNode] = keywordNode.children;
    const keywordUri = keywordNode.keywordUri;
    const keyword = keywords[keywordDefinitionUri(keywordUri)];
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

        const siblingKeyword = keywords[keywordDefinitionUri(siblingUri)];
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
      const context = { dialect, keywordName: nameNode.value };
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
 * A reference to a schema: a keyword's value whose shape is `"reference"`,
 * or a schema that's a reference
 *
 * @typedef {JsonSchemaNode & { href: Iri }} ReferenceNode
 */

/**
 * A schema, with the document it's in, which is where its references are
 * followed from
 *
 * @typedef {Target<JsonSchemaDocumentNode, JsonSchemaNode>} SchemaTarget
 */

/**
 * @param {Target} target
 * @returns {target is SchemaTarget}
 */
const isSchemaTarget = (target) => isSchemaNode(target.node) && isSchemaDocument(target.document);

/** @type (target: Target, uri: string) => SchemaTarget */
const schemaTarget = (target, uri) => {
  if (!isSchemaTarget(target)) {
    throw Error(`'${relativeFileUrl(uri)}' isn't a schema`, { cause: { code: "ERR_NOT_A_SCHEMA" } });
  }
  return target;
};

/**
 * The URI of the resource a location is in. A location is its resource's
 * URI, which is absolute and normalized, and a fragment.
 *
 * @type (location: string) => string
 */
const absoluteIri = (location) => {
  const position = location.indexOf("#");
  return position === -1 ? location : location.slice(0, position);
};

/**
 * The resource a schema is in, in its document
 *
 * @type (target: SchemaTarget) => JsonSchemaDocumentNode
 */
const resourceOf = ({ document, node }) => document.embedded[absoluteIri(node.location)];

/**
 * The schemas with a resource's dynamic anchors, by name
 *
 * @type (resource: JsonSchemaDocumentNode) => [name: string, node: JsonSchemaNode][]
 */
const dynamicAnchorsOf = (resource) => {
  const root = /** @type JsonSchemaNode */ (resource.children[0]);
  return Object.keys(resource.dynamicAnchors).map((name) => [name, /** @type JsonSchemaNode */ (jsonPointerGet(resource.dynamicAnchors[name], root))]);
};

/**
 * Compile a schema: lower it and every schema it applies, following
 * references as it reaches them. Each keyword's value is parsed by its
 * shape, with the schemas in it compiled, and given to its `lower`, with
 * its siblings parsed the same way. The expressions are in the normal form.
 *
 * Schemas are lowered one at a time, in the order they're found, and a
 * reference is followed when it's reached, so what's compiled and what
 * fails is the same every time.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, uri: string) => Promise<Kernel>
 */
export const lower = async (session, uri) => {
  const keywords = definitionsOf(session.config).keywords;

  /** @type Kernel["schemas"] */
  const schemas = {};
  /** @type Kernel["resources"] */
  const resources = {};
  /** @type Kernel["reads"] */
  const reads = { evaluated: [], dynamicScope: [] };

  /** @type Map<string, Dialect> */
  const dialects = new Map();

  /**
   * Each resource being compiled, with its document, by URI. A kernel names
   * a schema by its location, so there can only be one resource for a URI.
   * A resource that's reached in another document has to be identical.
   *
   * @type Map<string, [resource: JsonSchemaDocumentNode, document: JsonSchemaDocumentNode]>
   */
  const compiled = new Map();

  /**
   * Schemas to lower. They're queued by node and not by location, so a
   * resource that's in more than one document has its references followed
   * from each of them.
   *
   * @type SchemaTarget[]
   */
  const queue = [];
  /** @type Set<JsonSchemaNode> */
  const queued = new Set();

  /**
   * The handle of a schema, which is queued to be lowered. The first
   * schema of a resource adds the resource to the kernel, with the schemas
   * that have its dynamic anchors. Evaluation might need them whenever it
   * enters the resource, and nothing can be retrieved then, so they're
   * compiled too.
   *
   * @type (target: SchemaTarget) => Handle
   * @throws SchemaError if another document being compiled has a different
   * resource with the same URI.
   */
  const schema = (target) => {
    const { document, node } = target;
    if (node.type !== "json-schema") {
      throw Error(`No schema found at '${relativeFileUrl(node.location)}'`);
    }

    if (!queued.has(node)) {
      queued.add(node);

      const resourceUri = absoluteIri(node.location);
      const resource = resourceOf(target);
      const other = compiled.get(resourceUri);
      if (other === undefined) {
        compiled.set(resourceUri, [resource, document]);
        /** @type Record<string, Handle> */
        const dynamicAnchors = {};
        for (const [name, anchorNode] of dynamicAnchorsOf(resource)) {
          dynamicAnchors[name] = schema({ document, node: anchorNode });
        }
        resources[resourceUri] = { dynamicAnchors };
      } else if (other[0] !== resource && !sameResource(other[0], resource)) {
        throw differentResources(resource, document, other[1]);
      }

      queue.push(target);
    }
    return node.location;
  };

  const handle = schema(schemaTarget(/** @type Target */ (await get(session, uri)), uri));
  for (let index = 0; index < queue.length; index++) {
    const from = queue[index];
    const { document, node } = from;
    if (node.jsonType === "boolean") {
      schemas[node.location] = node.value;
      continue;
    } else if (node.jsonType !== "object") {
      throw Error(`No schema found at '${relativeFileUrl(node.location)}'`);
    }

    const { dialectUri } = /** @type ObjectSchemaNode */ (node);
    let dialect = dialects.get(dialectUri);
    if (dialect === undefined) {
      dialect = await getDialect(session, dialectUri);
      dialects.set(dialectUri, dialect);
    }

    /**
     * The handle of the schema a reference in this schema finds
     *
     * @type (referenceNode: JsonSchemaNode) => Promise<Handle>
     */
    const follow = async (referenceNode) => {
      const { href } = /** @type ReferenceNode */ (referenceNode);
      return schema(schemaTarget(/** @type Target */ (await get(session, href, { referencedFrom: from })), href));
    };

    /** @type Inputs */
    const inputs = {
      // A schema that's a reference is the schema it finds
      schema: (schemaNode) => schemaNode.type === "reference" ? follow(schemaNode) : schema({ document, node: schemaNode }),
      reference: async (referenceNode) => {
        const found = await follow(referenceNode);
        const { href } = /** @type ReferenceNode */ (referenceNode);
        return { uri: href, schema: { op: "apply", schema: found }, handle: found, dynamicAnchors: resources[absoluteIri(found)].dynamicAnchors };
      }
    };

    const lowered = await lowerKeywords(keywords, /** @type ObjectSchemaNode */ (node), dialect, inputs, false);

    // The same schema in another document lowers to the same thing
    if (node.location in schemas) {
      continue;
    }

    const groups = lowered.map(({ group }) => group);
    schemas[node.location] = { resource: absoluteIri(node.location), keywords: groups };

    // The groups that read marks are last, so only the last one is checked
    const last = groups.at(-1);
    if (last !== undefined && readsMarks(last.expression)) {
      reads.evaluated.push(node.location);
    }
    if (groups.some(({ expression }) => readsDynamicScope(expression))) {
      reads.dynamicScope.push(node.location);
    }
  }

  return { kernel: 1, uri: handle, schemas, resources, reads };
};

/** A value that doesn't fit its keyword's shape */
class Misfit extends Error {}

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
    message: () => {
      accepted = false;
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
