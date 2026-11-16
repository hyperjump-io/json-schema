import { jrefVisit, jsonPointerGet } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { availableDefinitions } from "../kernel/definitions.js";
import { lowerKeywords, nodeReader, targetReader } from "../kernel/lower.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { findSchema } from "./find-schema.js";
import { getDialect } from "../session.js";
import { definitionsOf } from "../definition-of.js";
import { provenance, sourcesWithoutEffect } from "./provenance.js";

/**
 * @import { VFile } from "vfile"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { Format } from "../format.d.ts"
 * @import { Keyword, Reference } from "../keyword.d.ts"
 * @import { Handle } from "../kernel/kernel.d.ts"
 * @import { Target } from "@hyperjump/browser"
 * @import { Inputs, ObjectSchemaNode, Reader } from "../kernel/lower.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { FindSchemaResult } from "./find-schema.d.ts"
 * @import { LintSchemas, LoweredKeyword } from "./lower.d.ts"
 * @import * as API from "./document.d.ts"
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/**
 * Each tree's document, by session, because sessions can build different
 * dialects for the same URI
 *
 * @type WeakMap<Hyperjump<JsonSchemaConfig>, WeakMap<JsonSchemaDocumentNode, Promise<API.LintDocument>>>
 */
const lintDocuments = new WeakMap();

/** @type typeof API.documentForLint */
export const documentForLint = (tree, file) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return Promise.resolve(undefined);
  }

  let byTree = lintDocuments.get(session);
  if (byTree === undefined) {
    byTree = new WeakMap();
    lintDocuments.set(session, byTree);
  }

  let document = byTree.get(tree);
  if (document === undefined) {
    document = gather(session, tree);
    byTree.set(tree, document);
  }

  return document;
};

/** @type typeof API.schemaAt */
export const schemaAt = (document, uri) => {
  const result = document.found.get(uri);
  return result?.status === "found" ? result.node : document.schemaNodes.get(uri);
};

/**
 * Retrieve and lower every document the tree's references reach. A
 * reference is found from the tree, so a resource embedded in it is found
 * there.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, tree: JsonSchemaDocumentNode) => Promise<API.LintDocument>
 */
const gather = async (session, tree) => {
  /** @type LintSchemas */
  const reached = new Map();
  /** @type Map<string, FindSchemaResult> */
  const found = new Map();
  /** @type Map<string, JsonSchemaNode> */
  const schemaNodes = new Map();
  /** @type Map<string, Dialect | undefined> */
  const dialects = new Map();
  /** @type Record<string, Keyword> */
  const keywords = {};
  /** @type Set<JsonSchemaDocumentNode> */
  const documents = new Set();
  /**
   * References to find, each by the URI it refers to, with the document
   * it's in, or a target in it, which it's followed from
   *
   * @type [uri: NormalizedIri, from: Target | JsonSchemaDocumentNode][]
   */
  const pending = [];

  /** @type (document: JsonSchemaDocumentNode) => Promise<Read> */
  const addDocument = async (document) => {
    documents.add(document);
    const read = await readDocument(session, document);
    for (const schemaNode of read.schemaNodes) {
      schemaNodes.set(schemaNode.location, schemaNode);
      if (!dialects.has(schemaNode.dialectUri)) {
        // A dialect that can't be found was reported when the schema was
        // resolved
        dialects.set(schemaNode.dialectUri, undefined);
      }
      if (schemaNode.jsonType === "object") {
        for (const { keywordUri } of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
          const uri = keywordDefinitionUri(keywordUri);
          if (!(uri in keywords) && uri in definitionsOf(session.config).keywords) {
            keywords[uri] = definitionsOf(session.config).keywords[uri];
          }
        }
      }
    }
    for (const reference of read.references) {
      const { href } = /** @type {{ href: NormalizedIri }} */ (reference.node);
      pending.push([href, reference]);
    }

    for (const [schemaNode, loweredKeywords] of read.schemas) {
      reached.set(schemaNode, loweredKeywords);
    }
    return read;
  };

  const { schemas } = await addDocument(tree);

  // The identifier of what a reference in the tree finds, which says
  // whether the reference could use it
  /** @type Set<string> */
  const fromTree = new Set(pending.map(([uri]) => uri));

  // What a URI finds is kept once. The tree's references are found first,
  // so it's what a reference in the tree finds.
  for (let next = pending.shift(); next !== undefined; next = pending.shift()) {
    const [uri, from] = next;
    if (found.has(uri)) {
      continue;
    }

    const result = await findSchema(session, uri, { from });
    found.set(uri, result);
    if (result.status !== "found") {
      continue;
    }

    if (!documents.has(result.document)) {
      await addDocument(result.document);
    }
    if (fromTree.has(uri)) {
      // A location ends with `#` at a resource's root, which is the same
      // resource without it
      const { location } = result.node;
      const identifier = location.endsWith("#") ? toAbsoluteIri(location) : location;
      if (toAbsoluteIri(identifier) !== toAbsoluteIri(uri) && tree.children[0] !== undefined) {
        pending.push([identifier, tree]);
      }
    }
  }

  for (const uri of dialects.keys()) {
    dialects.set(uri, await getDialect(session, uri).catch(() => undefined));
  }

  /** @type Record<string, Format> */
  const formats = {};
  for (const dialect of dialects.values()) {
    for (const uri of Object.values(dialect?.formats ?? {})) {
      if (!(uri in formats) && uri in definitionsOf(session.config).formats) {
        formats[uri] = definitionsOf(session.config).formats[uri];
      }
    }
  }

  // The keywords of escape hatches, which can be other than the keywords
  // that lowered to them
  const expressions = [...reached.values()].flatMap((loweredKeywords) => loweredKeywords.map(({ group }) => group.expression));
  const escapeHatches = availableDefinitions(definitionsOf(session.config), expressions);

  return {
    tree,
    schemas,
    reached,
    found,
    schemaNodes,
    dialects,
    definitions: { keywords: { ...escapeHatches.keywords, ...keywords }, formats: { ...escapeHatches.formats, ...formats } }
  };
};

/**
 * Each document's lowered schemas, by session, because sessions can build
 * different dialects for the same URI. They're lowered once, so rules share
 * them.
 *
 * @type WeakMap<Hyperjump<JsonSchemaConfig>, WeakMap<JsonSchemaDocumentNode, Promise<Read>>>
 */
const cache = new WeakMap();

/**
 * What's read from a document: its schemas, its references as targets,
 * which they're followed from, and what every object schema in it lowers
 * to (see `LintDocument.schemas`)
 *
 * @typedef {{
 *   schemaNodes: (JsonSchemaNode & { type: "json-schema" })[];
 *   references: Target[];
 *   schemas: LintSchemas;
 * }} Read
 */

/** @type (session: Hyperjump<JsonSchemaConfig>, document: JsonSchemaDocumentNode) => Promise<Read> */
const readDocument = (session, document) => {
  let bySession = cache.get(session);
  if (bySession === undefined) {
    bySession = new WeakMap();
    cache.set(session, bySession);
  }

  let schemas = bySession.get(document);
  if (schemas === undefined) {
    schemas = lower(session, document);
    bySession.set(document, schemas);
  }

  return schemas;
};

/** @type typeof API.lowerSchemaForLint */
export const lowerSchemaForLint = async (document, schemaNode) => {
  if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
    return;
  }

  const dialect = document.dialects.get(schemaNode.dialectUri);
  if (dialect === undefined) {
    return;
  }

  // It can be a schema that isn't in the document, made from other
  // schemas' keywords, so it's read as nodes
  const lowered = await lowerKeywords(document.definitions.keywords, schemaNode, dialect, inputsFor(document.tree, nodeReader), true);
  return lowered.map(({ group }) => group);
};

/** @type (session: Hyperjump<JsonSchemaConfig>, tree: JsonSchemaDocumentNode) => Promise<Read> */
const lower = async (session, tree) => {
  const inputs = inputsFor(tree, targetReader(session));

  /** @type LintSchemas */
  const schemas = new Map();
  /** @type Read */
  const read = { schemaNodes: [], references: [], schemas };
  if (tree.children[0] === undefined) {
    return read;
  }

  // The document is browsed as it's written, from the tree, so every
  // schema and reference in it is a target. A document that's linted might
  // not be one the session retrieved.

  /** @type Target<JsonSchemaDocumentNode, ObjectSchemaNode>[] */
  const schemaTargets = [];
  await jrefVisit(session, /** @type any */ (tree), (/** @type Target */ target) => {
    const node = /** @type JsonSchemaNode */ (target.node);
    if (node.type === "json-schema") {
      read.schemaNodes.push(node);
      if (node.jsonType === "object") {
        schemaTargets.push(/** @type Target<JsonSchemaDocumentNode, ObjectSchemaNode> */ (target));
      }
    } else if (node.type === "reference") {
      read.references.push(target);
    }
  }, { reference: "manual", maxDepth: Infinity });

  /** @type Map<string, Promise<Dialect | undefined>> */
  const dialects = new Map();

  for (const target of schemaTargets) {
    const schemaNode = target.node;
    let dialect = dialects.get(schemaNode.dialectUri);
    if (dialect === undefined) {
      // A dialect that can't be found was reported when the schema was
      // resolved
      dialect = getDialect(session, schemaNode.dialectUri).catch(() => undefined);
      dialects.set(schemaNode.dialectUri, dialect);
    }

    const resolved = await dialect;
    if (resolved !== undefined) {
      const lowered = (await lowerKeywords(definitionsOf(session.config).keywords, /** @type Target */ (target), resolved, inputs, true))
        .map((keyword) => /** @type LoweredKeyword */ ({
          group: keyword.group,
          keywordNode: keyword.keywordNode,
          sourceNodes: keyword.sourceNodes,
          sourcesWithoutEffect: sourcesWithoutEffect(keyword),
          cameFrom: provenance(keyword)
        }));
      const order = new Map(schemaNode.children.map((keywordNode, index) => [keywordNode, index]));
      lowered.sort((a, b) => /** @type number */ (order.get(a.keywordNode)) - /** @type number */ (order.get(b.keywordNode)));
      schemas.set(schemaNode, lowered);
    }
  }

  return read;
};

/**
 * What lowering a schema in a document gets for its subschemas and
 * references
 *
 * `reader` is how the schema is read, as targets or as nodes.
 *
 * @type <V>(tree: JsonSchemaDocumentNode, reader: Reader<V>) => Inputs<V>
 */
const inputsFor = (tree, reader) => ({
  ...reader,

  // A subschema is `apply` of its location, and a schema that's a
  // reference, of the URI it resolves to
  schema: (value) => {
    const node = reader.node(value);
    return node.type === "reference" ? /** @type NormalizedIri */ (node.href) : node.location;
  },

  // The dynamic anchors are known for a resource in the document
  reference: (value) => {
    const uri = /** @type {{ href: NormalizedIri }} */ (reader.node(value)).href;
    const resource = tree.embedded[toAbsoluteIri(uri)];

    /** @type Reference["dynamicAnchors"] */
    let dynamicAnchors;
    if (resource !== undefined) {
      dynamicAnchors = {};
      const root = /** @type JsonSchemaNode */ (resource.children[0]);
      for (const name in resource.dynamicAnchors) {
        /** @type Handle */
        const handle = /** @type JsonSchemaNode */ (jsonPointerGet(resource.dynamicAnchors[name], root)).location;
        dynamicAnchors[name] = handle;
      }
    }

    return { uri, schema: { op: "apply", schema: uri }, handle: uri, dynamicAnchors };
  }
});
