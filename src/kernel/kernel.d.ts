import type { Json } from "@hyperjump/browser/json";

/**
 * The kernel: the expressions every keyword lowers to (see `design/specs/kernel/`). The
 * optimizer, the output formats, and lint only work with these, so they
 * support any keyword that lowers to them, without knowing its URI.
 *
 * An expression is evaluated on an instance. It has a result, the property
 * names or item indexes it marks as evaluated, and the annotations it
 * makes. Every operation has the types it applies to, and passes an
 * instance of any other type without marking or annotating anything.
 * Expressions are JSON, so a compiled schema can be serialized.
 */

/** Identifies a compiled schema. It's the schema's canonical URI. */
export type Handle = string;

/** A type `typeIs` tests for. `integer` is a number without a fractional part. */
export type TypeName = "null" | "boolean" | "object" | "array" | "number" | "string" | "integer";

/**
 * Which properties `eachProperty` applies to: the names a pattern matches,
 * the names that aren't listed and don't match any of the patterns, or the
 * names that aren't marked yet
 */
export type Selector = { pattern: string }
  | { except: { names: string[]; patterns: string[] } }
  | { unevaluated: true };

/**
 * A regular expression over items, for `itemSequence`: an item, a sequence,
 * alternatives, and `?` (`min: 0, max: 1`), `*` (`min: 0, max: null`), and
 * `+` (`min: 1, max: null`)
 */
export type ItemPattern = { item: Expression }
  | { sequence: ItemPattern[] }
  | { either: ItemPattern[] }
  | { repeat: ItemPattern; min: 0 | 1; max: 1 | null };

/** A JSON type, which `integer` isn't */
export type JsonTypeName = Exclude<TypeName, "integer">;

/** A JSON value that isn't an object or an array */
export type Scalar = null | boolean | number | string;

/** Inclusive limits. A limit that's left out isn't checked. */
export type Limits = { min?: number; max?: number };

/**
 * A kernel expression. Fields that hold expressions can hold any expression,
 * nested. A schema is used through `apply`. The operations are in the
 * groups of `design/specs/kernel/operations/`, starting with logic and schemas,
 * which says what each one means.
 *
 * A keyword that can't be said with the other operations uses an escape
 * hatch. `predicate` is a check of instances of `types`, which passes any
 * other type. `opaque` is an applicator: what it applies is `schemas`
 * (usually `apply` expressions), and `value` is only data. The keyword's
 * `evaluate` gets their evaluators, in the same order. It marks what it
 * says it marks, and nothing about it is known otherwise, so optimizations
 * treat it as a barrier.
 */
export type Expression = { op: "pass" }
  | { op: "fail" }
  | { op: "all" | "any" | "one"; of: Expression[] }
  | { op: "not"; of: Expression }
  | { op: "cases"; cases: [Expression, Expression | null][]; otherwise: Expression | null }
  | { op: "typeSwitch"; cases: Partial<Record<JsonTypeName, Expression>>; otherwise: Expression }
  | { op: "propertySwitch"; name: string; cases: [Scalar, Expression][]; other: Expression; absent: Expression; unparsed: Expression }
  | { op: "keySwitch"; cases: [string, Expression][]; none: Expression; unparsed: Expression }
  | { op: "apply"; schema: Handle }
  | { op: "dynamicApply"; anchor: string; fallback: Handle | null }

  // Values of any type
  | { op: "typeIs"; types: TypeName[] }
  | { op: "equals"; value: Json }
  | { op: "oneOfValues"; values: Json[] }

  // Numbers
  | { op: "range"; min?: number; max?: number; exclusiveMin?: boolean; exclusiveMax?: boolean }
  | { op: "multipleOf"; divisor: number }

  // Strings
  | ({ op: "stringLength" } & Limits)
  | { op: "matches"; pattern: string }
  | { op: "format"; name: string; uri: string | null; assert: boolean }

  // Arrays
  | ({ op: "itemCount" } & Limits)
  | { op: "uniqueItems" }
  | { op: "item"; index: number; of: Expression }
  | { op: "eachItem"; from: number; of: Expression }
  | { op: "eachItem"; unevaluated: true; of: Expression }
  | { op: "contains"; of: Expression; min: number; max: number | null }
  | { op: "itemSequence"; pattern: ItemPattern }

  // Objects
  | ({ op: "propertyCount" } & Limits)
  | { op: "hasProperty"; name: string }
  | { op: "propertyEquals"; name: string; value: Json }
  | { op: "property"; name: string; of: Expression }
  | { op: "eachProperty"; select: Selector; of: Expression }
  | { op: "eachPropertyName"; of: Expression }

  // Annotations
  | { op: "annotate"; value: Json; types?: TypeName[] }

  // Escape hatches, evaluated by the keyword's `evaluate`
  | { op: "predicate"; keyword: string; value: Json; types: TypeName[] }
  | { op: "opaque"; keyword: string; value: Json; schemas: Expression[]; explainsFailure?: boolean; reads?: EvaluationState[] };

/**
 * What an `opaque` operation reads besides the instance: the properties or
 * items marked so far (`evaluated`), or the dynamic scope (`dynamicScope`)
 */
export type EvaluationState = "evaluated" | "dynamicScope";

export type Op = Expression["op"];

/** The expressions of one operation */
export type ExpressionOf<O extends Op> = Extract<Expression, { op: O }>;

/**
 * A keyword in a compiled schema. It's what plugins and errors see: an error
 * is reported for a keyword, never for an operation inside it.
 */
export type KeywordGroup = {
  keywordUri: string;

  /** The keyword's absolute keyword location */
  location: string;

  /**
   * The locations of the siblings the keyword read, in the order it
   * declares them
   */
  sources: string[];

  expression: Expression;
};

/**
 * A boolean schema, or an object schema's keyword groups, in the order
 * they're evaluated, and the URI of the schema resource it belongs to
 */
export type CompiledSchema = boolean | {
  resource: string;
  keywords: KeywordGroup[];

  /**
   * The handle of the schema this is a copy of, for a copy an optimization
   * made. Its handle isn't a location, so this is where it is. Lowering
   * doesn't make copies, so a serialized kernel doesn't have any.
   */
  copyOf?: Handle;
};

/**
 * A compiled schema and every schema it applies. It's JSON, so it can be
 * serialized.
 */
export type Kernel = {
  /** The version of the kernel the expressions are in */
  kernel: 1;

  /** The schema evaluation starts from */
  uri: Handle;

  schemas: Record<Handle, CompiledSchema>;

  /**
   * The dynamic anchors of every schema resource a compiled schema belongs
   * to, mapped to the schemas they identify
   */
  resources: Record<string, { dynamicAnchors: Record<string, Handle> }>;

  /**
   * The schemas with a keyword group that reads each kind of evaluation
   * state, so evaluators and optimizations know what to track without
   * reading every expression. `restoreValidator` works it out again.
   */
  reads: Record<EvaluationState, Handle[]>;
};

/** The expressions directly in an expression, not through `apply` */
export const subexpressions: (expression: Expression) => Expression[];

/**
 * An expression with `map` applied to each of its `subexpressions`, or the
 * same expression if `map` returned every one of them unchanged
 */
export const mapSubexpressions: (expression: Expression, map: (subexpression: Expression) => Expression) => Expression;

/**
 * Whether an expression reads the dynamic scope (`dynamicApply`, or an
 * `opaque` operation that reads it), so evaluators have to track it
 */
export const readsDynamicScope: (expression: Expression) => boolean;

/** The kinds of evaluation state a schema's keyword groups read */
export const schemaReads: (schema: CompiledSchema) => EvaluationState[];

/** The item expressions in an item pattern */
export const patternItems: (pattern: ItemPattern) => Expression[];

/** Whether an expression is or has an operation */
export const hasOp: (expression: Expression, op: Op) => boolean;

/**
 * Whether an expression reads the marks on the instance it's evaluated on
 * (an `unevaluated` selector). Marks on a child are the child's, so an
 * operation on children doesn't read these.
 */
export const readsMarks: (expression: Expression) => boolean;

/**
 * Whether an expression fails only when a subexpression fails, and their
 * failures say why. The BASIC output format reports only the
 * subexpressions' errors for a keyword whose expression explains its
 * failure.
 */
export const explainsFailure: (expression: Expression) => boolean;

/**
 * The schemas an expression applies as conditions of its `cases`. A
 * condition that fails isn't an error, so output formats don't report its
 * errors.
 */
export const conditionsOf: (expression: Expression) => ReadonlySet<Handle>;
