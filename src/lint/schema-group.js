import { readsMarks, subexpressions } from "../kernel/kernel.js";
import { findSchema } from "./find-schema.js";
import { lowerForLint } from "./lower.js";

/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 * @import * as API from "./schema-group.d.ts"
 */

/** A schema that's a reference, in draft-04 through draft-07 */
const draft07RefUri = "https://json-schema.org/keyword/draft-07/ref";

/**
 * Operations whose subexpressions apply to something in the instance, like
 * a property's value
 */
const childOps = new Set(["item", "eachItem", "contains", "property", "eachProperty", "eachPropertyName", "itemSequence"]);

/**
 * @typedef {{ type: string; children?: TreeNode[] }} TreeNode
 *
 * @typedef {{ negated: boolean; condition: boolean }} Polarity
 *
 * @typedef {{
 *   subschemas: ({ to: JsonSchemaNode; keywordUri: string } & Polarity)[];
 *   children: Set<JsonSchemaNode>;
 *   references: ({ uri: string; keywordUri: string } & Polarity)[];
 *   unknown: boolean;
 * }} Applications
 *
 * @typedef {{
 *   positions: Map<JsonSchemaNode, JsonSchemaNode | undefined>;
 *   referrers: Map<JsonSchemaNode, API.SchemaLink[]>;
 *   applications: (schemaNode: JsonSchemaNode) => Applications;
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
 * What a schema's expressions apply: its subschemas that apply in place,
 * with the keyword each is in and whether it's applied through `not` or as
 * a condition, the subschemas that apply to something in the instance, and
 * the URI each of its static references refers to. `unknown` is true if
 * where something applies can't be told: a `dynamicApply`, or a reference
 * in an `opaque` operation. A subschema an `opaque` operation applies isn't
 * in any of them.
 *
 * @type (schemaNode: JsonSchemaNode, lowered: LoweredKeyword[] | undefined) => Applications
 */
const applicationsOf = (schemaNode, lowered) => {
  /** @type Applications */
  const applications = { subschemas: [], children: new Set(), references: [], unknown: false };

  if (schemaNode.type === "reference") {
    applications.references.push({ uri: schemaNode.href, keywordUri: draft07RefUri, negated: false, condition: false });
    return applications;
  } else if (schemaNode.jsonType !== "object" || lowered === undefined) {
    return applications;
  }

  // A subschema is applied by the handle lint lowers it to: its location, or
  // for a schema that's a reference, the URI it refers to
  /** @type Map<string, { node: JsonSchemaNode; keywordNode: JsonSchemaKeywordNode }[]> */
  const subschemas = new Map();
  for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
    for (const node of schemasIn(/** @type TreeNode */ (keywordNode.children[1]))) {
      const handle = node.type === "reference" ? node.href : node.location;
      subschemas.set(handle, [...subschemas.get(handle) ?? [], { node, keywordNode }]);
    }
  }

  for (const { group, keywordNode, sourceNodes } of lowered) {
    /** @type (expression: Expression, polarity: Polarity, child: boolean, opaque: boolean) => void */
    const visit = (expression, polarity, child, opaque) => {
      if (expression.op === "apply") {
        // A subschema of the keyword or a sibling it reads, or else a
        // reference
        const applied = (subschemas.get(expression.schema) ?? [])
          .filter((subschema) => subschema.keywordNode === keywordNode || sourceNodes.includes(subschema.keywordNode));
        if (applied.length === 0 && opaque) {
          applications.unknown = true;
        } else if (applied.length === 0 && !child) {
          applications.references.push({ uri: expression.schema, keywordUri: group.keywordUri, ...polarity });
        }
        for (const { node, keywordNode: inNode } of opaque ? [] : applied) {
          if (child) {
            applications.children.add(node);
          } else {
            applications.subschemas.push({ to: node, keywordUri: inNode.keywordUri, ...polarity });
          }
        }
      } else if (expression.op === "dynamicApply") {
        applications.unknown = true;
      } else if (expression.op === "not") {
        visit(expression.of, { ...polarity, negated: !polarity.negated }, child, opaque);
      } else if (expression.op === "cases") {
        for (const [condition, then] of expression.cases) {
          visit(condition, { ...polarity, condition: true }, child, opaque);
          if (then !== null) {
            visit(then, polarity, child, opaque);
          }
        }
        if (expression.otherwise !== null) {
          visit(expression.otherwise, polarity, child, opaque);
        }
      } else {
        for (const subexpression of subexpressions(expression)) {
          visit(subexpression, polarity, child || childOps.has(expression.op), opaque || expression.op === "opaque");
        }
      }
    };
    visit(group.expression, { negated: false, condition: false }, false, false);
  }

  return applications;
};

/**
 * Where each schema in a document is, and which schemas in it refer to it.
 * It's found once for each tree, so rules share it.
 *
 * @type WeakMap<JsonSchemaDocumentNode, Promise<Context>>
 */
const contexts = new WeakMap();

/** @type (session: JsonSchemaSession, tree: JsonSchemaDocumentNode) => Promise<Context> */
const buildContext = async (session, tree) => {
  // Each schema's parent schema
  /** @type Map<JsonSchemaNode, JsonSchemaNode | undefined> */
  const positions = new Map();

  /** @type (node: TreeNode, parent: JsonSchemaNode | undefined) => void */
  const walk = (node, parent) => {
    if (node.type === "json-schema" || node.type === "reference") {
      const schemaNode = /** @type JsonSchemaNode */ (node);
      positions.set(schemaNode, parent);
      if (schemaNode.jsonType === "object") {
        for (const property of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
          walk(/** @type TreeNode */ (property.children[1]), schemaNode);
        }
      }
    } else {
      for (const child of node.children ?? []) {
        walk(child, parent);
      }
    }
  };
  for (const child of tree.children) {
    walk(/** @type TreeNode */ (child), undefined);
  }

  // What every schema lowers to, from this document or the one a reference
  // found it in
  /** @type Map<JsonSchemaNode, LoweredKeyword[]> */
  const lowered = new Map(await lowerForLint(session, tree));
  /** @type WeakSet<JsonSchemaDocumentNode> */
  const loweredDocuments = new WeakSet([tree]);

  /** @type Map<string, Promise<JsonSchemaNode | undefined>> */
  const targets = new Map();
  /** @type (uri: string) => Promise<JsonSchemaNode | undefined> */
  const find = (uri) => {
    let target = targets.get(uri);
    if (target === undefined) {
      target = findSchema(session, uri, { document: tree }).then(async (result) => {
        if (result.status !== "found") {
          return undefined;
        } else if (!positions.has(result.node) && !loweredDocuments.has(result.document)) {
          loweredDocuments.add(result.document);
          for (const [schemaNode, keywords] of await lowerForLint(session, result.document)) {
            lowered.set(schemaNode, keywords);
          }
        }
        return result.node;
      });
      targets.set(uri, target);
    }
    return target;
  };

  /** @type Map<JsonSchemaNode, Applications> */
  const cache = new Map();
  /** @type (schemaNode: JsonSchemaNode) => Applications */
  const applications = (schemaNode) => {
    let result = cache.get(schemaNode);
    if (result === undefined) {
      result = applicationsOf(schemaNode, lowered.get(schemaNode));
      cache.set(schemaNode, result);
    }
    return result;
  };

  /** @type Map<JsonSchemaNode, API.SchemaLink[]> */
  const referrers = new Map();
  for (const schemaNode of positions.keys()) {
    for (const { uri, ...link } of applications(schemaNode).references) {
      const target = await find(uri);
      if (target !== undefined && positions.has(target)) {
        referrers.set(target, [...referrers.get(target) ?? [], { from: schemaNode, to: target, ...link, reference: true }]);
      }
    }
  }

  return { positions, referrers, applications, find, groups: new Map() };
};

/** @type (start: JsonSchemaNode, context: Context) => Promise<API.SchemaGroup> */
const buildGroup = async (start, { positions, referrers, applications, find }) => {
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
    if (positions.has(schemaNode)) {
      const parent = positions.get(schemaNode);
      if (parent === undefined) {
        // The document's root is applied to the document
        group.open = true;
        group.applied = true;
      } else {
        const { subschemas, children } = applications(parent);
        const inPlace = subschemas.filter(({ to }) => to === schemaNode);
        for (const link of inPlace) {
          group.links.push({ from: parent, ...link, reference: false });
          add(parent);
        }
        if (children.has(schemaNode)) {
          group.applied = true;
        } else if (inPlace.length === 0) {
          // Not applied by the schema it's in, like a schema in `$defs`
          group.open = true;
        }
      }

      for (const link of referrers.get(schemaNode) ?? []) {
        group.links.push(link);
        add(link.from);
      }
    }

    // Links to schemas this one applies, except ones in this document that
    // are found from the other end
    const { subschemas, references, unknown } = applications(schemaNode);
    group.unknown ||= unknown;
    for (const { to } of subschemas) {
      add(to);
    }
    for (const { uri, ...link } of references) {
      const target = await find(uri);
      if (target === undefined) {
        group.unknown = true;
        continue;
      } else if (!positions.has(target) || !positions.has(schemaNode)) {
        group.links.push({ from: schemaNode, to: target, ...link, reference: true });
      }
      add(target);
    }
    if (!positions.has(schemaNode)) {
      for (const link of subschemas) {
        group.links.push({ from: schemaNode, ...link, reference: false });
      }
    }
  }

  return group;
};

/** @type API.schemaGroup */
export const schemaGroup = async (session, tree, schemaNode) => {
  if (session === undefined) {
    // Without a session, nothing can be lowered, so what the schema applies
    // isn't known
    return { schemas: [schemaNode], links: [], open: true, applied: false, unknown: true };
  }

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
    const link = group.links.find(({ to, reference }) => to === node && !reference);
    if (link === undefined) {
      return negated;
    }
    negated = negated !== link.negated;
    node = link.from;
  }
};

/** @type API.marksAreRead */
export const marksAreRead = async (session, tree, group) => {
  const lowered = await lowerForLint(session, tree);
  return group.unknown || group.schemas.some((node) => {
    const keywords = lowered.get(node);
    return keywords === undefined
      ? node.type === "json-schema" && node.jsonType === "object"
      : keywords.some(({ group }) => readsMarks(group.expression));
  });
};
