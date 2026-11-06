import { jsonPointerGet } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { availableDefinitions } from "../kernel/definitions.js";
import { lowerKeywords } from "../kernel/lower.js";
import { keywordDefinitionUri } from "../keywords/unknown.js";
import { findSchema } from "./find-schema.js";
import { provenance, sourcesWithoutEffect } from "./provenance.js";
import { visitReferences, visitSchemas } from "./utilities.js";

/**
 * @import { VFile } from "vfile"
 * @import { Dialect } from "../dialect.d.ts"
 * @import { Format } from "../format.d.ts"
 * @import { Keyword, Reference } from "../keyword.d.ts"
 * @import { Handle } from "../kernel/kernel.d.ts"
 * @import { Inputs, ObjectSchemaNode } from "../kernel/lower.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { FindSchemaResult } from "./find-schema.d.ts"
 * @import { LintSchemas, LoweredKeyword } from "./lower.d.ts"
 * @import * as API from "./document.d.ts"
 */

/**
 * Each tree's document, by session, because sessions can build different
 * dialects for the same URI
 *
 * @type WeakMap<JsonSchemaSession, WeakMap<JsonSchemaDocumentNode, Promise<API.LintDocument>>>
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
 * @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<API.LintDocument>
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
  /** @type string[] */
  const pending = [];

  /** @type (document: JsonSchemaDocumentNode) => Promise<LintSchemas> */
  const addDocument = async (document) => {
    documents.add(document);
    visitSchemas(document, (schemaNode) => {
      schemaNodes.set(schemaNode.location, schemaNode);
      if (schemaNode.type !== "json-schema") {
        return;
      }
      if (!dialects.has(schemaNode.dialectUri)) {
        // A dialect that can't be found was reported when the schema was
        // resolved
        dialects.set(schemaNode.dialectUri, undefined);
      }
      if (schemaNode.jsonType === "object") {
        for (const { keywordUri } of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
          const uri = keywordDefinitionUri(keywordUri);
          if (!(uri in keywords) && session.jsonSchema.hasKeyword(uri)) {
            keywords[uri] = session.jsonSchema.getKeyword(uri);
          }
        }
      }
    });
    visitReferences(document, (uri) => {
      pending.push(uri);
    });

    const lowered = await lowerDocument(session, document);
    for (const [schemaNode, loweredKeywords] of lowered) {
      reached.set(schemaNode, loweredKeywords);
    }
    return lowered;
  };

  const schemas = await addDocument(tree);

  // The identifier of what a reference in the tree finds, which says
  // whether the reference could use it
  /** @type Set<string> */
  const fromTree = new Set(pending);

  for (let uri = pending.shift(); uri !== undefined; uri = pending.shift()) {
    if (found.has(uri)) {
      continue;
    }

    const result = await findSchema(session, uri, { document: tree });
    found.set(uri, result);
    if (result.status !== "found") {
      continue;
    }

    if (!documents.has(result.document)) {
      await addDocument(result.document);
    }
    if (fromTree.has(uri)) {
      const identifier = result.node.location.replace(/#$/, "");
      if (toAbsoluteIri(identifier) !== toAbsoluteIri(uri)) {
        pending.push(identifier);
      }
    }
  }

  for (const uri of dialects.keys()) {
    dialects.set(uri, await session.getDialect(uri).catch(() => undefined));
  }

  /** @type Record<string, Format> */
  const formats = {};
  for (const dialect of dialects.values()) {
    for (const uri of Object.values(dialect?.formats ?? {})) {
      if (!(uri in formats) && session.jsonSchema.hasFormat(uri)) {
        formats[uri] = session.jsonSchema.getFormat(uri);
      }
    }
  }

  // The keywords of escape hatches, which can be other than the keywords
  // that lowered to them
  const expressions = [...reached.values()].flatMap((loweredKeywords) => loweredKeywords.map(({ group }) => group.expression));
  const escapeHatches = availableDefinitions(session.jsonSchema, expressions);

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
 * @type WeakMap<JsonSchemaSession, WeakMap<JsonSchemaDocumentNode, Promise<LintSchemas>>>
 */
const cache = new WeakMap();

/**
 * What every object schema in a document lowers to (see
 * `LintDocument.schemas`)
 *
 * @type (session: JsonSchemaSession, document: JsonSchemaDocumentNode) => Promise<LintSchemas>
 */
const lowerDocument = (session, document) => {
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
export const lowerSchemaForLint = (document, schemaNode) => {
  if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
    return;
  }

  const dialect = document.dialects.get(schemaNode.dialectUri);
  if (dialect === undefined) {
    return;
  }

  const { keywords } = document.definitions;
  const lowered = lowerKeywords((uri) => keywords[uri], /** @type ObjectSchemaNode */ (schemaNode), dialect, inputsFor(document.tree), true);
  return lowered.map(({ group }) => group);
};

/** @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<LintSchemas> */
const lower = async (session, tree) => {
  const inputs = inputsFor(tree);

  /** @type ObjectSchemaNode[] */
  const schemaNodes = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type === "json-schema" && schemaNode.jsonType === "object") {
      schemaNodes.push(/** @type ObjectSchemaNode */ (schemaNode));
    }
  });

  /** @type Map<string, Promise<Dialect | undefined>> */
  const dialects = new Map();

  /** @type LintSchemas */
  const schemas = new Map();
  for (const schemaNode of schemaNodes) {
    let dialect = dialects.get(schemaNode.dialectUri);
    if (dialect === undefined) {
      // A dialect that can't be found was reported when the schema was
      // resolved
      dialect = session.getDialect(schemaNode.dialectUri).catch(() => undefined);
      dialects.set(schemaNode.dialectUri, dialect);
    }

    const resolved = await dialect;
    if (resolved !== undefined) {
      const lowered = lowerKeywords((uri) => session.jsonSchema.getKeyword(uri), schemaNode, resolved, inputs, true)
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

  return schemas;
};

/**
 * What lowering a schema in a document gets for its subschemas and
 * references
 *
 * @type (tree: JsonSchemaDocumentNode) => Inputs
 */
const inputsFor = (tree) => ({
  // A subschema is `apply` of its location, and a schema that's a
  // reference, of the URI it resolves to
  schema: (node) => node.type === "reference" ? /** @type string */ (node.href) : node.location,

  // The dynamic anchors are known for a resource in the document
  reference: (node) => {
    const uri = /** @type {{ href: string }} */ (node).href;
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
