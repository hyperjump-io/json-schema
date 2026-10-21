/**
 * @import { EvaluationLocation, KeywordInfo } from "../evaluate/evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError } from "./output-format.d.ts"
 * @import { ValidationError } from "./validation-error.d.ts"
 */

/** The `ruleId` of an error from a `false` schema */
export const falseSchemaRuleId = "https://json-schema.org/validation";

/**
 * Where a keyword's errors start in an error list. For `if` and
 * `conditional`, it also has the handles of their conditions (see
 * {@link conditionsOf}).
 *
 * @typedef {number | { start: number; conditions: ReadonlySet<string> }} KeywordStart
 */

/** @type (keyword: KeywordInfo, start: number) => KeywordStart */
export const keywordStart = (keyword, start) => {
  if (keyword.keywordUri !== ifUri && keyword.keywordUri !== conditionalUri) {
    return start;
  }

  return { start, conditions: conditionsOf(keyword) };
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
  keywordLocation: at.keywordLocation,
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

const ifUri = "https://json-schema.org/keyword/if";
const conditionalUri = "https://json-schema.org/keyword/conditional";

/** @type WeakMap<KeywordInfo, ReadonlySet<string>> */
const conditionsCache = new WeakMap();

/**
 * `if` and `conditional` evaluate conditions, subschemas whose result only
 * decides which other subschema applies. A failing condition isn't an error,
 * so its errors aren't reported. This is a special case for these keywords
 * rather than something a keyword can declare, so keywords aren't encouraged
 * to depend on the result of another subschema.
 *
 * @type (keyword: KeywordInfo) => ReadonlySet<string>
 */
const conditionsOf = (keyword) => {
  let conditions = conditionsCache.get(keyword);
  if (conditions !== undefined) {
    return conditions;
  }

  if (keyword.keywordUri === ifUri) {
    const compiled = /** @type Record<"if", string> */ (keyword.compiled);
    conditions = new Set([compiled.if]);
  } else {
    // Conditions are followed by the schema that applies if they pass. A
    // schema at the end without a condition is the fallback.
    const handles = /** @type string[] */ (keyword.compiled);
    const conditionHandles = new Set();
    for (let index = 0; index + 1 < handles.length; index += 2) {
      conditionHandles.add(handles[index]);
    }
    conditions = conditionHandles;
  }

  conditionsCache.set(keyword, conditions);
  return conditions;
};
