import { describe, test, expect } from "vitest";
import { fromJson } from "@hyperjump/browser";
import { assertIri, assertIriReference } from "@hyperjump/uri";
import { iriPlace, iriProblem, noUrl } from "./identifiers.js";

/** @type (text: string) => import("unist").Node */
const stringNode = (text) => /** @type any */ (fromJson(text, noUrl).document.children[0]);

/** @type (check: (value: string) => void, value: string) => unknown */
const errorOf = (check, value) => {
  try {
    check(value);
  } catch (error) {
    return error;
  }
};

describe("iriProblem", () => {
  test("is what's wrong, without the rule and the value", () => {
    expect(iriProblem(errorOf(assertIriReference, "http://ex ample.com/"))).to.equal(`" " isn't allowed in a host, at 9`);
  });

  test("is the message of an error that isn't an InvalidIriError", () => {
    expect(iriProblem(Error("no base"))).to.equal("no base");
  });
});

describe("iriPlace", () => {
  test("is the characters that are wrong", () => {
    const node = stringNode(`"http://ex ample.com/"`);

    expect(iriPlace(node, errorOf(assertIriReference, "http://ex ample.com/"))).to.eql({
      start: { line: 1, column: 11, offset: 10 },
      end: { line: 1, column: 12, offset: 11 }
    });
  });

  test("counts UTF-16 code units, like positions", () => {
    const node = stringNode(`"http://😀.com/a b"`);

    expect(iriPlace(node, errorOf(assertIri, "http://😀.com/a b"))).to.eql({
      start: { line: 1, column: 17, offset: 16 },
      end: { line: 1, column: 18, offset: 17 }
    });
  });

  test("is the whole string if it has escapes", () => {
    const node = stringNode(`"http://ex\\u0020ample.com/"`);

    expect(iriPlace(node, errorOf(assertIriReference, "http://ex ample.com/"))).to.equal(node.position);
  });

  test("is the whole string if what's wrong is missing, like a scheme", () => {
    const node = stringNode(`"ab"`);

    expect(iriPlace(node, errorOf(assertIri, "ab"))).to.equal(node.position);
  });

  test("is the whole string if the error is about a different value", () => {
    const node = stringNode(`"a b"`);

    expect(iriPlace(node, errorOf(assertIriReference, "c d"))).to.equal(node.position);
  });

  test("is the whole string for an error that isn't an InvalidIriError", () => {
    const node = stringNode(`"a"`);

    expect(iriPlace(node, Error("no base"))).to.equal(node.position);
  });
});
