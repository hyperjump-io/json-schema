import { pointerAppend } from "@hyperjump/json-pointer";
import { encodeIriFragment } from "@hyperjump/uri";
import { iriProblem, resolveId, toId } from "../identifiers.js";
import { resolveSchemaAt } from "../schema/resolve.js";
import { getDialect } from "../session.js";
import { openApi30DialectUri } from "../dialects/openapi-3-0/dialect.js";
import { objectModel30 } from "./object-model-3-0.js";
import { objectModel31 } from "./object-model-3-1.js";
import { objectModel32 } from "./object-model-3-2.js";

/**
 * @import { JsonDocumentNode, JsonErrorNode, JsonNode } from "@hyperjump/browser"
 * @import { NormalizedIri } from "@hyperjump/uri"
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import { SchemaMessage } from "../schema/schema-error.d.ts"
 * @import { Field, ObjectModel } from "./object-model.d.ts"
 * @import * as API from "./resolve.d.ts"
 * @import { OpenApiVersion } from "./resolve.d.ts"
 */

/**
 * @typedef {JsonNode | JsonErrorNode} TreeNode
 *
 * @typedef {{
 *   name: OpenApiVersion;
 *   objectModel: ObjectModel;
 *   dialectUri?: string;
 *   schemaUri: string;
 *   self: boolean;
 *   jsonSchemaDialect: boolean;
 * }} Version
 */

/**
 * Each version's Objects, its key in `defaultDialects`, and the schema its
 * documents are validated against (OpenAPI's latest published `schema`,
 * which only checks that a Schema Object is an object or a boolean, since the
 * resolver checks them in their own dialects). 3.0 has a default dialect,
 * which is ours, because OpenAPI publishes none for it. 3.1's and 3.2's are
 * whatever the user configures.
 *
 * @type [RegExp, Version][]
 */
const versions = [
  [/^3\.0\.\d+$/, {
    name: "3.0",
    objectModel: objectModel30,
    dialectUri: openApi30DialectUri,
    schemaUri: "https://spec.openapis.org/oas/3.0/schema/2024-10-18",
    self: false,
    jsonSchemaDialect: false
  }],
  [/^3\.1\.\d+$/, {
    name: "3.1",
    objectModel: objectModel31,
    schemaUri: "https://spec.openapis.org/oas/3.1/schema/2026-11-05",
    self: false,
    jsonSchemaDialect: true
  }],
  [/^3\.2\.\d+$/, {
    name: "3.2",
    objectModel: objectModel32,
    schemaUri: "https://spec.openapis.org/oas/3.2/schema/2026-11-12",
    self: true,
    jsonSchemaDialect: true
  }]
];

/** @type typeof API.assertDefaultDialects */
export const assertDefaultDialects = (defaultDialects) => {
  const names = versions.map(([, version]) => version.name);
  for (const name in defaultDialects) {
    if (!names.includes(/** @type OpenApiVersion */ (name))) {
      // A key written as a number, like `3.0`, is "3"
      throw TypeError(`'${name}' in 'defaultDialects' isn't a version of OpenAPI this reads. Use ${names.map((name) => `"${name}"`).join(", ")}, as strings.`);
    }
  }
};

/** @type typeof API.openApiVersion */
export const openApiVersion = (version) => versions.find(([pattern]) => pattern.test(version)) !== undefined;

/** @type typeof API.openApiSchemaUri */
export const openApiSchemaUri = (version) => versions.find(([pattern]) => pattern.test(version))?.[1].schemaUri;

/** @type typeof API.resolveOpenApi */
export const resolveOpenApi = async (tree, { session, uri, defaultDialects = {} }) => {
  const retrievalUri = toId(uri);
  /** @type SchemaMessage[] */
  const messages = [];
  /** @type (reason: string, node: TreeNode, ruleId: string) => void */
  const message = (reason, node, ruleId) => {
    messages.push({ source: "openapi", ruleId, severity: "error", uri: retrievalUri, place: node.position, message: reason });
  };

  const root = /** @type TreeNode | undefined */ (tree.children[0]);
  const versionNode = root === undefined ? undefined : propertyValue(root, "openapi");
  const versionString = stringOf(versionNode);
  const version = versionString === undefined ? undefined : versions.find(([pattern]) => pattern.test(versionString))?.[1];
  if (root !== undefined && version === undefined) {
    message("'openapi' must be a version of OpenAPI this reads: 3.0.x, 3.1.x, or 3.2.x", versionNode ?? root, "unknown-openapi-version");
  }

  // `$self` is the document's URI, and other URIs in it are resolved against it
  let documentUri = retrievalUri;
  const selfNode = version?.self && root !== undefined ? propertyValue(root, "$self") : undefined;
  const self = stringOf(selfNode);
  if (selfNode !== undefined && self !== undefined) {
    try {
      documentUri = resolveId(self, retrievalUri);
    } catch (error) {
      message(`'$self' isn't a valid URI: ${iriProblem(error)}`, selfNode, "invalid-self");
    }
  }

  let dialectUri = version === undefined ? undefined : defaultDialects[version.name] ?? version.dialectUri;
  const dialectNode = version?.jsonSchemaDialect && root !== undefined ? propertyValue(root, "jsonSchemaDialect") : undefined;
  const jsonSchemaDialect = stringOf(dialectNode);
  if (dialectNode !== undefined && jsonSchemaDialect !== undefined) {
    try {
      dialectUri = resolveId(jsonSchemaDialect, documentUri);
    } catch (error) {
      message(`'jsonSchemaDialect' isn't a valid URI: ${iriProblem(error)}`, dialectNode, "invalid-dialect");
      dialectUri = undefined;
    }
  } else if (version !== undefined && dialectUri === undefined && root !== undefined) {
    message(`OpenAPI ${version.name} has no default dialect. Add 'jsonSchemaDialect', or give 'openApiMediaType' a '${version.name}' in 'defaultDialects'.`, versionNode ?? root, "missing-dialect");
  }

  // The dialect is found once, and a problem with it is reported where it was
  // chosen. Every Schema Object needs it, even one with its own `$schema`,
  // because the dialect is what finds its `$id`.
  if (dialectUri !== undefined && root !== undefined) {
    try {
      await getDialect(session, dialectUri, { referencedFrom: retrievalUri });
    } catch (error) {
      const { message: reason, cause } = /** @type Error */ (error);
      const node = dialectNode ?? versionNode ?? root;
      messages.push({ source: "openapi", ruleId: "unknown-dialect", severity: "error", uri: retrievalUri, place: node.position, message: reason, cause: cause instanceof Error ? cause : undefined });
      dialectUri = undefined;
    }
  }

  /** @type JsonSchemaDocumentNode */
  const document = {
    type: "json-schema-document",
    status: tree.status,
    children: root === undefined ? [] : [/** @type any */ (root)],
    comments: tree.comments,
    uri: documentUri,
    url: new URL(documentUri).href,
    anchors: {},
    dynamicAnchors: {},
    embedded: {}
  };
  document.embedded[documentUri] = document;

  if (root === undefined) {
    return { document, messages };
  }

  /** @type [TreeNode, string][] */
  const schemaObjects = [];
  if (version === undefined || dialectUri === undefined) {
    data(root, documentUri, "");
  } else {
    walk(root, "OpenAPI", "", version.objectModel, documentUri, schemaObjects);
  }

  for (const [node, pointer] of schemaObjects) {
    messages.push(...await resolveSchemaAt(node, { session, document, pointer, dialectUri: /** @type string */ (dialectUri), uri: retrievalUri }));
  }

  return { document, messages };
};

/**
 * Annotate what the object model says a node is: data, except for Schema
 * Objects, which are collected to be resolved as schemas. A Reference Object
 * where another Object would be isn't followed, so it's data.
 *
 * @type (node: TreeNode, field: Field, pointer: string, model: ObjectModel, uri: NormalizedIri, schemaObjects: [TreeNode, string][]) => void
 */
const walk = (node, field, pointer, model, uri, schemaObjects) => {
  if (field === "Schema") {
    schemaObjects.push([node, pointer]);
    return;
  }

  if (isErrorNode(node)) {
    data(node, uri, pointer);
    return;
  }

  if (typeof field === "object") {
    shallowData(node, uri, pointer);
    if ("map" in field && node.jsonType === "object") {
      for (const property of node.children) {
        const [nameNode, valueNode] = property.children;
        walk(valueNode, field.map, pointerAppend(nameNode.value, pointer), model, uri, schemaObjects);
      }
    } else if ("array" in field && node.jsonType === "array") {
      let index = 0;
      for (const itemNode of node.children) {
        walk(itemNode, field.array, pointerAppend(`${index++}`, pointer), model, uri, schemaObjects);
      }
    } else {
      data(node, uri, pointer);
    }
    return;
  }

  const fields = model[field];
  // A Path Item's `$ref` is one of its fields
  const isReference = field !== "PathItem" && node.jsonType === "object" && propertyValue(node, "$ref") !== undefined;
  if (node.jsonType !== "object" || isReference) {
    data(node, uri, pointer);
    return;
  }

  shallowData(node, uri, pointer);
  for (const property of node.children) {
    const [nameNode, valueNode] = property.children;
    const name = nameNode.value;
    const valueField = Object.hasOwn(fields, name) ? fields[name] : (!name.startsWith("x-") && fields["*"]) || undefined;
    if (valueField === undefined) {
      data(valueNode, uri, pointerAppend(name, pointer));
    } else {
      walk(valueNode, valueField, pointerAppend(name, pointer), model, uri, schemaObjects);
    }
  }
};

/** @type (node: TreeNode, uri: NormalizedIri, pointer: string) => void */
const shallowData = (node, uri, pointer) => {
  Object.assign(node, { location: `${uri}#${encodeIriFragment(pointer)}` });
  if (!isErrorNode(node)) {
    Object.assign(node, { type: "json" });
  }
};

/** @type (node: TreeNode, uri: NormalizedIri, pointer: string) => void */
const data = (node, uri, pointer) => {
  shallowData(node, uri, pointer);
  if (isErrorNode(node)) {
    return;
  }

  if (node.jsonType === "array") {
    let index = 0;
    for (const itemNode of node.children) {
      data(itemNode, uri, pointerAppend(`${index++}`, pointer));
    }
  } else if (node.jsonType === "object") {
    for (const property of node.children) {
      const [nameNode, valueNode] = property.children;
      data(valueNode, uri, pointerAppend(nameNode.value, pointer));
    }
  }
};

/** @type (node: TreeNode | undefined) => string | undefined */
const stringOf = (node) => node !== undefined && !isErrorNode(node) && node.jsonType === "string" ? node.value : undefined;

/** @type (node: TreeNode) => node is JsonErrorNode */
const isErrorNode = (node) => node.type === "json-invalid" || node.type === "json-missing";

/** @type (node: TreeNode, name: string) => TreeNode | undefined */
const propertyValue = (node, name) => {
  if (isErrorNode(node) || node.jsonType !== "object") {
    return undefined;
  }
  for (const property of node.children) {
    if (property.children[0].value === name) {
      return property.children[1];
    }
  }
  return undefined;
};
