import type { JsonType } from "@hyperjump/browser/json";
import type { JsonSchema } from "../json-schema.d.ts";
import type { Expression, Selector, TypeName } from "../kernel/kernel.d.ts";
import type { JsonSchemaKeywordNode } from "../schema/schema-ast.d.ts";
import type { LoweredKeyword } from "./lower.d.ts";

/**
 * The types of value an expression applies to: the ones it can fail, mark,
 * or annotate on. It's what a keyword applies to, from what it lowers to
 * (`lowerForLint`), instead of from its URI. A schema it applies isn't
 * looked into, so it could be about any type. A case only applies where its
 * condition can pass. A keyword with no effect in its schema, like
 * `uniqueItems: false` or `properties: {}`, applies to nothing. A format
 * applies to the types its definition says, if it's known.
 */
export const appliesTo: (jsonSchema: JsonSchema, expression: Expression) => Set<JsonType>;

/**
 * The types of value a keyword applies to ({@link appliesTo}), in a schema
 * whose keywords are `keywords` (from `lowerForLint`): what its group applies
 * to, and what the groups that read it as a sibling do, like draft-04's
 * `exclusiveMaximum`, which `maximum` reads. They're in the order `null`,
 * `boolean`, `number`, `string`, `array`, `object`.
 */
export const keywordAppliesTo: (jsonSchema: JsonSchema, keywords: LoweredKeyword[], keywordNode: JsonSchemaKeywordNode) => JsonType[];

/** The types of value an expression can pass, as far as it's known without applying a schema */
export const canPass: (expression: Expression) => Set<JsonType>;

/**
 * Whether an expression asserts something on its own: it can fail without a
 * schema, and it doesn't apply one. Checking a value's type (`type`,
 * `const`, `enum`) and `format` aren't counted.
 */
export const assertsOnItsOwn: (expression: Expression) => boolean;

/** A keyword group's operations: what's in its top-level `all`, or the expression itself */
export const operationsOf: (expression: Expression) => Expression[];

/**
 * The first keyword in a schema whose keywords are `keywords` (from
 * `lowerForLint`) that lowers to `typeIs`, and its types, so a rule about
 * `type` works with any keyword that says the same. A `type` that allows
 * nothing lowers to `fail`, so it isn't found.
 */
export const typeIsOf: (keywords: LoweredKeyword[]) => { keywordNode: JsonSchemaKeywordNode; types: Set<TypeName> } | undefined;

/**
 * Whether an `eachProperty` selector selects a property name. It's
 * undefined for an `unevaluated` selector, which depends on what's marked,
 * and for a pattern that isn't valid.
 */
export const selects: (select: Selector, name: string) => boolean | undefined;

/**
 * What the keywords of a schema (from `lowerForLint`) apply to a property
 * with the given name: `property` for the name, and `eachProperty` with a
 * selector that selects it, each with its keyword. An `unevaluated`
 * selector isn't included, because what it selects depends on what's
 * marked. It's undefined if a pattern isn't valid, because then what
 * applies is unknown.
 */
export const propertyOperations: (keywords: LoweredKeyword[], name: string) => { keyword: LoweredKeyword; of: Expression }[] | undefined;

/**
 * The property a dependency's condition is that an object has, like the
 * conditions `dependentRequired` and `dependentSchemas` lower to. It's
 * undefined for any other condition.
 */
export const dependsOn: (condition: Expression) => string | undefined;
