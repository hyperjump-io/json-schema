/**
 * @import { KeywordInfo } from "../evaluate/evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError } from "./output-format.d.ts"
 */

/** The `ruleId` of an error from a `false` schema */
export const falseSchemaRuleId = "https://json-schema.org/validation";

/**
 * A keyword's errors. For `if` and `conditional`, it also has the handles of
 * their conditions (see {@link conditionsOf}).
 *
 * @template E
 * @typedef {E[] & { conditions?: ReadonlySet<string> }} KeywordErrors
 */

/** @type WeakMap<KeywordInfo, ReadonlySet<string> | undefined> */
const conditionsCache = new WeakMap();

/**
 * `if` and `conditional` evaluate conditions, subschemas whose result only
 * decides which other subschema applies. A failing condition isn't an error,
 * so its errors aren't reported. This is a special case for these keywords
 * rather than something a keyword can declare, so keywords aren't encouraged
 * to depend on the result of another subschema.
 *
 * @type (keyword: KeywordInfo) => ReadonlySet<string> | undefined
 */
const conditionsOf = (keyword) => {
  if (conditionsCache.has(keyword)) {
    return conditionsCache.get(keyword);
  }

  /** @type Set<string> | undefined */
  let conditions;
  if (keyword.keywordUri === "https://json-schema.org/keyword/if") {
    const compiled = /** @type Record<"if", string> */ (keyword.compiled);
    conditions = new Set([compiled.if]);
  } else if (keyword.keywordUri === "https://json-schema.org/keyword/conditional") {
    // Conditions are followed by the schema that applies if they pass. A
    // schema at the end without a condition is the fallback.
    const handles = /** @type string[] */ (keyword.compiled);
    conditions = new Set();
    for (let index = 0; index + 1 < handles.length; index += 2) {
      conditions.add(handles[index]);
    }
  }

  conditionsCache.set(keyword, conditions);
  return conditions;
};

/** @type <E>(keyword: KeywordInfo) => KeywordErrors<E> */
export const keywordErrors = (keyword) => {
  /** @type KeywordErrors<any> */
  const errors = [];
  const conditions = conditionsOf(keyword);
  if (conditions !== undefined) {
    errors.conditions = conditions;
  }

  return errors;
};

/**
 * The last segment of a keyword's location is its name
 *
 * @type (location: string) => string
 */
export const keywordName = (location) => {
  const segment = location.slice(location.lastIndexOf("/") + 1);
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
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
