import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { lintRule } from "../lint-rule.js";
import { findSchema } from "../find-schema.js";
import { findKeyword, propertySchemas, visitSchemas } from "../utilities.js";

/**
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../../schema/schema-ast.d.ts"
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

const refUri = `${keyword}/ref`;

/** References whose target depends on evaluation */
const dynamicRefUris = new Set([
  "dynamicRef", "draft-2020-12/dynamicRef", "draft-2019-09/recursiveRef"
].map((name) => `${keyword}/${name}`));

/** Keywords that define properties. An `unevaluatedProperties` defines every one. */
const definingUris = ["properties", "patternProperties", "additionalProperties", "unevaluatedProperties"]
  .map((name) => `${keyword}/${name}`);

/**
 * @typedef {{
 *   parent?: JsonSchemaNode;
 *   keywordUri?: string;
 * }} Position
 *
 * @typedef {{
 *   schemas: JsonSchemaNode[];
 *   open: boolean;
 *   unknown: boolean;
 * }} Group
 *
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 *
 * @typedef {{ schemaNode: JsonSchemaNode; requiredNode: JsonSchemaKeywordNode }} Required
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
 * The in-place subschemas of a schema, and the URI each of its static
 * references refers to. `dynamic` is true if it has a reference whose target
 * isn't known.
 *
 * @type (schemaNode: JsonSchemaNode) => { subschemas: JsonSchemaNode[]; references: string[]; dynamic: boolean }
 */
const inPlace = (schemaNode) => {
  /** @type JsonSchemaNode[] */
  const subschemas = [];
  /** @type string[] */
  const references = [];
  let dynamic = false;

  if (schemaNode.type === "reference") {
    references.push(schemaNode.href);
  } else if (schemaNode.jsonType === "object") {
    for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const valueNode = property.children[1];
      if (inPlaceUris.has(property.keywordUri)) {
        subschemas.push(...schemasIn(/** @type TreeNode */ (valueNode)));
      } else if (property.keywordUri === refUri && valueNode.jsonType === "string") {
        try {
          references.push(resolveIri(valueNode.value, toAbsoluteIri(schemaNode.location)));
        } catch {
          // Not a valid IRI reference, which is a schema problem
          dynamic = true;
        }
      } else if (dynamicRefUris.has(property.keywordUri)) {
        dynamic = true;
      }
    }
  }

  return { subschemas, references, dynamic };
};

/**
 * Every schema that can apply to the same instance as a schema: the ones it
 * applies in place, the one that applies it in place, and the ones it
 * references or that reference it. A reference into another document is
 * followed, along with what that schema applies in place, but what applies
 * the other document's schema isn't known.
 *
 * `open` is true if the group has a schema that another document could
 * apply, like the root or one in `$defs`. `unknown` is true if it has a
 * reference whose target isn't known.
 *
 * @type (start: JsonSchemaNode, context: {
 *   positions: Map<JsonSchemaNode, Position>;
 *   referrers: Map<JsonSchemaNode, JsonSchemaNode[]>;
 *   find: (uri: string) => Promise<JsonSchemaNode | undefined>;
 * }) => Promise<Group>
 */
const groupOf = async (start, { positions, referrers, find }) => {
  /** @type Group */
  const group = { schemas: [], open: false, unknown: false };
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

    const position = positions.get(schemaNode);
    if (position !== undefined) {
      if (position.parent !== undefined && inPlaceUris.has(/** @type string */ (position.keywordUri))) {
        add(position.parent);
      } else if (position.parent === undefined || !childUris.has(/** @type string */ (position.keywordUri))) {
        group.open = true;
      }

      for (const referrer of referrers.get(schemaNode) ?? []) {
        add(referrer);
      }
    }

    const { subschemas, references, dynamic } = inPlace(schemaNode);
    group.unknown ||= dynamic;
    subschemas.forEach(add);
    for (const uri of references) {
      const target = await find(uri);
      if (target === undefined) {
        group.unknown = true;
      } else {
        add(target);
      }
    }
  }

  return group;
};

/**
 * Whether a schema is in a `not`, through schemas that apply in place
 *
 * @type (schemaNode: JsonSchemaNode, positions: Map<JsonSchemaNode, Position>) => boolean
 */
const insideNot = (schemaNode, positions) => {
  for (let position = positions.get(schemaNode); position?.parent !== undefined; position = positions.get(position.parent)) {
    if (position.keywordUri === `${keyword}/not`) {
      return true;
    } else if (!inPlaceUris.has(/** @type string */ (position.keywordUri))) {
      return false;
    }
  }

  return false;
};

/** @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, void> */
const requiredPropertyNotDefined = lintRule({ origin: "jsonschema-lint:required-property-not-defined" }, async (tree, file) => {
  const session = file.data.jsonSchemaSession;

  // Where each schema in the document is, and which ones refer to it
  /** @type Map<JsonSchemaNode, Position> */
  const positions = new Map();
  /** @type Map<JsonSchemaNode, JsonSchemaNode[]> */
  const referrers = new Map();

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

  /** @type Map<string, JsonSchemaNode | undefined> */
  const targets = new Map();
  /** @type (uri: string) => Promise<JsonSchemaNode | undefined> */
  const find = async (uri) => {
    if (!targets.has(uri)) {
      const result = session ? await findSchema(session, uri, { document: tree }) : undefined;
      targets.set(uri, result?.status === "found" ? result.node : undefined);
    }
    return targets.get(uri);
  };

  for (const schemaNode of positions.keys()) {
    for (const uri of inPlace(schemaNode).references) {
      const target = await find(uri);
      if (target !== undefined && positions.has(target)) {
        referrers.set(target, [...referrers.get(target) ?? [], schemaNode]);
      }
    }
  }

  /** @type Map<JsonSchemaNode, Group> */
  const groups = new Map();

  /** @type Required[] */
  const requireds = [];
  visitSchemas(tree, (schemaNode) => {
    for (const requiredUri of [`${keyword}/required`, `${keyword}/draft-04/required`]) {
      const requiredNode = findKeyword(schemaNode, requiredUri);
      if (requiredNode?.children[1].jsonType === "array") {
        requireds.push({ schemaNode, requiredNode });
      }
    }
  });

  for (const { schemaNode, requiredNode } of requireds) {
    let group = groups.get(schemaNode);
    if (group === undefined) {
      group = await groupOf(schemaNode, { positions, referrers, find });
      for (const member of group.schemas) {
        groups.set(member, group);
      }
    }

    // A schema in `not` requires that a property isn't there
    if (group.unknown || insideNot(schemaNode, positions)) {
      continue;
    }

    // A schema that's a reference (draft-04 through draft-07) ignores what's
    // next to it, so it doesn't define anything
    const defining = group.schemas.filter((member) => member.type === "json-schema");

    // A group that defines no properties, and could be applied from another
    // document, is likely meant to be combined with one that does
    const definesAny = defining.some((member) => definingUris.some((uri) => findKeyword(member, uri) !== undefined));
    if (group.open && !definesAny) {
      continue;
    }

    const requiredValue = /** @type JsonSchemaNode & { jsonType: "array" } */ (requiredNode.children[1]);
    for (const itemNode of requiredValue.children) {
      if (itemNode.jsonType !== "string") {
        continue;
      }

      const name = itemNode.value;
      const defined = defining.some((member) => {
        const schemas = propertySchemas(member, name);
        return schemas === undefined || schemas.length > 0 || findKeyword(member, `${keyword}/unevaluatedProperties`) !== undefined;
      });
      if (!defined) {
        file.message(`'${name}' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed`, { place: itemNode.position });
      }
    }
  }
});

export default requiredPropertyNotDefined;
