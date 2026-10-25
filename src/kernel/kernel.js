/**
 * @import * as API from "./kernel.d.ts"
 */

/** @type API.subexpressions */
export const subexpressions = (expression) => {
  switch (expression.op) {
    case "all":
    case "any":
    case "one":
      return expression.of;
    case "not":
    case "item":
    case "eachItem":
    case "contains":
    case "property":
    case "eachProperty":
    case "eachPropertyName":
      return [expression.of];
    case "cases": {
      /** @type API.Expression[] */
      const expressions = [];
      for (const [condition, then] of expression.cases) {
        expressions.push(condition);
        if (then !== null) {
          expressions.push(then);
        }
      }
      if (expression.otherwise !== null) {
        expressions.push(expression.otherwise);
      }
      return expressions;
    }
    case "itemSequence":
      return patternItems(expression.pattern);
    case "opaque":
      return expression.schemas;
    default:
      return [];
  }
};

/** @type API.patternItems */
export const patternItems = (pattern) => {
  if ("item" in pattern) {
    return [pattern.item];
  } else if ("repeat" in pattern) {
    return patternItems(pattern.repeat);
  }

  return ("sequence" in pattern ? pattern.sequence : pattern.either).flatMap(patternItems);
};

/** @type API.hasOp */
export const hasOp = (expression, op) => {
  return expression.op === op || subexpressions(expression).some((subexpression) => hasOp(subexpression, op));
};

/** @type API.readsMarks */
export const readsMarks = (expression) => {
  switch (expression.op) {
    case "eachProperty":
      return "unevaluated" in expression.select;
    case "eachItem":
      return "unevaluated" in expression;
    // Subexpressions on children read the children's marks
    case "item":
    case "contains":
    case "property":
    case "eachPropertyName":
    case "itemSequence":
      return false;
    case "opaque":
      return expression.reads?.includes("evaluated") ?? false;
    default:
      return subexpressions(expression).some(readsMarks);
  }
};

/** @type API.schemaReads */
export const schemaReads = (schema) => {
  /** @type API.EvaluationState[] */
  const reads = [];
  if (typeof schema !== "boolean") {
    if (schema.keywords.some(({ expression }) => readsMarks(expression))) {
      reads.push("evaluated");
    }
    if (schema.keywords.some(({ expression }) => readsDynamicScope(expression))) {
      reads.push("dynamicScope");
    }
  }
  return reads;
};

/** @type API.readsDynamicScope */
export const readsDynamicScope = (expression) => {
  if (expression.op === "dynamicApply") {
    return true;
  } else if (expression.op === "opaque") {
    return expression.reads?.includes("dynamicScope") ?? false;
  }

  return subexpressions(expression).some(readsDynamicScope);
};

/** @type API.explainsFailure */
export const explainsFailure = (expression) => {
  switch (expression.op) {
    case "pass":
    case "apply":
    case "dynamicApply":
    case "item":
    case "eachItem":
    case "property":
    case "eachProperty":
    case "eachPropertyName":
      return true;
    case "all":
      return expression.of.every(explainsFailure);
    // With one expression, "none passed" is "it failed"
    case "any":
    case "one":
      return expression.of.length === 1 && explainsFailure(expression.of[0]);
    case "cases":
      return expression.cases.every(([, then]) => then === null || explainsFailure(then))
        && (expression.otherwise === null || explainsFailure(expression.otherwise));
    case "opaque":
      return expression.explainsFailure ?? false;
    default:
      return false;
  }
};

/** @type API.conditionsOf */
export const conditionsOf = (expression) => {
  /** @type Set<API.Handle> */
  const handles = new Set();

  /** @type (expression: API.Expression) => void */
  const collect = (expression) => {
    if (expression.op === "all") {
      expression.of.forEach(collect);
    } else if (expression.op === "cases") {
      for (const [condition] of expression.cases) {
        if (condition.op === "apply") {
          handles.add(condition.schema);
        }
      }
    }
  };
  collect(expression);

  return handles;
};
