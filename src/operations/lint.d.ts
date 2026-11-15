import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { PluggableList } from "unified";
import type { SchemaMessage } from "../schema/schema-error.d.ts";
import type { SessionOptions } from "../session.d.ts";

/**
 * Lint the whole document `uri` is in: every schema in it, including
 * definitions nothing references, as a file is linted in a unified
 * pipeline. The documents it references aren't linted, but rules can look
 * at them, through the session.
 *
 * It returns each message as plain data, with its `severity`: `"error"`
 * if the rule is configured as an error, and `"warn"` otherwise. A
 * document with schema problems can't be linted, so its problems are
 * returned instead of thrown.
 *
 * @throws Error if `uri` isn't a schema.
 * @throws An error from `@hyperjump/browser` if the document can't be
 * retrieved. Its `cause.code` says why.
 */
export function lint(config: JsonSchemaConfig, uri: string, options?: SessionOptions & LintOptions): Promise<SchemaMessage[]>;

export type LintOptions = {
  /**
   * The lint plugins, in the shape of `.hyperjumprc`'s: rules and presets,
   * each optionally with its config (`[recommended, [rule, ["error"]]]`).
   * The default is `lint/recommended`.
   */
  plugins?: PluggableList;
};
