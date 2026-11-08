import { describe, test, expect } from "vitest";
import { multipleOf } from "./fast.js";

describe("multipleOf", () => {
  test.for(/** @type [number, number, boolean][] */ ([
    // Integers
    [10, 2, true],
    [-7, 2, false],
    [0, 0.1, true],

    // Decimals floating point can't represent
    [0.3, 0.1, true],
    [0.7, 0.1, true],
    [19.99, 0.01, true],
    [123.456, 0.01, false],
    [-0.6, 0.2, true],

    // Small divisors
    [3e-9, 1e-9, true],
    [1e-9, 3e-9, false],
    [1.5e-8, 1e-8, false],
    [12391239123, 1e-8, true],

    // Values much smaller than the divisor
    [1e-20, 1, false],
    [5e-324, 0.5, false],

    // Large values
    [1e16, 3.3, false],
    [1e17, 0.3, false],
    [1e20, 3, false],
    [1e20, 4, true],
    [2 ** 60, 3, false],
    [123456789.1, 0.1, true],

    // Quotients that overflow
    [1e300, 1e-10, true],
    [1.7976931348623157e308, 1e-300, true]
  ]))("%d is a multiple of %d: %s", ([value, divisor, expected]) => {
    expect(multipleOf(divisor)(value)).to.equal(expected);
  });
});
