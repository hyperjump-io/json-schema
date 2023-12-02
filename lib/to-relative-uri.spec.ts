import { resolveIri } from "@hyperjump/uri";
import { describe, expect, test } from "vitest";
import { toRelativeIri } from "./common.js";


describe("toRelativeIri", () => {
  test.each([
    ["https://example.com", "https://example.com/var/lib", "/var/lib"],
    ["https://example.com/z", "https://example.com/var/lib", "var/lib"],
    ["https://example.com/a", "https://example.com/a/var/lib", "a/var/lib"],
    ["https://example.com/a/", "https://example.com/a/var/lib", "var/lib"],
    ["https://example.com/foo/test", "https://example.com/foo/test/bar/package.json", "test/bar/package.json"],
    ["https://example.com/var/lib", "https://example.com/var", "../var"],
    ["https://example.com/var/lib", "https://example.com/bin", "../bin"],
    ["https://example.com/var/lib", "https://example.com/var/lib", ""],
    ["https://example.com/var/lib", "https://example.com/var/apache", "apache"],
    ["https://example.com/Users/a/web/b/test/mails", "https://example.com/Users/a/web/b", "../../b"],
    ["https://example.com/foo/bar/baz-quux", "https://example.com/foo/bar/baz", "baz"],
    ["https://example.com/foo/bar/baz", "https://example.com/foo/bar/baz-quux", "baz-quux"],
    ["https://example.com/baz-quux", "https://example.com/baz", "baz"],
    ["https://example.com/baz", "https://example.com/baz-quux", "baz-quux"],
    ["https://example.com/page1/page2/foo", "https://example.com/", "../../"]
  ])("toRelativeIri(%s, %s) => %s", (from, to, expected) => {
    const relative = toRelativeIri(from, to);
    expect(relative).to.equal(expected);
    expect(resolveIri(relative, from)).to.equal(to); // sanity check
  });
});
