import type { JsonType, ReadonlyJson } from "@hyperjump/browser";

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
   * The types of value the format applies to. A value of any other type is
   * valid without calling `validate`, as the spec says. Leave it out for a
   * format that applies to every type. There's no `integer`, because a
   * format applies to types in JSON's data model. A format for integers
   * applies to numbers. The formats JSON Schema defines apply to strings.
   */
  types?: JsonType[];

  /**
   * Whether a value is valid. It's only called for a value whose type is in
   * `types`. The value can be the instance being validated, so don't change
   * it.
   */
  validate: (value: ReadonlyJson) => boolean;
};
