import { keywordDefinitionUri } from "../../keywords/unknown.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchema } from "../../json-schema.d.ts"
 * @import { CompiledKeyword, CompiledSchema, CompiledSchemas } from "../compile.js"
 * @import { Optimization } from "../optimize.js"
 */

/**
 * What a schema marks as evaluated whenever it passes. Properties are
 * `names` and the properties matching `patterns`. Items are the ones before
 * `prefix` and the ones from `from` on. `all` is every property or item.
 *
 * @typedef {{
 *   all: boolean;
 *   names: Set<string>;
 *   patterns: Set<string>;
 *   prefix: number;
 *   from: number;
 * }} Marks
 */

/**
 * The marks a keyword makes, or undefined if they depend on the instance
 *
 * @typedef {(compiled: any, marksOf: (handle: string) => Marks | undefined) => Marks | undefined} MarksRule
 */

/**
 * Replace `unevaluatedProperties` and `unevaluatedItems` with keywords that
 * don't read what was evaluated, where what its siblings evaluate is known
 * without the instance. `unevaluatedProperties` is `additionalProperties`
 * with the properties and patterns its siblings evaluate, and
 * `unevaluatedItems` is `items` starting after its siblings' prefix. A
 * keyword whose siblings evaluate everything is left out. When nothing reads
 * what was evaluated, specializations don't track it, which is much faster.
 *
 * What's evaluated is known if the schemas applied to the same instance
 * only use keywords this pass has rules for. Conditional applicators, like
 * `anyOf`, only count if none of their subschemas mark anything. `contains`
 * and dynamic references are never known. It's only the marks a passing
 * schema makes, because a schema whose sibling fails fails anyway. That's
 * only true without plugins or annotations, so it's `fastOnly`.
 *
 * @type Optimization
 */
export default {
  fastOnly: true,
  optimize(compiled, jsonSchema) {
    const analyses = {
      properties: new Analysis(compiled, jsonSchema, propertiesRules),
      items: new Analysis(compiled, jsonSchema, itemsRules)
    };

    // Copying the whole table is faster than building it one schema at a
    // time, and most schemas don't change
    /** @type CompiledSchemas["schemas"] | undefined */
    let schemas;
    for (const handle in compiled.schemas) {
      const schema = compiled.schemas[handle];
      if (typeof schema === "boolean" || !schema.keywords.some(([keywordUri]) => keywordUri in readers)) {
        continue;
      }

      /** @type CompiledKeyword[] */
      const keywords = [];
      for (const keyword of schema.keywords) {
        const [keywordUri, location, value] = keyword;
        if (!(keywordUri in readers)) {
          keywords.push(keyword);
          continue;
        }

        const reader = readers[keywordUri];
        const marks = analyses[reader.kind].siblingMarks(schema, keyword);
        if (marks === undefined) {
          keywords.push(keyword);
          continue;
        } else if (isAll(marks)) {
          continue;
        }

        const replacementUri = reader.keywords.find((uri) => jsonSchema.hasKeyword(uri));
        const replacement = reader.compiled(/** @type string */ (value), marks);
        if (replacementUri === undefined || replacement === undefined) {
          keywords.push(keyword);
        } else {
          keywords.push([replacementUri, location, replacement]);
        }
      }

      schemas ??= { ...compiled.schemas };
      schemas[handle] = { resource: schema.resource, keywords };
    }

    return schemas === undefined ? compiled : { ...compiled, schemas };
  }
};

/**
 * The keywords this pass replaces, which kind of marks they read, and what
 * they're replaced with, if they can be. A replacement is any of the
 * `keywords` that's defined, with the compiled value `compiled` makes.
 *
 * @type Record<string, {
 *   kind: "properties" | "items";
 *   keywords: string[];
 *   compiled: (handle: string, marks: Marks) => Json | undefined;
 * }>
 */
const readers = {
  "https://json-schema.org/keyword/unevaluatedProperties": {
    kind: "properties",
    keywords: ["https://json-schema.org/keyword/additionalProperties"],
    compiled: (handle, marks) => ({ handle, properties: [...marks.names], patterns: [...marks.patterns] })
  },
  "https://json-schema.org/keyword/unevaluatedItems": {
    kind: "items",
    // 2019-09's `additionalItems` is `items` with a start
    keywords: ["https://json-schema.org/keyword/items", "https://json-schema.org/keyword/draft-2019-09/additionalItems"],
    compiled: (handle, marks) => marks.from === Infinity ? { handle, start: marks.prefix } : undefined
  }
};

/** @type () => Marks */
const nothing = () => ({ all: false, names: new Set(), patterns: new Set(), prefix: 0, from: Infinity });

/** @type () => Marks */
const everything = () => ({ ...nothing(), all: true });

/** @type (marks: Marks) => boolean */
const isAll = (marks) => marks.all || marks.from <= marks.prefix;

/** @type (marks: Marks, more: Marks) => void */
const addMarks = (marks, more) => {
  marks.all ||= more.all;
  for (const name of more.names) {
    marks.names.add(name);
  }
  for (const pattern of more.patterns) {
    marks.patterns.add(pattern);
  }
  marks.prefix = Math.max(marks.prefix, more.prefix);
  marks.from = Math.min(marks.from, more.from);
};

/** @type (marks: Marks) => boolean */
const isNothing = (marks) => !isAll(marks) && marks.names.size === 0 && marks.patterns.size === 0 && marks.prefix === 0 && marks.from === Infinity;

/** @type MarksRule */
const markNothing = () => nothing();

/** @type MarksRule */
const markEverything = () => everything();

/** @type (handles: string[], marksOf: (handle: string) => Marks | undefined) => Marks | undefined */
const allOfMarks = (handles, marksOf) => {
  const marks = nothing();
  for (const handle of handles) {
    const subschemaMarks = marksOf(handle);
    if (subschemaMarks === undefined) {
      return;
    }
    addMarks(marks, subschemaMarks);
  }

  return marks;
};

/**
 * Whether a conditional applicator's subschemas pass depends on the
 * instance, so it's only known if none of them mark anything
 *
 * @type (handles: (string | null)[], marksOf: (handle: string) => Marks | undefined) => Marks | undefined
 */
const conditionalMarks = (handles, marksOf) => {
  for (const handle of handles) {
    if (handle === null) {
      continue;
    }

    const subschemaMarks = marksOf(handle);
    if (subschemaMarks === undefined || !isNothing(subschemaMarks)) {
      return;
    }
  }

  return nothing();
};

/**
 * Keywords that apply subschemas to the same instance, which mark what
 * their subschemas mark
 *
 * @type Record<string, MarksRule>
 */
const sameInstanceRules = {
  "https://json-schema.org/keyword/ref": (handle, marksOf) => marksOf(handle),
  "https://json-schema.org/keyword/allOf": allOfMarks,
  "https://json-schema.org/keyword/anyOf": conditionalMarks,
  "https://json-schema.org/keyword/oneOf": conditionalMarks,
  "https://json-schema.org/keyword/conditional": conditionalMarks,
  "https://json-schema.org/keyword/if": (compiled, marksOf) => conditionalMarks([compiled.if, compiled.then, compiled.else], marksOf),
  "https://json-schema.org/keyword/dependentSchemas": (compiled, marksOf) => conditionalMarks(compiled.map((/** @type [string, string] */ [, handle]) => handle), marksOf),
  "https://json-schema.org/keyword/propertyDependencies": (compiled, marksOf) => {
    /** @type string[] */
    const handles = [];
    for (const [, mappings] of compiled) {
      for (const [, handle] of mappings) {
        handles.push(handle);
      }
    }
    return conditionalMarks(handles, marksOf);
  },

  // A schema that `not` applies only passes if it fails, so its marks
  // aren't kept
  "https://json-schema.org/keyword/not": markNothing
};

/**
 * `propertyNames` applies its subschema to property names, which aren't the
 * same instance
 *
 * @type Record<string, MarksRule>
 */
const otherInstanceRules = {
  "https://json-schema.org/keyword/propertyNames": markNothing
};

const propertyApplicators = [
  "https://json-schema.org/keyword/properties",
  "https://json-schema.org/keyword/patternProperties",
  "https://json-schema.org/keyword/additionalProperties",
  "https://json-schema.org/keyword/unevaluatedProperties"
];

const itemApplicators = [
  "https://json-schema.org/keyword/prefixItems",
  "https://json-schema.org/keyword/items",
  "https://json-schema.org/keyword/draft-2019-09/items",
  "https://json-schema.org/keyword/draft-2019-09/additionalItems",
  "https://json-schema.org/keyword/contains",
  "https://json-schema.org/keyword/itemPattern",
  "https://json-schema.org/keyword/unevaluatedItems"
];

/**
 * Marks are kept in one set for properties and items, because an instance
 * can't be both, so keywords that mark items don't mark properties, and the
 * other way around.
 *
 * @type Record<string, MarksRule>
 */
const propertiesRules = {
  ...sameInstanceRules,
  ...otherInstanceRules,
  ...Object.fromEntries(itemApplicators.map((keywordUri) => [keywordUri, markNothing])),
  "https://json-schema.org/keyword/properties": (properties) => {
    const marks = nothing();
    for (const [name] of properties) {
      marks.names.add(name);
    }
    return marks;
  },
  "https://json-schema.org/keyword/patternProperties": (patternProperties) => {
    const marks = nothing();
    for (const [pattern] of patternProperties) {
      marks.patterns.add(pattern);
    }
    return marks;
  },
  "https://json-schema.org/keyword/additionalProperties": markEverything,
  "https://json-schema.org/keyword/unevaluatedProperties": markEverything
};

/** @type Record<string, MarksRule> */
const itemsRules = {
  ...sameInstanceRules,
  ...otherInstanceRules,
  ...Object.fromEntries(propertyApplicators.map((keywordUri) => [keywordUri, markNothing])),
  "https://json-schema.org/keyword/prefixItems": (prefixItems) => ({ ...nothing(), prefix: prefixItems.length }),
  "https://json-schema.org/keyword/items": ({ start }) => ({ ...nothing(), from: start }),
  "https://json-schema.org/keyword/draft-2019-09/items": (items) => Array.isArray(items)
    ? { ...nothing(), prefix: items.length }
    : everything(),
  "https://json-schema.org/keyword/draft-2019-09/additionalItems": (compiled) => compiled === null
    ? nothing()
    : { ...nothing(), from: compiled.start },
  // `itemPattern` doesn't mark items
  "https://json-schema.org/keyword/itemPattern": markNothing,
  "https://json-schema.org/keyword/unevaluatedItems": markEverything
};

/**
 * Finds the marks schemas make for one kind of reader. A keyword without a
 * rule might mark anything, so a schema with one isn't known.
 */
class Analysis {
  /** @type CompiledSchemas */
  #compiled;

  /** @type JsonSchema */
  #jsonSchema;

  /** @type Record<string, MarksRule> */
  #rules;

  /** @type Map<string, Marks | undefined> */
  #marks;

  /** @type Set<string> */
  #inProgress;

  /**
   * @param {CompiledSchemas} compiled
   * @param {JsonSchema} jsonSchema
   * @param {Record<string, MarksRule>} rules
   */
  constructor(compiled, jsonSchema, rules) {
    this.#compiled = compiled;
    this.#jsonSchema = jsonSchema;
    this.#rules = rules;
    this.#marks = new Map();
    this.#inProgress = new Set();
  }

  /**
   * The marks every keyword in a schema but one makes
   *
   * @type (schema: Exclude<CompiledSchema, boolean>, except?: CompiledKeyword) => Marks | undefined
   */
  siblingMarks(schema, except) {
    const marks = nothing();
    for (const keyword of schema.keywords) {
      if (keyword === except) {
        continue;
      }

      const keywordMarks = this.#keywordMarks(keyword);
      if (keywordMarks === undefined) {
        return;
      }
      addMarks(marks, keywordMarks);
    }

    return marks;
  }

  /**
   * Only applicators mark properties or items (see `markEvaluated`), and a
   * keyword can only apply the schemas whose handles it compiled, or, if it
   * reads the dynamic scope, the ones dynamic anchors identify. So a keyword
   * without a rule marks nothing if it isn't evaluated, or if it doesn't
   * read the dynamic scope and its compiled value doesn't have a handle in
   * it. Otherwise, what it marks isn't known.
   *
   * @type (keyword: CompiledKeyword) => Marks | undefined
   */
  #keywordMarks([keywordUri, , value]) {
    const rule = this.#rules[keywordUri];
    if (rule !== undefined) {
      return rule(value, this.#schemaMarks);
    }

    const keyword = this.#jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
    if (!keyword.evaluate || (!keyword.reads?.includes("dynamicScope") && !this.#hasHandle(value))) {
      return nothing();
    }
  }

  /** @type (value: Json) => boolean */
  #hasHandle(value) {
    if (typeof value === "string") {
      return Object.hasOwn(this.#compiled.schemas, value);
    } else if (Array.isArray(value)) {
      return value.some((item) => this.#hasHandle(item));
    } else if (typeof value === "object" && value !== null) {
      return Object.values(value).some((propertyValue) => this.#hasHandle(propertyValue));
    }

    return false;
  }

  /** @type (handle: string) => Marks | undefined */
  #schemaMarks = (handle) => {
    if (this.#marks.has(handle)) {
      return this.#marks.get(handle);
    }

    const schema = this.#compiled.schemas[handle];
    if (typeof schema === "boolean") {
      return nothing();
    }

    // A schema that applies itself to the same instance never finishes
    // evaluating, so it isn't worth knowing
    if (this.#inProgress.has(handle)) {
      return;
    }

    this.#inProgress.add(handle);
    const marks = this.siblingMarks(schema);
    this.#inProgress.delete(handle);

    this.#marks.set(handle, marks);
    return marks;
  };
}
