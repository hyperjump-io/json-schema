import { pointerGet } from "@hyperjump/browser/json";
import { toAbsoluteIri } from "@hyperjump/uri";
import { lowerKeywords } from "../kernel/lower.js";
import { provenance, sourcesWithoutEffect } from "./provenance.js";
import { visitSchemas } from "./utilities.js";

/**
 * @import { Dialect } from "../dialect.d.ts"
 * @import { Reference } from "../keyword.d.ts"
 * @import { Handle } from "../kernel/kernel.d.ts"
 * @import { Inputs, ObjectSchemaNode } from "../kernel/lower.js"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import * as API from "./lower.d.ts"
 */

/**
 * Each document's lowered schemas, by session, because sessions can build
 * different dialects for the same URI. They're lowered once, so rules share
 * them.
 *
 * @type WeakMap<JsonSchemaSession, WeakMap<JsonSchemaDocumentNode, Promise<API.LintSchemas>>>
 */
const cache = new WeakMap();

/** @type API.lowerForLint */
export const lowerForLint = (session, tree) => {
  let bySession = cache.get(session);
  if (bySession === undefined) {
    bySession = new WeakMap();
    cache.set(session, bySession);
  }

  let schemas = bySession.get(tree);
  if (schemas === undefined) {
    schemas = lowerDocument(session, tree);
    bySession.set(tree, schemas);
  }

  return schemas;
};

/** @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<API.LintSchemas> */
const lowerDocument = async (session, tree) => {
  /** @type Inputs */
  const inputs = {
    // A subschema is `apply` of its location, and a schema that's a
    // reference, of the URI it resolves to
    schema: async (node) => node.type === "reference" ? node.href : node.location,

    // The dynamic anchors are known for a resource in the document
    reference: async (node) => {
      const uri = /** @type {{ href: string }} */ (node).href;
      const resource = tree.embedded[toAbsoluteIri(uri)];

      /** @type Reference["dynamicAnchors"] */
      let dynamicAnchors;
      if (resource !== undefined) {
        dynamicAnchors = {};
        const root = /** @type JsonSchemaNode */ (resource.children[0]);
        for (const name in resource.dynamicAnchors) {
          /** @type Handle */
          const handle = /** @type JsonSchemaNode */ (pointerGet(resource.dynamicAnchors[name], root)).location;
          dynamicAnchors[name] = handle;
        }
      }

      return { uri, schema: { op: "apply", schema: uri }, handle: uri, dynamicAnchors };
    }
  };

  /** @type ObjectSchemaNode[] */
  const schemaNodes = [];
  visitSchemas(tree, (schemaNode) => {
    if (schemaNode.type === "json-schema" && schemaNode.jsonType === "object") {
      schemaNodes.push(/** @type ObjectSchemaNode */ (schemaNode));
    }
  });

  /** @type Map<string, Promise<Dialect | undefined>> */
  const dialects = new Map();

  /** @type API.LintSchemas */
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
      const lowered = (await lowerKeywords(session.jsonSchema, schemaNode, resolved, inputs, true))
        .map((keyword) => /** @type API.LoweredKeyword */ ({
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
