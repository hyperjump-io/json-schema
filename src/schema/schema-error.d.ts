import type { Point, Position } from "unist";
import type { toVFileMessage } from "../output/validation-error.d.ts";

/**
 * A problem with a schema document. It's plain data, like a validation
 * error, so it can be collected and passed around. Use
 * {@link toVFileMessage} to report it with unified tooling.
 */
export type SchemaMessage = {
  /** `"json"` for a syntax error and `"json-schema"` for a schema problem */
  source: string;

  /**
   * What kind of problem it is. A problem with a keyword's value has the
   * keyword's URI.
   */
  ruleId: string;

  /**
   * A schema with an error can't be used. Every schema problem is an error.
   * They're named like lint rules' severities.
   */
  severity: "error" | "warn";

  /** The URI of the document it's in */
  uri: string;

  /** Where it is in the document's text */
  place?: Point | Position;

  /** A description of the problem for people */
  message: string;

  /** What caused it, such as why a dialect couldn't be found */
  cause?: unknown;
};

/**
 * A schema can't be used because of problems in a document it needs. It has
 * every problem in that document, not only the first.
 */
export class SchemaError extends Error {
  /** Syntax errors first, then schema problems */
  messages: SchemaMessage[];

  constructor(messages: SchemaMessage[]);
}
