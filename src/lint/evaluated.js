import { subexpressions } from "../kernel/kernel.js";
import { appliedSchemas } from "./applied.js";

/**
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { LoweredKeyword } from "./lower.d.ts"
 */

/**
 * The properties or items of an instance that are marked as evaluated
 * whenever an expression passes: every one (`all`), or the ones named
 * (`names`), matched (`patterns`), or at an index (`indexes`), and every
 * index `from` on. An `except` selector marks every property if the names
 * and patterns it leaves out are marked too.
 *
 * @typedef {{
 *   all: boolean;
 *   names: Set<string>;
 *   patterns: Set<string>;
 *   excepts: { names: string[]; patterns: string[] }[];
 *   indexes: Set<number>;
 *   from: number;
 * }} Marked
 */

/** @typedef {"properties" | "items"} Children */

/** @type () => Marked */
const nothing = () => ({ all: false, names: new Set(), patterns: new Set(), excepts: [], indexes: new Set(), from: Infinity });

/** @type (marked: Marked, children: Children) => boolean */
const isAll = (marked, children) => {
  if (marked.all) {
    return true;
  } else if (children === "properties") {
    return marked.excepts.some(({ names, patterns }) => names.every((name) => marked.names.has(name))
      && patterns.every((pattern) => marked.patterns.has(pattern)));
  } else {
    if (marked.from === Infinity) {
      return false;
    }
    for (let index = 0; index < marked.from; index++) {
      if (!marked.indexes.has(index)) {
        return false;
      }
    }
    return true;
  }
};

/** @type (a: Marked, b: Marked) => Marked */
const union = (a, b) => ({
  all: a.all || b.all,
  names: new Set([...a.names, ...b.names]),
  patterns: new Set([...a.patterns, ...b.patterns]),
  excepts: [...a.excepts, ...b.excepts],
  indexes: new Set([...a.indexes, ...b.indexes]),
  from: Math.min(a.from, b.from)
});

/** @type (children: Children) => (a: Marked, b: Marked) => Marked */
const intersection = (children) => (a, b) => {
  if (isAll(a, children)) {
    return b;
  } else if (isAll(b, children)) {
    return a;
  }

  return {
    all: false,
    names: new Set([...a.names].filter((value) => b.names.has(value))),
    patterns: new Set([...a.patterns].filter((value) => b.patterns.has(value))),
    excepts: [],
    indexes: new Set([...a.indexes].filter((value) => b.indexes.has(value))),
    from: Math.max(a.from, b.from)
  };
};

/**
 * Which children an expression reads the marks of, with an `unevaluated`
 * selector
 *
 * @type (expression: Expression) => Children[]
 */
export const marksRead = (expression) => {
  switch (expression.op) {
    case "eachProperty":
      return "unevaluated" in expression.select ? ["properties"] : [];
    case "eachItem":
      return "unevaluated" in expression ? ["items"] : [];
    // Subexpressions on children read the children's marks
    case "item":
    case "contains":
    case "property":
    case "eachPropertyName":
    case "itemSequence":
      return [];
    default:
      return [...new Set(subexpressions(expression).flatMap(marksRead))];
  }
};

/**
 * Whether a schema's keywords other than `reader` mark every property or
 * every item whenever they pass, so an `unevaluated*` in it never sees
 * one that isn't marked. It follows the schemas they apply in place. Marks
 * that only some branches of `anyOf`, `oneOf`, or `if` make, and anything
 * an `opaque` operation, a dynamic reference, or a reference that can't be
 * followed applies, aren't counted.
 *
 * @type (document: LintDocument, schemaNode: JsonSchemaNode, reader: LoweredKeyword, children: Children) => boolean
 */
export const marksEvery = (document, schemaNode, reader, children) => {
  const { keywordsOf, find, appliedBy } = appliedSchemas(document);
  const intersect = intersection(children);

  /** @type Set<JsonSchemaNode> */
  const following = new Set();

  /** @type (node: JsonSchemaNode | undefined) => Marked */
  const ofSchema = (node) => {
    if (node === undefined) {
      return nothing();
    } else if (node.type === "reference") {
      return ofSchema(find(node.href));
    }

    const keywords = keywordsOf(node);
    if (keywords === undefined || following.has(node)) {
      return nothing();
    }

    following.add(node);
    let marked = nothing();
    for (const keyword of keywords) {
      if (keyword !== reader) {
        marked = union(marked, ofKeyword(keyword));
      }
    }
    following.delete(node);
    return marked;
  };

  /** @type (keyword: LoweredKeyword) => Marked */
  const ofKeyword = (keyword) => {
    const applied = appliedBy(keyword);

    /** @type (expressions: Expression[], combine: (a: Marked, b: Marked) => Marked) => Marked */
    const combined = (expressions, combine) => {
      if (expressions.length === 0) {
        return nothing();
      }

      let marked = ofExpression(expressions[0]);
      for (const expression of expressions.slice(1)) {
        marked = combine(marked, ofExpression(expression));
      }
      return marked;
    };

    /** @type (expression: Expression) => Marked */
    const ofExpression = (expression) => {
      switch (expression.op) {
        case "all":
          return combined(expression.of, union);
        case "any":
        case "one":
          return combined(expression.of, intersect);
        case "cases": {
          // A condition's marks are kept when its branch applies
          /** @type Marked[] */
          const branches = [];
          for (const [condition, then] of expression.cases) {
            branches.push(union(ofExpression(condition), then === null ? nothing() : ofExpression(then)));
          }
          branches.push(expression.otherwise === null ? nothing() : ofExpression(expression.otherwise));
          return branches.reduce(intersect);
        }
        case "typeSwitch": {
          const type = children === "properties" ? "object" : "array";
          return ofExpression(expression.cases[type] ?? expression.otherwise);
        }
        case "propertySwitch":
        case "keySwitch":
          return combined(subexpressions(expression), intersect);
        case "apply":
          return ofSchema(applied(expression.schema));
        case "property":
          return { ...nothing(), names: new Set([expression.name]) };
        case "eachProperty": {
          const { select } = expression;
          if ("pattern" in select) {
            return { ...nothing(), patterns: new Set([select.pattern]) };
          } else if ("except" in select) {
            return { ...nothing(), excepts: [select.except] };
          } else {
            return { ...nothing(), all: children === "properties" };
          }
        }
        case "item":
          return { ...nothing(), indexes: new Set([expression.index]) };
        case "eachItem":
          return "from" in expression
            ? { ...nothing(), from: expression.from }
            : { ...nothing(), all: children === "items" };
        case "itemSequence":
          return { ...nothing(), all: children === "items" };
        default:
          return nothing();
      }
    };

    return ofExpression(keyword.group.expression);
  };

  return isAll(ofSchema(schemaNode), children);
};
