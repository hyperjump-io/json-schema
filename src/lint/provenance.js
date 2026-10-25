/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { LoweredKeyword } from "../kernel/lower.js"
 * @import { JsonSchemaKeywordNode } from "../schema/schema-ast.d.ts"
 * @import { CameFrom } from "./lower.d.ts"
 */

/** The fields of an operation that hold expressions, or patterns of them */
const structural = new Set(["of", "cases", "otherwise", "pattern", "schemas"]);

/** The fields of an item pattern that hold expressions or patterns */
const patternFields = ["item", "repeat", "sequence", "either"];

/**
 * Where each operation of a keyword's group, and each of its fields, came
 * from (KERNEL.md, "Lowering for lint"). The keyword was lowered again
 * without each sibling it read. A field that's different without a sibling
 * came from the sibling, and an operation that isn't there without it came
 * from both. The rest came from the keyword.
 *
 * @type (lowered: LoweredKeyword) => CameFrom
 */
export const provenance = ({ group, keywordNode, sourceNodes, withoutSiblings = [] }) => {
  /** @type Map<object, Set<JsonSchemaKeywordNode>> */
  const operations = new Map();
  /** @type Map<object, Map<string, Set<JsonSchemaKeywordNode>>> */
  const fields = new Map();

  /** @type (map: Map<any, Set<JsonSchemaKeywordNode>>, key: any, nodes: JsonSchemaKeywordNode[]) => void */
  const add = (map, key, nodes) => {
    let set = map.get(key);
    if (set === undefined) {
      set = new Set();
      map.set(key, set);
    }
    for (const node of nodes) {
      set.add(node);
    }
  };

  /**
   * Every operation in a value that's only there with the sibling
   *
   * @type (value: unknown, nodes: JsonSchemaKeywordNode[]) => void
   */
  const added = (value, nodes) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        added(item, nodes);
      }
    } else if (isOperation(value)) {
      add(operations, value, nodes);
      for (const field in value) {
        if (structural.has(field)) {
          added(/** @type Record<string, unknown> */ (value)[field], nodes);
        }
      }
    } else if (value !== null && typeof value === "object") {
      for (const field of patternFields) {
        added(/** @type Record<string, unknown> */ (value)[field], nodes);
      }
    }
  };

  /**
   * What's different in `a` from `b`, which is what lowering gives without
   * the sibling
   *
   * @type (a: unknown, b: unknown, sourceNode: JsonSchemaKeywordNode) => void
   */
  const compare = (a, b, sourceNode) => {
    if (equal(a, b)) {
      return;
    } else if (Array.isArray(a)) {
      compareArrays(a, Array.isArray(b) ? b : [], sourceNode);
    } else if (isOperation(a)) {
      const other = asOperation(a, b);
      if (other === undefined) {
        added(a, [keywordNode, sourceNode]);
        return;
      }

      const aFields = /** @type Record<string, unknown> */ (a);
      const bFields = /** @type Record<string, unknown> */ (other);
      for (const field of new Set([...Object.keys(aFields), ...Object.keys(bFields)])) {
        if (!equal(aFields[field], bFields[field])) {
          let byField = fields.get(a);
          if (byField === undefined) {
            byField = new Map();
            fields.set(a, byField);
          }
          add(byField, field, [sourceNode]);
          if (structural.has(field)) {
            compare(aFields[field], bFields[field], sourceNode);
          }
        }
      }
    } else if (a !== null && typeof a === "object") {
      const bFields = b !== null && typeof b === "object" ? /** @type Record<string, unknown> */ (b) : {};
      for (const field of patternFields) {
        compare(/** @type Record<string, unknown> */ (a)[field], bFields[field], sourceNode);
      }
    }
  };

  /**
   * The items that are the same in both, in order, are matched, and the
   * ones between them are compared in order
   *
   * @type (a: unknown[], b: unknown[], sourceNode: JsonSchemaKeywordNode) => void
   */
  const compareArrays = (a, b, sourceNode) => {
    let aStart = 0;
    let bStart = 0;
    for (const [aEnd, bEnd] of [...commonItems(a, b), [a.length, b.length]]) {
      for (let offset = 0; aStart + offset < aEnd; offset++) {
        const bIndex = bStart + offset;
        compare(a[aStart + offset], bIndex < bEnd ? b[bIndex] : undefined, sourceNode);
      }
      aStart = aEnd + 1;
      bStart = bEnd + 1;
    }
  };

  sourceNodes.forEach((sourceNode, index) => {
    const without = withoutSiblings[index];
    if (without === undefined) {
      added(group.expression, [keywordNode, sourceNode]);
    } else {
      compare(group.expression, without, sourceNode);
    }
  });

  /** @type (nodes: Iterable<JsonSchemaKeywordNode>) => JsonSchemaKeywordNode[] */
  const inDocumentOrder = (nodes) => [...nodes].sort((a, b) => /** @type number */ (a.position?.start.offset) - /** @type number */ (b.position?.start.offset));

  return (operation, field) => {
    const nodes = (field === undefined ? undefined : fields.get(operation)?.get(field)) ?? operations.get(operation);
    return nodes === undefined ? [keywordNode] : inDocumentOrder(nodes);
  };
};

/**
 * The siblings a keyword read that it lowers the same without, like
 * `minContains: 1`
 *
 * @type (lowered: LoweredKeyword) => JsonSchemaKeywordNode[]
 */
export const sourcesWithoutEffect = ({ group, sourceNodes, withoutSiblings = [] }) => sourceNodes
  .filter((_sourceNode, index) => withoutSiblings[index] !== undefined && equal(group.expression, withoutSiblings[index]));

/** @type (value: unknown) => value is Expression */
const isOperation = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && typeof (/** @type Record<string, unknown> */ (value)).op === "string";

/**
 * `b` as the same operation as `a`, if it is. The normal form makes `all`
 * of one the one, and `all` of none `pass`, so those are `all` here, and
 * likewise `any`.
 *
 * @type (a: Expression, b: unknown) => Expression | undefined
 */
const asOperation = (a, b) => {
  if (!isOperation(b)) {
    return undefined;
  } else if (a.op === b.op) {
    return b;
  } else if (a.op === "all" || a.op === "any") {
    return { op: a.op, of: b.op === (a.op === "all" ? "pass" : "fail") ? [] : [b] };
  }

  return undefined;
};

/**
 * The indexes of the longest list of items that are in both, in order
 *
 * @type (a: unknown[], b: unknown[]) => [number, number][]
 */
const commonItems = (a, b) => {
  /** @type number[][] */
  const lengths = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i][j] = equal(a[i], b[j]) ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  /** @type [number, number][] */
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (equal(a[i], b[j])) {
      pairs.push([i++, j++]);
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
};

/**
 * Whether two JSON values are the same, without regard to property order
 *
 * @type (a: unknown, b: unknown) => boolean
 */
const equal = (a, b) => {
  if (a === b) {
    return true;
  } else if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, index) => equal(item, b[index]));
  } else if (a !== null && b !== null && typeof a === "object" && typeof b === "object" && !Array.isArray(b)) {
    const aFields = /** @type Record<string, unknown> */ (a);
    const bFields = /** @type Record<string, unknown> */ (b);
    const keys = Object.keys(aFields).filter((key) => aFields[key] !== undefined);
    return keys.length === Object.keys(bFields).filter((key) => bFields[key] !== undefined).length
      && keys.every((key) => equal(aFields[key], bFields[key]));
  }

  return false;
};
