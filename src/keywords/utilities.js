/**
 * @import { InstanceOps } from "../keyword.d.ts"
 */

/**
 * Whether two instances are equal, comparing objects without regard to
 * property order. Each is looked at through its own instance operations, so
 * an instance can be compared to a plain value (`jsInstance`) and an AST
 * isn't copied.
 *
 * Whether a value that couldn't be parsed is equal to anything is unknown.
 * `unparsed` is the result for one. Keywords pass whichever result makes
 * them pass, so the syntax error is the only error reported for it.
 *
 * @template A
 * @template B
 * @param {InstanceOps<A>} aOps
 * @param {A} a
 * @param {InstanceOps<B>} bOps
 * @param {B} b
 * @param {boolean} unparsed
 * @returns {boolean}
 */
export const instanceEqual = (aOps, a, bOps, b, unparsed) => {
  const aType = aOps.typeOf(a);
  const bType = bOps.typeOf(b);
  if (aType === undefined || bType === undefined) {
    return unparsed;
  } else if (aType !== bType) {
    return false;
  }

  switch (aType) {
    case "array": {
      if (aOps.length(a) !== bOps.length(b)) {
        return false;
      }

      let index = 0;
      for (const aItem of aOps.items(a)) {
        const bItem = /** @type B */ (bOps.get(b, index++));
        if (!instanceEqual(aOps, aItem, bOps, bItem, unparsed)) {
          return false;
        }
      }

      return true;
    }
    case "object": {
      if (aOps.length(a) !== bOps.length(b)) {
        return false;
      }

      for (const [name, aValue] of aOps.entries(a)) {
        if (!bOps.has(b, name)) {
          return false;
        }

        const bValue = /** @type B */ (bOps.get(b, name));
        if (!instanceEqual(aOps, aValue, bOps, bValue, unparsed)) {
          return false;
        }
      }

      return true;
    }
    default:
      return aOps.value(a) === bOps.value(b);
  }
};

/**
 * The length of a string in code points, which is how JSON Schema counts
 * string length
 *
 * @type (value: string) => number
 */
export const codePointLength = (value) => {
  let length = 0;
  for (let index = 0; index < value.length; index++) {
    // A code point outside the BMP takes two code units
    if (/** @type number */ (value.codePointAt(index)) > 0xFFFF) {
      index++;
    }
    length++;
  }

  return length;
};
