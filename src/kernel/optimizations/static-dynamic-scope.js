import { addDynamicAnchors } from "../fast.js";
import { subexpressions } from "../kernel.js";

/**
 * @import { CompiledSchema, Expression, Handle, ItemPattern, Kernel } from "../kernel.d.ts"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * Resolve `dynamicApply` without the instance, so the evaluators don't
 * track the dynamic scope. Evaluation always starts from the kernel's
 * entry, so the dynamic scope where a schema is applied only depends on
 * the path to it, and a schema applied with different anchors in scope is
 * copied for each of them, with each `dynamicApply` an `apply` of what the
 * anchor identifies there (Attouche et al., "Validation of Modern JSON
 * Schema: Formalization and Complexity", POPL 2024, section 8).
 *
 * Copies are made from the entry, only for the anchors in scope that a
 * schema can read, so a schema that's always applied with the same ones,
 * like every schema of a meta-schema, isn't copied. In the worst case there
 * are exponentially many copies, so past one for each schema that reads
 * the dynamic scope it gives up, and the evaluators track it as before.
 *
 * A copy's handle isn't a location, so it has the handle of the schema it
 * copies (`copyOf`), which is what plugins see. Evaluation makes the same
 * hook calls, in the same order, as it would tracking the dynamic scope,
 * so it's for every mode.
 *
 * @type Optimization
 */
export default {
  optimize(kernel) {
    /** @type Map<Handle, CompiledSchema | null> */
    const replaced = new Map();
    if (kernel.reads.dynamicScope.length === 0) {
      return replaced;
    }

    // An `opaque` operation looks anchors up when it's evaluated, and
    // applies the schema it finds, not its copy
    for (const handle of kernel.reads.dynamicScope) {
      const schema = /** @type Exclude<CompiledSchema, boolean> */ (kernel.schemas[handle]);
      if (schema.keywords.some(({ expression }) => opaqueReadsDynamicScope(expression))) {
        return replaced;
      }
    }

    const read = anchorsRead(kernel);
    const budget = read.size;
    let copies = 0;

    /** @type Map<Handle, Map<string, Handle>> */
    const copiesOf = new Map();
    /** @type [Handle, Handle, Record<string, Handle>][] */
    const queue = [];

    /**
     * The handle of the schema to apply, with the anchors in scope where
     * it's applied. The first copy of a schema keeps its handle. A URI
     * can't have a space, so the others' can't be a schema's.
     *
     * @type (handle: Handle, outer: Record<string, Handle> | undefined) => Handle
     */
    const specialize = (handle, outer) => {
      const names = read.get(handle);
      if (names === undefined) {
        return handle;
      }

      const schema = /** @type Exclude<CompiledSchema, boolean> */ (kernel.schemas[handle]);
      const inScope = addDynamicAnchors(kernel.resources[schema.resource].dynamicAnchors, outer);
      /** @type [string, Handle][] */
      const entries = [];
      for (const name of names) {
        if (Object.hasOwn(inScope, name)) {
          entries.push([name, inScope[name]]);
        }
      }
      const anchors = Object.fromEntries(entries);

      let copiesByAnchors = copiesOf.get(handle);
      if (copiesByAnchors === undefined) {
        copiesByAnchors = new Map();
        copiesOf.set(handle, copiesByAnchors);
      }
      const key = JSON.stringify(entries);
      let copy = copiesByAnchors.get(key);
      if (copy === undefined) {
        copy = copiesByAnchors.size === 0 ? handle : `${handle} ${++copies}`;
        copiesByAnchors.set(key, copy);
        queue.push([handle, copy, anchors]);
      }
      return copy;
    };

    specialize(kernel.uri, undefined);
    while (queue.length > 0) {
      if (copies > budget) {
        return new Map();
      }

      const [handle, copy, anchors] = /** @type [Handle, Handle, Record<string, Handle>] */ (queue.pop());
      /** @type (handle: Handle) => Handle */
      const applied = (handle) => specialize(handle, anchors);
      const schema = /** @type Exclude<CompiledSchema, boolean> */ (kernel.schemas[handle]);
      const keywords = schema.keywords.map((group) => ({ ...group, expression: resolve(group.expression, anchors, applied) }));
      replaced.set(copy, copy === handle ? { ...schema, keywords } : { ...schema, keywords, copyOf: handle });
    }

    // Nothing applies a schema that reads the dynamic scope and wasn't
    // copied anymore, but it would still make the evaluators track it
    for (const handle of read.keys()) {
      if (!copiesOf.has(handle)) {
        replaced.set(handle, null);
      }
    }

    return replaced;
  }
};

/**
 * The anchors each schema can read: its own `dynamicApply`'s, and the ones
 * of every schema it can apply, through every schema a `dynamicApply`
 * could apply. A schema that can't read any isn't in it.
 *
 * @type (kernel: Kernel) => Map<Handle, Set<string>>
 */
const anchorsRead = (kernel) => {
  /** @type Map<string, Handle[]> */
  const identified = new Map();
  for (const resource in kernel.resources) {
    const { dynamicAnchors } = kernel.resources[resource];
    for (const name in dynamicAnchors) {
      const handles = identified.get(name);
      if (handles === undefined) {
        identified.set(name, [dynamicAnchors[name]]);
      } else {
        handles.push(dynamicAnchors[name]);
      }
    }
  }

  /** @type Map<Handle, Set<Handle>> */
  const callers = new Map();
  /** @type (callee: Handle, caller: Handle) => void */
  const addCaller = (callee, caller) => {
    const handles = callers.get(callee);
    if (handles === undefined) {
      callers.set(callee, new Set([caller]));
    } else {
      handles.add(caller);
    }
  };

  /** @type Map<Handle, Set<string>> */
  const read = new Map();
  for (const handle in kernel.schemas) {
    const schema = kernel.schemas[handle];
    if (typeof schema === "boolean") {
      continue;
    }

    /** @type Set<string> */
    const own = new Set();
    for (const { expression } of schema.keywords) {
      eachApply(expression, (applies) => {
        if (applies.op === "apply") {
          addCaller(applies.schema, handle);
        } else {
          own.add(applies.anchor);
          for (const callee of identified.get(applies.anchor) ?? []) {
            addCaller(callee, handle);
          }
          if (applies.fallback !== null) {
            addCaller(applies.fallback, handle);
          }
        }
      });
    }
    if (own.size > 0) {
      read.set(handle, own);
    }
  }

  const changed = [...read.keys()];
  while (changed.length > 0) {
    const callee = /** @type Handle */ (changed.pop());
    const names = /** @type Set<string> */ (read.get(callee));
    for (const caller of callers.get(callee) ?? []) {
      let callerNames = read.get(caller);
      if (callerNames === undefined) {
        callerNames = new Set();
        read.set(caller, callerNames);
      }
      const size = callerNames.size;
      for (const name of names) {
        callerNames.add(name);
      }
      if (callerNames.size > size) {
        changed.push(caller);
      }
    }
  }

  return read;
};

/** @typedef {Extract<Expression, { op: "apply" | "dynamicApply" }>} Applies */

/** @type (expression: Expression, visit: (applies: Applies) => void) => void */
const eachApply = (expression, visit) => {
  if (expression.op === "apply" || expression.op === "dynamicApply") {
    visit(expression);
  }
  for (const subexpression of subexpressions(expression)) {
    eachApply(subexpression, visit);
  }
};

/** @type (expression: Expression) => boolean */
const opaqueReadsDynamicScope = (expression) => {
  return (expression.op === "opaque" && (expression.reads?.includes("dynamicScope") ?? false))
    || subexpressions(expression).some(opaqueReadsDynamicScope);
};

/**
 * An expression with each `apply` of the schema `applied` says, and each
 * `dynamicApply` an `apply` of what its anchor identifies. One whose
 * anchor isn't in scope and that has no fallback is an error when it's
 * evaluated, so it stays.
 *
 * @type (expression: Expression, anchors: Record<string, Handle>, applied: (handle: Handle) => Handle) => Expression
 */
const resolve = (expression, anchors, applied) => {
  /** @type (expression: Expression) => Expression */
  const of = (expression) => resolve(expression, anchors, applied);
  /** @type (expression: Expression | null) => Expression | null */
  const ofNullable = (expression) => expression && of(expression);

  switch (expression.op) {
    case "apply":
      return { op: "apply", schema: applied(expression.schema) };
    case "dynamicApply": {
      const handle = Object.hasOwn(anchors, expression.anchor) ? anchors[expression.anchor] : expression.fallback;
      return handle === null ? expression : { op: "apply", schema: applied(handle) };
    }
    case "all":
    case "any":
    case "one":
      return { ...expression, of: expression.of.map(of) };
    case "not":
    case "item":
    case "eachItem":
    case "contains":
    case "property":
    case "eachProperty":
    case "eachPropertyName":
      return { ...expression, of: of(expression.of) };
    case "cases":
      return {
        ...expression,
        cases: expression.cases.map(([condition, then]) => [of(condition), ofNullable(then)]),
        otherwise: ofNullable(expression.otherwise)
      };
    case "typeSwitch": {
      /** @type typeof expression.cases */
      const cases = {};
      for (const type of /** @type (keyof typeof expression.cases)[] */ (Object.keys(expression.cases))) {
        cases[type] = of(/** @type Expression */ (expression.cases[type]));
      }
      return { ...expression, cases, otherwise: of(expression.otherwise) };
    }
    case "propertySwitch":
      return {
        ...expression,
        cases: expression.cases.map(([value, then]) => [value, of(then)]),
        other: of(expression.other),
        absent: of(expression.absent),
        unparsed: of(expression.unparsed)
      };
    case "keySwitch":
      return {
        ...expression,
        cases: expression.cases.map(([name, then]) => [name, of(then)]),
        none: of(expression.none),
        unparsed: of(expression.unparsed)
      };
    case "itemSequence":
      return { ...expression, pattern: resolvePattern(expression.pattern, of) };
    case "opaque":
      return { ...expression, schemas: expression.schemas.map(of) };
    default:
      return expression;
  }
};

/** @type (pattern: ItemPattern, of: (expression: Expression) => Expression) => ItemPattern */
const resolvePattern = (pattern, of) => {
  if ("item" in pattern) {
    return { item: of(pattern.item) };
  } else if ("sequence" in pattern) {
    return { sequence: pattern.sequence.map((each) => resolvePattern(each, of)) };
  } else if ("either" in pattern) {
    return { either: pattern.either.map((each) => resolvePattern(each, of)) };
  } else {
    return { ...pattern, repeat: resolvePattern(pattern.repeat, of) };
  }
};
