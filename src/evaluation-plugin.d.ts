import type { Json, JsonErrorNode, JsonNode } from "@hyperjump/browser/json";
import type { Keyword } from "./keyword.d.ts";

/**
 * Observes an evaluation. Plugins can't change the result.
 *
 * Plugins don't share state through a context object. Each `before` hook
 * returns the plugin's state for that schema or keyword evaluation, and the
 * core passes it to the matching `after` hook and to the hooks of what's
 * evaluated inside it. That's enough to build nested results like the
 * DETAILED output format.
 *
 * - `S` is the plugin's state for a schema evaluation. It's undefined if the
 *   plugin doesn't have `beforeSchema`.
 * - `K` is the plugin's state for a keyword evaluation. It's undefined if the
 *   plugin doesn't have `beforeKeyword`.
 *
 * When any plugin is used, the instance is evaluated once and nothing stops
 * early, so a plugin sees every keyword that applies and never sees an
 * instance twice. That's slower than evaluating without plugins.
 */
export type EvaluationPlugin<S = unknown, K = unknown> = {
  /**
   * @param parent - The state of the keyword that applied the schema. It's
   * undefined for the schema evaluation started from.
   * @returns The plugin's state for this schema evaluation
   */
  beforeSchema?(schema: SchemaInfo, at: EvaluationLocation, parent: K | undefined): S;

  afterSchema?(schema: SchemaInfo, at: EvaluationLocation, valid: boolean, state: S, parent: K | undefined): void;

  /**
   * @param schema - The state of the schema the keyword is in
   * @returns The plugin's state for this keyword evaluation
   */
  beforeKeyword?(keyword: KeywordInfo, at: EvaluationLocation, schema: S): K;

  afterKeyword?(keyword: KeywordInfo, at: EvaluationLocation, valid: boolean, state: K, schema: S): void;
};

/**
 * A compiled schema. It's created once per specialization, so it's the same
 * object every time the schema is evaluated.
 */
export type SchemaInfo = {
  /** The schema's canonical URI */
  absoluteKeywordLocation: string;

  /** The schema's value if it's a boolean schema */
  booleanSchema?: boolean;
};

/**
 * A keyword in a compiled schema. It's created once per specialization, so
 * it's the same object every time the keyword is evaluated.
 */
export type KeywordInfo = {
  keywordUri: string;

  /** The keyword's canonical URI */
  absoluteKeywordLocation: string;

  keyword: Keyword;

  /** The keyword's compiled value */
  compiled: Json;
};

/** Where in the instance and the evaluation a hook is called */
export type EvaluationLocation = {
  /** A JSON Pointer to the instance being evaluated */
  instanceLocation: string;

  /**
   * A JSON Pointer to the schema or keyword relative to the schema
   * evaluation started from, following references
   */
  keywordLocation: string;

  /**
   * The instance as an AST node. Only defined when evaluating JSON text or
   * annotating.
   */
  node?: JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode;

  /**
   * The instance as a JS value. It's computed when it's asked for, because
   * that's a copy for an AST node. It's undefined for a value that couldn't
   * be parsed.
   */
  value: () => Json | undefined;
};
