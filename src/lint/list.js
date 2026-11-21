/**
 * Names, like "'a', 'b', and 'c'"
 *
 * @type (names: string[]) => string
 */
export const list = (names) => names.length < 3
  ? names.join(" and ")
  : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
