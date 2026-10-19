import { DetailedValidationError, ValidationError } from "./validation-error.js";

/**
 * @import { EvaluationLocation, EvaluationPlugin, KeywordInfo, SchemaInfo } from "../evaluate/evaluation-plugin.d.ts"
 * @import { JsonSyntaxError, OutputError, OutputFormatDefinition } from "./output-format.d.ts"
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
const keywordErrors = (keyword) => {
  /** @type KeywordErrors<any> */
  const errors = [];
  const conditions = conditionsOf(keyword);
  if (conditions !== undefined) {
    errors.conditions = conditions;
  }

  return errors;
};

/**
 * Collects a flat list of errors. A failing keyword's state collects the
 * errors of its subschemas, which are only kept if the keyword fails.
 *
 * @implements EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>
 */
export class BasicOutputPlugin {
  /** @type ValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["beforeKeyword"]> */
  beforeKeyword(keyword) {
    return keywordErrors(keyword);
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      if (!keyword.keyword.simpleApplicator) {
        schema.push(keywordError(ValidationError, keyword, at));
      }
      schema.push(...state);
    }
  }

  /** @type NonNullable<EvaluationPlugin<ValidationError[], KeywordErrors<ValidationError>>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(falseSchemaError(ValidationError, schema, at));
    }

    if (parent === undefined) {
      this.errors = valid ? [] : state;
    } else if (!valid && !parent.conditions?.has(schema.absoluteKeywordLocation)) {
      parent.push(...state);
    }
  }
}

/**
 * Collects errors nested by schema structure. A failing keyword's error
 * contains its failing subschemas' errors.
 *
 * @implements EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>
 */
export class DetailedOutputPlugin {
  /** @type DetailedValidationError[] */
  errors = [];

  beforeSchema() {
    return [];
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["beforeKeyword"]> */
  beforeKeyword(keyword) {
    return keywordErrors(keyword);
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["afterKeyword"]> */
  afterKeyword(keyword, at, valid, state, schema) {
    if (!valid) {
      const error = keywordError(DetailedValidationError, keyword, at);
      if (state.length > 0) {
        error.errors = state;
      }
      schema.push(error);
    }
  }

  /** @type NonNullable<EvaluationPlugin<DetailedValidationError[], KeywordErrors<DetailedValidationError>>["afterSchema"]> */
  afterSchema(schema, at, valid, state, parent) {
    if (!valid && schema.booleanSchema === false) {
      state.push(falseSchemaError(DetailedValidationError, schema, at));
    }

    if (parent === undefined) {
      this.errors = valid ? [] : state;
    } else if (!valid && !parent.conditions?.has(schema.absoluteKeywordLocation)) {
      parent.push(...state);
    }
  }
}

/** @type OutputFormatDefinition<"BASIC"> */
export const basicOutputFormat = () => {
  const plugin = new BasicOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};

/** @type OutputFormatDefinition<"DETAILED"> */
export const detailedOutputFormat = () => {
  const plugin = new DetailedOutputPlugin();
  return {
    plugin,
    output: (valid, syntaxErrors) => ({ valid, errors: inDocumentOrder([...syntaxErrors, ...plugin.errors]) })
  };
};

/** @type <E extends ValidationError>(ErrorClass: new (...args: ConstructorParameters<typeof ValidationError>) => E, keyword: KeywordInfo, at: EvaluationLocation) => E */
const keywordError = (ErrorClass, keyword, at) => {
  return new ErrorClass(`Expected the instance to pass '${keywordName(keyword.absoluteKeywordLocation)}'`, {
    ruleId: keyword.keywordUri,
    keywordLocation: at.keywordLocation,
    absoluteKeywordLocation: keyword.absoluteKeywordLocation,
    instanceLocation: at.instanceLocation,
    place: at.node?.position
  });
};

/** @type <E extends ValidationError>(ErrorClass: new (...args: ConstructorParameters<typeof ValidationError>) => E, schema: SchemaInfo, at: EvaluationLocation) => E */
const falseSchemaError = (ErrorClass, schema, at) => {
  return new ErrorClass("The 'false' schema doesn't allow any value", {
    ruleId: falseSchemaRuleId,
    keywordLocation: at.keywordLocation,
    absoluteKeywordLocation: schema.absoluteKeywordLocation,
    instanceLocation: at.instanceLocation,
    place: at.node?.position
  });
};

/**
 * The last segment of a keyword's location is its name
 *
 * @type (location: string) => string
 */
const keywordName = (location) => {
  const segment = location.slice(location.lastIndexOf("/") + 1);
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
};

/**
 * Errors with positions are sorted by where they start. Errors without
 * positions (from a JS value) keep the order they were found in.
 *
 * @type <E extends OutputError>(errors: (E | JsonSyntaxError)[]) => (E | JsonSyntaxError)[]
 */
const inDocumentOrder = (errors) => {
  return errors.sort((a, b) => offset(a) - offset(b));
};

/** @type (error: OutputError) => number */
const offset = (error) => {
  const place = error.place;
  const point = place && "start" in place ? place.start : place;
  return point?.offset ?? 0;
};
