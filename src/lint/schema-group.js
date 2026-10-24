import { findSchema } from "./find-schema.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import * as API from "./schema-group.d.ts"
 */

const keyword = "https://json-schema.org/keyword";

/** Keywords whose schemas apply to the same instance as the schema they're in */
const inPlaceUris = new Set([
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else", "conditional", "dependentSchemas",
  "propertyDependencies", "draft-07/dependencies", "draft-04/dependencies"
].map((name) => `${keyword}/${name}`));

/**
 * Keywords whose schemas apply to something in the instance, like a
 * property's value. Where such a schema applies is known. A schema anywhere
 * else, like the root or one in `$defs`, can be referenced from another
 * document.
 */
const childUris = new Set([
  "properties", "patternProperties", "additionalProperties", "unevaluatedProperties", "propertyNames",
  "items", "prefixItems", "contains", "unevaluatedItems", "itemPattern", "contentSchema",
  "draft-2019-09/items", "draft-2019-09/additionalItems"
].map((name) => `${keyword}/${name}`));

/** A schema that's a reference, in draft-04 through draft-07 */
const draft07RefUri = `${keyword}/draft-07/ref`;

/** References whose target depends on evaluation */
const dynamicRefUris = new Set([
  "dynamicRef", "draft-2020-12/dynamicRef", "draft-2019-09/recursiveRef"
].map((name) => `${keyword}/${name}`));

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 *
 * @typedef {{ parent?: JsonSchemaNode; keywordUri?: string }} Position
 *
 * @typedef {{
 *   positions: Map<JsonSchemaNode, Position>;
 *   referrers: Map<JsonSchemaNode, API.SchemaLink[]>;
 *   find: (uri: string) => Promise<JsonSchemaNode | undefined>;
 *   groups: Map<JsonSchemaNode, Promise<API.SchemaGroup>>;
 * }} Context
 */

/**
 * The schemas in a keyword's value, not including their subschemas
 *
 * @type (node: TreeNode) => JsonSchemaNode[]
 */
const schemasIn = (node) => {
  if (node.type === "json-schema" || node.type === "reference") {
    const schemaNode = /** @type JsonSchemaNode */ (node);
    return [schemaNode];
  }

  return (node.children ?? []).flatMap(schemasIn);
};

/**
 * The URIs of the references in a keyword's value (the `"reference"`
 * shape), not including their subschemas'
 *
 * @type (node: TreeNode) => string[]
 */
const referencesIn = (node) => {
  if (node.type === "json-schema" || node.type === "reference") {
    return [];
  }

  const { href } = /** @type TreeNode & { href?: string } */ (node);
  return href === undefined ? (node.children ?? []).flatMap(referencesIn) : [href];
};

/**
 * The schemas a schema applies in place, with the keyword each is in, and
 * the URI each of its static references refers to. `dynamic` is true if it
 * has a reference whose target isn't known.
 *
 * @type (schemaNode: JsonSchemaNode) => {
 *   subschemas: [string, JsonSchemaNode][];
 *   references: [string, string][];
 *   dynamic: boolean;
 * }
 */
const inPlace = (schemaNode) => {
  /** @type [string, JsonSchemaNode][] */
  const subschemas = [];
  /** @type [string, string][] */
  const references = [];
  let dynamic = false;

  if (schemaNode.type === "reference") {
    references.push([draft07RefUri, schemaNode.href]);
  } else if (schemaNode.jsonType === "object") {
    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const valueNode = property.children[1];
      if (inPlaceUris.has(property.keywordUri)) {
        for (const subschema of schemasIn(/** @type TreeNode */ (valueNode))) {
          subschemas.push([property.keywordUri, subschema]);
        }
      } else if (dynamicRefUris.has(property.keywordUri)) {
        dynamic = true;
      } else {
        for (const uri of referencesIn(/** @type TreeNode */ (valueNode))) {
          references.push([property.keywordUri, uri]);
        }
      }
    }
  }

  return { subschemas, references, dynamic };
};

/**
 * Where each schema in a document is, and which schemas in it refer to it.
 * It's found once for each tree, so rules share it.
 *
 * @type WeakMap<JsonSchemaDocumentNode, Promise<Context>>
 */
const contexts = new WeakMap();

/** @type (session: JsonSchemaSession | undefined, tree: JsonSchemaDocumentNode) => Promise<Context> */
const buildContext = async (session, tree) => {
  /** @type Map<JsonSchemaNode, Position> */
  const positions = new Map();

  /** @type (node: TreeNode, position: Position) => void */
  const walk = (node, position) => {
    if (node.type === "json-schema" || node.type === "reference") {
      const schemaNode = /** @type JsonSchemaNode */ (node);
      positions.set(schemaNode, position);
      if (schemaNode.jsonType === "object") {
        for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
          walk(/** @type TreeNode */ (property.children[1]), { parent: schemaNode, keywordUri: property.keywordUri });
        }
      }
    } else {
      for (const child of node.children ?? []) {
        walk(child, position);
      }
    }
  };
  for (const child of tree.children) {
    walk(/** @type TreeNode */ (child), {});
  }

  /** @type Map<string, Promise<JsonSchemaNode | undefined>> */
  const targets = new Map();
  /** @type (uri: string) => Promise<JsonSchemaNode | undefined> */
  const find = (uri) => {
    let target = targets.get(uri);
    if (target === undefined) {
      target = session === undefined
        ? Promise.resolve(undefined)
        : findSchema(session, uri, { document: tree }).then((result) => result.status === "found" ? result.node : undefined);
      targets.set(uri, target);
    }
    return target;
  };

  /** @type Map<JsonSchemaNode, API.SchemaLink[]> */
  const referrers = new Map();
  for (const schemaNode of positions.keys()) {
    for (const [keywordUri, uri] of inPlace(schemaNode).references) {
      const target = await find(uri);
      if (target !== undefined && positions.has(target)) {
        referrers.set(target, [...referrers.get(target) ?? [], { from: schemaNode, to: target, keywordUri }]);
      }
    }
  }

  return { positions, referrers, find, groups: new Map() };
};

/** @type (start: JsonSchemaNode, context: Context) => Promise<API.SchemaGroup> */
const buildGroup = async (start, { positions, referrers, find }) => {
  /** @type API.SchemaGroup */
  const group = { schemas: [], links: [], open: false, applied: false, unknown: false };
  const seen = new Set([start]);
  const queue = [start];

  /** @type (schemaNode: JsonSchemaNode) => void */
  const add = (schemaNode) => {
    if (!seen.has(schemaNode)) {
      seen.add(schemaNode);
      queue.push(schemaNode);
    }
  };

  for (let schemaNode = queue.shift(); schemaNode !== undefined; schemaNode = queue.shift()) {
    group.schemas.push(schemaNode);

    // Links to schemas that apply this one. Links from it are added when the
    // other end is visited, so each link is added once.
    const position = positions.get(schemaNode);
    if (position !== undefined) {
      const { parent, keywordUri } = position;
      if (parent !== undefined && inPlaceUris.has(/** @type string */ (keywordUri))) {
        group.links.push({ from: parent, to: schemaNode, keywordUri: /** @type string */ (keywordUri) });
        add(parent);
      } else if (parent === undefined) {
        // The document's root is applied to the document
        group.open = true;
        group.applied = true;
      } else if (childUris.has(/** @type string */ (keywordUri))) {
        group.applied = true;
      } else {
        group.open = true;
      }

      for (const link of referrers.get(schemaNode) ?? []) {
        group.links.push(link);
        add(link.from);
      }
    }

    // Links to schemas this one applies, except ones in this document that
    // are found from the other end
    const { subschemas, references, dynamic } = inPlace(schemaNode);
    group.unknown ||= dynamic;
    for (const [, subschema] of subschemas) {
      add(subschema);
    }
    for (const [keywordUri, uri] of references) {
      const target = await find(uri);
      if (target === undefined) {
        group.unknown = true;
        continue;
      } else if (!positions.has(target) || !positions.has(schemaNode)) {
        group.links.push({ from: schemaNode, to: target, keywordUri });
      }
      add(target);
    }
    if (!positions.has(schemaNode)) {
      for (const [keywordUri, subschema] of subschemas) {
        group.links.push({ from: schemaNode, to: subschema, keywordUri });
      }
    }
  }

  return group;
};

/** @type API.schemaGroup */
export const schemaGroup = async (session, tree, schemaNode) => {
  let context = contexts.get(tree);
  if (context === undefined) {
    context = buildContext(session, tree);
    contexts.set(tree, context);
  }
  const resolved = await context;

  let group = resolved.groups.get(schemaNode);
  if (group === undefined) {
    group = buildGroup(schemaNode, resolved);
    resolved.groups.set(schemaNode, group);
    for (const member of (await group).schemas) {
      resolved.groups.set(member, group);
    }
  }

  return group;
};

/** @type API.isNegated */
export const isNegated = (group, schemaNode) => {
  let negated = false;
  for (let node = schemaNode; ;) {
    const link = group.links.find(({ to, keywordUri }) => to === node && inPlaceUris.has(keywordUri));
    if (link === undefined) {
      return negated;
    } else if (link.keywordUri === `${keyword}/not`) {
      negated = !negated;
    }
    node = link.from;
  }
};
