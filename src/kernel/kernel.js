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
    case "typeSwitch":
      return [...Object.values(expression.cases), expression.otherwise];
    case "propertySwitch":
      return [...expression.cases.map(([, then]) => then), expression.other, expression.absent, expression.unparsed];
    case "keySwitch":
      return [...expression.cases.map(([, then]) => then), expression.none, expression.unparsed];
    case "itemSequence":
      return patternItems(expression.pattern);
    case "opaque":
      return expression.schemas;
    case "inline":
      return expression.keywords.map((group) => group.expression);
    default:
      return [];
  }
};

/** @type API.mapSubexpressions */
export const mapSubexpressions = (expression, map) => {
  /** @type (subexpression: API.Expression | null) => API.Expression | null */
  const mapNullable = (subexpression) => subexpression && map(subexpression);

  switch (expression.op) {
    case "all":
    case "any":
    case "one": {
      const of = mapEach(expression.of, map);
      return of === expression.of ? expression : { ...expression, of };
    }
    case "not":
    case "item":
    case "eachItem":
    case "contains":
    case "property":
    case "eachProperty":
    case "eachPropertyName": {
      const of = map(expression.of);
      return of === expression.of ? expression : { ...expression, of };
    }
    case "cases": {
      /** @type (entry: [API.Expression, API.Expression | null]) => [API.Expression, API.Expression | null] */
      const mapEntry = (entry) => {
        const [condition, then] = entry;
        const mappedCondition = map(condition);
        const mappedThen = mapNullable(then);
        return mappedCondition === condition && mappedThen === then ? entry : [mappedCondition, mappedThen];
      };
      const cases = mapEach(expression.cases, mapEntry);
      const otherwise = mapNullable(expression.otherwise);
      return cases === expression.cases && otherwise === expression.otherwise ? expression : { ...expression, cases, otherwise };
    }
    case "typeSwitch": {
      /** @type Partial<Record<API.JsonTypeName, API.Expression>> | undefined */
      let cases;
      for (const type of /** @type API.JsonTypeName[] */ (Object.keys(expression.cases))) {
        const then = /** @type API.Expression */ (expression.cases[type]);
        const mapped = map(then);
        if (mapped !== then) {
          cases ??= { ...expression.cases };
          cases[type] = mapped;
        }
      }
      const otherwise = map(expression.otherwise);
      return cases === undefined && otherwise === expression.otherwise
        ? expression
        : { ...expression, cases: cases ?? expression.cases, otherwise };
    }
    case "propertySwitch": {
      const cases = mapEach(expression.cases, mapCase(map));
      const other = map(expression.other);
      const absent = map(expression.absent);
      const unparsed = map(expression.unparsed);
      return cases === expression.cases && other === expression.other && absent === expression.absent && unparsed === expression.unparsed
        ? expression
        : { ...expression, cases, other, absent, unparsed };
    }
    case "keySwitch": {
      const cases = mapEach(expression.cases, mapCase(map));
      const none = map(expression.none);
      const unparsed = map(expression.unparsed);
      return cases === expression.cases && none === expression.none && unparsed === expression.unparsed
        ? expression
        : { ...expression, cases, none, unparsed };
    }
    case "itemSequence": {
      const pattern = mapPattern(expression.pattern, map);
      return pattern === expression.pattern ? expression : { ...expression, pattern };
    }
    case "opaque": {
      const schemas = mapEach(expression.schemas, map);
      return schemas === expression.schemas ? expression : { ...expression, schemas };
    }
    case "inline": {
      /** @type (group: API.KeywordGroup) => API.KeywordGroup */
      const mapGroup = (group) => {
        const mapped = map(group.expression);
        return mapped === group.expression ? group : { ...group, expression: mapped };
      };
      const keywords = mapEach(expression.keywords, mapGroup);
      return keywords === expression.keywords ? expression : { ...expression, keywords };
    }
    default:
      return expression;
  }
};

/**
 * The items mapped, or the same array if none of them changed, which is
 * almost always
 *
 * @type <T>(items: T[], map: (item: T) => T) => T[]
 */
const mapEach = (items, map) => {
  /** @type typeof items | undefined */
  let mapped;
  for (let index = 0; index < items.length; index++) {
    const item = map(items[index]);
    if (item !== items[index]) {
      mapped ??= items.slice();
      mapped[index] = item;
    }
  }
  return mapped ?? items;
};

/** @type <K>(map: (subexpression: API.Expression) => API.Expression) => (entry: [K, API.Expression]) => [K, API.Expression] */
const mapCase = (map) => (entry) => {
  const then = map(entry[1]);
  return then === entry[1] ? entry : [entry[0], then];
};

/** @type (pattern: API.ItemPattern, map: (subexpression: API.Expression) => API.Expression) => API.ItemPattern */
const mapPattern = (pattern, map) => {
  if ("item" in pattern) {
    const item = map(pattern.item);
    return item === pattern.item ? pattern : { item };
  } else if ("repeat" in pattern) {
    const repeat = mapPattern(pattern.repeat, map);
    return repeat === pattern.repeat ? pattern : { ...pattern, repeat };
  } else if ("sequence" in pattern) {
    const sequence = mapEach(pattern.sequence, (each) => mapPattern(each, map));
    return sequence === pattern.sequence ? pattern : { sequence };
  }

  const either = mapEach(pattern.either, (each) => mapPattern(each, map));
  return either === pattern.either ? pattern : { either };
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
    case "inline":
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
    case "typeSwitch":
    case "propertySwitch":
    case "keySwitch":
      return subexpressions(expression).every(explainsFailure);
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
