/**
 * @import { EvaluationLocation, KeywordInfo } from "../kernel/evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError } from "./output-format.d.ts"
 * @import { ValidationError } from "./validation-error.d.ts"
 */

/** The `ruleId` of an error from a `false` schema */
export const falseSchemaRuleId = "https://json-schema.org/validation";

/**
 * Where a keyword's errors start in an error list. For a keyword with
 * conditions, like `if`, it also has the handles of its conditions, whose
 * errors aren't reported.
 *
 * @typedef {number | { start: number; conditions: ReadonlySet<string> }} KeywordStart
 */

/** @type (keyword: KeywordInfo, start: number) => KeywordStart */
export const keywordStart = (keyword, start) => {
  return keyword.conditions.size === 0 ? start : { start, conditions: keyword.conditions };
};

/** @type (state: KeywordStart) => number */
export const startOf = (state) => typeof state === "number" ? state : state.start;

/**
 * Keywords that explain their failure by the kernel's rule but didn't
 * before it, when keywords said so themselves (`simpleApplicator`).
 * `anyOf` and `oneOf` only do with one schema. BASIC keeps their errors
 * until it uses the kernel's rule (DESIGN.md, "Moving the kernel into
 * `src/`", stage 3).
 */
const explainedNow = new Set([
  "https://json-schema.org/keyword/conditional",
  "https://json-schema.org/keyword/draft-07/dependencies",
  "https://json-schema.org/keyword/draft-04/dependencies",
  "https://json-schema.org/keyword/anyOf",
  "https://json-schema.org/keyword/oneOf"
]);

/**
 * Whether a keyword's failure is explained by its subschemas' failures, so
 * BASIC reports only theirs
 *
 * @type (keyword: KeywordInfo) => boolean
 */
export const explainsFailure = (keyword) => keyword.explainsFailure && !explainedNow.has(keyword.keywordUri);

/**
 * Whether a schema is a condition of the keyword that applied it, so its
 * errors aren't reported
 *
 * @type (schemaHandle: string, parent: KeywordStart | undefined) => boolean
 */
export const isCondition = (schemaHandle, parent) => typeof parent === "object" && parent.conditions.has(schemaHandle);

/** @type (ruleId: string, absoluteKeywordLocation: string, at: EvaluationLocation) => ValidationError */
export const validationError = (ruleId, absoluteKeywordLocation, at) => ({
  source: "json-schema",
  ruleId: ruleId,
  absoluteKeywordLocation: absoluteKeywordLocation,
  instanceLocation: at.instanceLocation,
  place: at.node?.position
});

/**
 * Errors with positions are sorted by where they start. Errors without
 * positions (from a JS value) keep the order they were found in.
 *
 * @type <E extends OutputError>(errors: (E | JsonSyntaxError)[]) => (E | JsonSyntaxError)[]
 */
export const inDocumentOrder = (errors) => {
  return errors.sort((a, b) => offset(a) - offset(b));
};

/** @type (error: OutputError) => number */
const offset = (error) => {
  const place = error.place;
  const point = place && "start" in place ? place.start : place;
  return point?.offset ?? 0;
};
