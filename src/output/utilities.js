import { relativeFileUri } from "@hyperjump/browser";

/**
 * @import { IriReference } from "@hyperjump/uri"
 * @import { EvaluationLocation, KeywordInfo } from "../kernel/evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError } from "./output-format.d.ts"
 * @import { DetailedValidationError, ValidationError } from "./validation-error.d.ts"
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
 * Says each error's location, and its subschemas' errors' locations, with
 * `relativeFileUri`, so a schema in a file is relative to the working
 * directory. It's done for the errors that are kept, when the output is
 * made, not for each one that's created. A keyword's location is its
 * schema's location and a JSON Pointer, even in a copy an optimization made,
 * so it's an IRI-reference.
 *
 * @type <E extends DetailedValidationError>(errors: E[]) => E[]
 */
export const withRelativeLocations = (errors) => {
  for (const error of errors) {
    error.absoluteKeywordLocation = relativeFileUri(/** @type IriReference */ (error.absoluteKeywordLocation));
    if (error.errors !== undefined) {
      withRelativeLocations(error.errors);
    }
  }
  return errors;
};

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
