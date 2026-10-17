import type { Json } from "@hyperjump/browser/json";

/**
 * The definition of a format for the `format` keyword. A dialect maps format
 * names to these by URI. Like keywords, formats are stateless, so one
 * definition can be shared by every `JsonSchema` instance and every dialect.
 */
export type Format = {
  /**
   * Identifies the format independent of its name in any dialect. Use a
   * domain you control to avoid conflicts.
   */
  uri: string;

  /**
   * Whether a value is valid. It's called for every type of value. The
   * formats JSON Schema defines only apply to strings, so other values are
   * valid.
   */
  validate: (value: Json) => boolean;
};
