import { appendToLocation, jsonValue, jsonPointerGet, relativeFileUrl } from "@hyperjump/browser";
import { isErrorNode } from "../keywords/checks.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { siblingValues } from "../keywords/utilities.js";
import { readsDynamicScope, readsMarks } from "./kernel.js";
import { normalForm } from "./normalize.js";
import { documentOf, get, getDialect, resourceOf } from "../session.js";
import { differentResources, sameResource } from "../schema/same-resource.js";
import { isSchemaNode } from "../schema/schema-nodes.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Iri } from "@hyperjump/uri"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { Keyword, LowerInput, Reference, Shape } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { Expression, Handle, Kernel, KeywordGroup } from "./kernel.d.ts"
 */

/**
 * @typedef {JsonSchemaNode & { type: "json-schema"; dialectUri: string; children: JsonSchemaKeywordNode[] }} ObjectSchemaNode
 * @typedef {Record<string, JsonSchemaDocumentNode>} Embedded
 * @typedef {{ children: unknown[] }} ContainerNode
 */

/**
 * Compile a schema: lower it and every schema it applies, retrieving what
 * references refer to. All I/O happens here, between lowerings, which are
 * synchronous. Each keyword's value is parsed by its shape, with the
 * schemas in it compiled, and given to its `lower`, with its siblings
 * parsed the same way. The expressions are in the normal form.
 *
 * @type (session: JsonSchemaSession, uri: string) => Promise<Kernel>
 */
export const lower = async (session, uri) => {
  return new Lowerer(session).lower(uri);
};

/**
 * How the schemas and references in a keyword's value become its inputs.
 * They don't retrieve anything. Compiling queues the schemas to be
 * compiled, and a reference whose target hasn't been retrieved yet is a
 * placeholder, and a need, so the schema is lowered once it's there. While
 * something is `missing`, keywords aren't lowered, so `lower` never sees a
 * placeholder, but their values are still parsed, so everything the schema
 * needs is found at once. Lint knows everything from the document.
 *
 * @typedef {{
 *   schema: (node: JsonSchemaNode) => Handle;
 *   reference: (node: JsonSchemaNode) => Reference;
 *   missing?: () => boolean;
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
 * `keywordOf` is the definition of a keyword by URI.
 *
 * @type (keywordOf: (uri: string) => Keyword, node: ObjectSchemaNode, dialect: Dialect, inputs: Inputs, tolerant: boolean) => LoweredKeyword[]
 */
export const lowerKeywords = (keywordOf, node, dialect, inputs, tolerant) => {
  const properties = node.children;

  /** @type LoweredKeyword[] */
  const lowered = [];
  /** @type LoweredKeyword[] */
  const readingMarks = [];
  for (const keywordNode of properties) {
    const [nameNode, valueNode] = keywordNode.children;
    const keywordUri = keywordNode.keywordUri;
    const keyword = keywordOf(keywordDefinitionUri(keywordUri));
    if (keyword.lower === undefined || (tolerant && !accepts(keyword, valueNode, node))) {
      continue;
    }

    try {
      const value = parse(valueNode, keyword.shape, inputs);

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

        const siblingKeyword = keywordOf(keywordDefinitionUri(siblingUri));
        if (tolerant && !accepts(siblingKeyword, sibling.children[1], node)) {
          continue;
        }

        try {
          siblings[name] = parse(sibling.children[1], siblingKeyword.shape, inputs);
          sourceNodes.push(sibling);
          sourceNames.push(name);
        } catch (error) {
          if (!tolerant || !(error instanceof Misfit)) {
            throw error;
          }
        }
      }

      // A keyword is only lowered with inputs that are all there
      if (inputs.missing?.()) {
        continue;
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
 * What compiling needs that's retrieved: the node a reference finds (by
 * the URI and the document the reference is in, as a number), and a
 * dialect
 *
 * @typedef {{ kind: "target"; uri: string; document: number; from: JsonSchemaNode | undefined }
 *   | { kind: "dialect"; uri: string }} Need
 */

/**
 * Compiling lowers every schema it can with what's been retrieved, then
 * retrieves what the others need, all at once, and lowers them again, until
 * nothing is missing. Lowering a schema doesn't retrieve anything. A schema
 * that's missing something is lowered once it's there.
 */
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

  /**
   * What's been retrieved: the nodes references found, by
   * `"<document> <uri>"`, and the dialects. Every reference to a URI from
   * one document finds the same thing, and one from another document might
   * not, since a document's references find what it contains first.
   *
   * @type Map<string, JsonSchemaNode>
   */
  #targets;

  /**
   * The document of each resource being compiled, by URI. A kernel names a
   * schema by its location, so there can only be one resource for a URI.
   * A resource that's reached in another document has to be identical.
   *
   * @type Map<string, JsonSchemaDocumentNode>
   */
  #resourceDocuments;

  /**
   * The document of each schema that's been queued, as the `embedded` its
   * resources share. A schema in a schema that's being lowered is in its
   * document, so only the document of a schema a reference finds is looked
   * for.
   *
   * @type Map<JsonSchemaNode, Embedded>
   */
  #documents;

  /**
   * The document of the schema that's being lowered, which its references
   * are followed from
   *
   * @type Embedded | undefined
   */
  #current;

  /**
   * A number for each document, with 0 for no document
   *
   * @type Map<Embedded, number>
   */
  #documentNumbers;

  /** @type Map<string, Dialect> */
  #dialects;

  /**
   * What's being retrieved, by need, so each is retrieved once
   *
   * @type Map<string, Promise<void>>
   */
  #retrieving;

  /**
   * Schemas to lower, and every schema that's been queued
   *
   * @type JsonSchemaNode[]
   */
  #queue;

  /** @type Set<JsonSchemaNode> */
  #queued;

  /**
   * What the schema being lowered needs that hasn't been retrieved, by key
   *
   * @type Map<string, Need>
   */
  #needs;

  // Lowering asks for the same few things over and over, like a schema's
  // resource, so they're only worked out once

  /**
   * @param {JsonSchemaSession} session
   */
  constructor(session) {
    this.#session = session;
    this.#schemas = {};
    this.#resources = {};
    this.#reads = { evaluated: [], dynamicScope: [] };
    this.#targets = new Map();
    this.#resourceDocuments = new Map();
    this.#documents = new Map();
    this.#documentNumbers = new Map();
    this.#dialects = new Map();
    this.#retrieving = new Map();
    this.#queue = [];
    this.#queued = new Set();
    this.#needs = new Map();
    this.#inputs = {
      schema: (node) => this.#handle(node),
      reference: (node) => {
        const uri = /** @type {{ href: Iri }} */ (node).href;
        const target = this.#target(uri, node);
        if (target === undefined) {
          return { uri, schema: { op: "apply", schema: "" }, handle: "", dynamicAnchors: undefined };
        }

        // Its resource is added when it's queued
        const handle = this.#schema(target);
        const resource = this.#resources[this.#absoluteIri(handle)];
        return { uri, schema: { op: "apply", schema: handle }, handle, dynamicAnchors: resource.dynamicAnchors };
      },
      missing: () => this.#needs.size > 0
    };
  }

  /** @type (uri: string) => Promise<Kernel> */
  async lower(uri) {
    await this.#retrieve([{ kind: "target", uri, document: 0, from: undefined }]);
    const handle = this.#schema(/** @type JsonSchemaNode */ (this.#targets.get(`0 ${uri}`)));

    for (let pending = this.#lowerQueued(); pending.length > 0; pending = this.#lowerQueued()) {
      await this.#retrieve(pending.flatMap(({ needs }) => needs));
      this.#queue.push(...pending.map(({ node }) => node));
    }

    return { kernel: 1, uri: handle, schemas: this.#schemas, resources: this.#resources, reads: this.#reads };
  }

  /**
   * Lower every schema that's queued, and the ones they find. It returns the
   * schemas that are missing something, with what they need.
   *
   * @type () => { node: JsonSchemaNode; needs: Need[] }[]
   */
  #lowerQueued() {
    /** @type {{ node: JsonSchemaNode; needs: Need[] }[]} */
    const pending = [];
    // In the order they're found, so what's missing is retrieved, and
    // reported, in document order
    for (let index = 0; index < this.#queue.length; index++) {
      const node = this.#queue[index];
      this.#needs.clear();
      this.#lowerSchema(node);
      if (this.#needs.size > 0) {
        pending.push({ node, needs: [...this.#needs.values()] });
      }
    }
    this.#queue.length = 0;
    return pending;
  }

  /**
   * Retrieve what schemas need, at the same time. A schema a reference
   * finds needs its dialect to be lowered, so it's retrieved with it. If more than one fails, the first one's error is
   * thrown, so it's the same every time.
   *
   * @type (needs: Need[]) => Promise<void>
   */
  async #retrieve(needs) {
    const results = await Promise.allSettled(needs.map((need) => this.#retrieveNeed(need)));
    const failed = results.find((result) => result.status === "rejected");
    if (failed !== undefined) {
      throw failed.reason;
    }
  }

  /** @type (need: Need) => Promise<void> */
  #retrieveNeed(need) {
    const key = needKey(need);
    let retrieving = this.#retrieving.get(key);
    if (retrieving === undefined) {
      retrieving = this.#retrieveOnce(key, need);
      this.#retrieving.set(key, retrieving);
    }
    return retrieving;
  }

  /** @type (key: string, need: Need) => Promise<void> */
  async #retrieveOnce(key, need) {
    if (need.kind === "target") {
      // A reference can lead to any document the session can read
      const target = await get(this.#session, need.uri, need.from === undefined ? undefined : { referencedFrom: need.from });
      if (!isSchemaNode(target)) {
        throw Error(`No schema found at '${relativeFileUrl(need.uri)}'`);
      }
      this.#targets.set(key, target);

      if (target.jsonType === "object") {
        await this.#retrieve([{ kind: "dialect", uri: target.dialectUri }]);
      }
    } else {
      this.#dialects.set(need.uri, await getDialect(this.#session, need.uri));
    }
  }

  /**
   * Add the resource a schema is in, in its document. The first schema of a
   * resource adds it to the kernel. A schema of another document's resource
   * with the same URI is only compiled if that resource is identical, so
   * what's compiled doesn't depend on which document was reached first.
   *
   * @type (node: JsonSchemaNode, document: Embedded) => void
   * @throws SchemaError if another document being compiled has a different
   * resource with the same URI.
   */
  #resource(node, document) {
    const uri = this.#absoluteIri(node.location);
    const resource = document[uri];
    const compiled = this.#resourceDocuments.get(uri);
    if (compiled === undefined) {
      this.#resourceDocuments.set(uri, resource);
      this.#addResource(uri, resource);
    } else if (compiled !== resource && !sameResource(compiled, resource)) {
      const inDocument = documentOf(this.#session, resource) ?? resource;
      throw differentResources(resource, inDocument, documentOf(this.#session, compiled) ?? compiled);
    }
  }

  /**
   * The document a schema a reference found is in. Nothing is retrieved: a
   * node is from a document the session has.
   *
   * @type (node: JsonSchemaNode) => Embedded
   */
  #documentOf(node) {
    const resource = resourceOf(this.#session, node);
    if (resource === undefined) {
      throw Error(`'${relativeFileUrl(node.location)}' isn't in a schema the session has`);
    }
    return resource.embedded;
  }

  /** @type (document: Embedded | undefined) => number */
  #documentNumber(document) {
    if (document === undefined) {
      return 0;
    }

    let number = this.#documentNumbers.get(document);
    if (number === undefined) {
      number = this.#documentNumbers.size + 1;
      this.#documentNumbers.set(document, number);
    }
    return number;
  }

  /**
   * A resource's dynamic anchors. Evaluation might need them whenever it
   * enters the resource, and nothing can be retrieved then, so the schemas
   * they're on are compiled too.
   *
   * @type (uri: string, document: JsonSchemaDocumentNode) => void
   */
  #addResource(uri, document) {
    /** @type Record<string, Handle> */
    const dynamicAnchors = {};
    const root = /** @type JsonSchemaNode */ (document.children[0]);
    for (const name in document.dynamicAnchors) {
      const anchorNode = /** @type JsonSchemaNode */ (jsonPointerGet(document.dynamicAnchors[name], root));
      dynamicAnchors[name] = anchorNode.location;
      this.#schema(anchorNode, document.embedded);
    }
    this.#resources[uri] = { dynamicAnchors };
  }

  /** @type (need: Need) => void */
  #need(need) {
    this.#needs.set(needKey(need), need);
  }

  /**
   * The node a reference in the schema that's being lowered finds, if it's
   * been retrieved. A reference is followed from its node, so it finds what
   * its document contains. What it finds is kept by the reference's
   * document, where every reference to a URI finds the same thing.
   *
   * @type (uri: string, from: JsonSchemaNode) => JsonSchemaNode | undefined
   */
  #target(uri, from) {
    const document = this.#documentNumber(this.#current);
    const target = this.#targets.get(`${document} ${uri}`);
    if (target === undefined) {
      this.#need({ kind: "target", uri, document, from });
    }
    return target;
  }

  /**
   * The handle of a schema, which is queued to be lowered. A schema that's a
   * reference is the schema it finds.
   *
   * @type (node: JsonSchemaNode) => Handle
   */
  #handle(node) {
    if (node.type !== "reference") {
      return this.#schema(node, this.#current);
    }

    const target = this.#target(/** @type Iri */ (node.href), node);
    return target === undefined ? "" : this.#schema(target);
  }

  /**
   * Queue a schema. `document` is its document, if it's in the one that's
   * being lowered. Without it, it's one a reference found, and its
   * document is looked for.
   *
   * @type (node: JsonSchemaNode, document?: Embedded) => Handle
   */
  #schema(node, document) {
    if (node.type !== "json-schema") {
      throw Error(`No schema found at '${relativeFileUrl(node.location)}'`);
    }

    // Queued by node and not by location, so a resource that's in more
    // than one document has its references followed from each of them
    if (!this.#queued.has(node)) {
      this.#queued.add(node);
      document ??= this.#documentOf(node);
      this.#documents.set(node, document);
      this.#resource(node, document);
      this.#queue.push(node);
    }
    return node.location;
  }

  /**
   * The URI of the resource a location is in. A location is its resource's
   * URI, which is absolute and normalized, and a fragment.
   *
   * @type (location: string) => string
   */
  #absoluteIri(location) {
    const position = location.indexOf("#");
    return position === -1 ? location : location.slice(0, position);
  }

  /**
   * Lower a schema, if what it needs has been retrieved. What it's missing
   * is in `#needs`.
   *
   * @type (node: JsonSchemaNode) => void
   */
  #lowerSchema(node) {
    this.#current = this.#documents.get(node);
    const handle = node.location;
    if (node.jsonType !== "boolean" && node.jsonType !== "object") {
      throw Error(`No schema found at '${relativeFileUrl(handle)}'`);
    }

    const resource = this.#absoluteIri(handle);
    const { dialectUri } = /** @type ObjectSchemaNode */ (node);
    const dialect = node.jsonType === "object" ? this.#dialects.get(dialectUri) : undefined;
    if (node.jsonType === "object" && dialect === undefined) {
      this.#need({ kind: "dialect", uri: dialectUri });
    }
    if (this.#needs.size > 0) {
      return;
    } else if (node.jsonType === "boolean") {
      this.#schemas[handle] = node.value;
      return;
    }

    const { jsonSchema } = this.#session;
    const lowered = lowerKeywords((uri) => jsonSchema.getKeyword(uri), /** @type ObjectSchemaNode */ (node), /** @type Dialect */ (dialect), this.#inputs, false);
    if (this.#needs.size > 0) {
      return;
    }

    // The same schema in another document lowers to the same thing
    if (handle in this.#schemas) {
      return;
    }

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
  }
}

/** @type (need: Need) => string */
const needKey = (need) => need.kind === "target" ? `${need.document} ${need.uri}` : `${need.kind} ${need.uri}`;

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
 * @type (node: JsonSchemaNode, shape: Shape, inputs: Inputs) => LowerInput
 */
const parse = (node, shape, inputs) => {
  if (shape === "schema") {
    if (node.type !== "json-schema" && node.type !== "reference") {
      throw new Misfit();
    }
    return { op: "apply", schema: inputs.schema(node) };
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
      items.push(parse(itemNode, shape.array, inputs));
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
      pairs.push([nameNode.value, parse(valueNode, shape.map, inputs)]);
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
