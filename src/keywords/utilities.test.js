import { describe, test, expect } from "vitest";
import { codePointLength, codePointLengthIsWithin } from "./utilities.js";

describe("codePointLengthIsWithin", () => {
  test("counts a code point outside the BMP once", () => {
    expect(codePointLengthIsWithin("💩💩", 2, 2)).to.equal(true);
    expect(codePointLengthIsWithin("💩💩", 3, Infinity)).to.equal(false);
    expect(codePointLengthIsWithin("💩💩", 0, 1)).to.equal(false);
  });

  test("decides by code units when the bounds allow", () => {
    expect(codePointLengthIsWithin("", 0, Infinity)).to.equal(true);
    expect(codePointLengthIsWithin("", 1, Infinity)).to.equal(false);
    expect(codePointLengthIsWithin("abc", 0, 3)).to.equal(true);
    expect(codePointLengthIsWithin("abcd", 0, 1)).to.equal(false);
  });

  test("agrees with codePointLength", () => {
    const pieces = ["a", "é", "💩", "\uD800", "\uDC00"];
    /** @type string[] */
    const strings = [""];
    for (let index = 0; index < 4; index++) {
      for (const string of [...strings]) {
        for (const piece of pieces) {
          strings.push(string + piece);
        }
      }
    }
    for (const string of strings) {
      const length = codePointLength(string);
      for (let min = 0; min <= 9; min++) {
        for (const max of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, Infinity]) {
          expect(codePointLengthIsWithin(string, min, max), `${JSON.stringify(string)} ${min}..${max}`).to.equal(length >= min && length <= max);
        }
      }
    }
  });
});
