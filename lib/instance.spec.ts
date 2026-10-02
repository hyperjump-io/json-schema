import { describe, it, expect } from "vitest";
import * as Instance from "./instance.js";

import type { Json } from "@hyperjump/json-pointer";
import type { JsonNode } from "./instance.js";


type ComparableNode = Omit<JsonNode, "parent" | "root" | "offset" | "length" | "colonOffset" | "children"> & {
  children: ComparableNode[];
};

const comparable = (node: JsonNode): ComparableNode => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parent, root, offset, length, colonOffset, children, ...rest } = node;
  return { ...rest, children: children.map(comparable) };
};

const source = (json: string, node: JsonNode) => json.slice(node.offset, node.offset! + node.length!);

describe("Instance.fromJson", () => {
  const json = `{
  "foo": [1, -2.5e3, true, false, null],
  "bar": { "baz": "a\\"b\\u00e9" },
  "": {}
}`;

  it("builds the same AST as fromJs", () => {
    const uri = "https://example.com/instance";
    expect(comparable(Instance.fromJson(json, uri)))
      .to.eql(comparable(Instance.fromJs(JSON.parse(json) as Json, uri)));
  });

  it("sets parent and root", () => {
    const root = Instance.fromJson(json);
    const baz = Instance.get("#/bar/baz", root)!;
    expect(baz.root).to.equal(root);
    expect(baz.parent?.type).to.equal("property");
    expect(baz.parent?.parent).to.equal(Instance.get("#/bar", root));
  });

  it("records the location of each node", () => {
    const root = Instance.fromJson(json);
    expect(source(json, root)).to.equal(json);
    expect(source(json, Instance.get("#/foo", root)!)).to.equal("[1, -2.5e3, true, false, null]");
    expect(source(json, Instance.get("#/foo/1", root)!)).to.equal("-2.5e3");
    expect(source(json, Instance.get("#/foo/4", root)!)).to.equal("null");
    expect(source(json, Instance.get("#/bar", root)!)).to.equal(`{ "baz": "a\\"b\\u00e9" }`);
    expect(source(json, Instance.get("#/bar/baz", root)!)).to.equal(`"a\\"b\\u00e9"`);
    expect(source(json, Instance.get("#*/bar/baz", root)!)).to.equal(`"baz"`);
    expect(source(json, Instance.get("#/bar/baz", root)!.parent!)).to.equal(`"baz": "a\\"b\\u00e9"`);
    expect(source(json, Instance.get("#/", root)!)).to.equal("{}");
  });

  it("records the location of the colon in property nodes", () => {
    const text = `{ "a" : 1, "b":2 }`;
    const root = Instance.fromJson(text);
    expect(Instance.get("#/a", root)!.parent!.colonOffset).to.equal(6);
    expect(Instance.get("#/b", root)!.parent!.colonOffset).to.equal(14);
    expect(root.colonOffset).to.equal(undefined);
    expect(Instance.get("#/a", root)!.colonOffset).to.equal(undefined);
  });

  it("handles scalar documents with surrounding whitespace", () => {
    const node = Instance.fromJson("  \"foo\"\n");
    expect(node.type).to.equal("string");
    expect(Instance.value(node)).to.equal("foo");
    expect(node.offset).to.equal(2);
    expect(node.length).to.equal(5);
  });

  it("handles duplicate keys like JSON.parse", () => {
    const text = `{ "a": 1, "b": 2, "a": 3 }`;
    const node = Instance.fromJson(text);
    expect(Instance.value(node)).to.eql(JSON.parse(text));
    expect([...Instance.keys(node)].map(Instance.value)).to.eql(["a", "b"]);
    expect(Instance.value(Instance.step("a", node)!)).to.equal(3);
  });

  it("treats __proto__ as an ordinary property", () => {
    const node = Instance.fromJson(`{ "__proto__": { "polluted": true } }`);
    const value = Instance.value<Record<string, unknown>>(node);
    expect(Object.getPrototypeOf(value)).to.equal(Object.prototype);
    expect(Object.keys(value)).to.eql(["__proto__"]);
  });

  it.each([
    "",
    "{",
    "[1,]",
    "{\"a\":1,}",
    "{\"a\" 1}",
    "{a:1}",
    "01",
    "1.",
    "+1",
    ".5",
    "tru",
    "nul",
    "\"abc",
    "\"\t\"",
    "\"\\x\"",
    "[1 2]",
    "1 2",
    "// comment\n1",
    "\uFEFF1"
  ])("rejects invalid JSON: %j", (text) => {
    expect(() => JSON.parse(text) as unknown).to.throw(SyntaxError);
    expect(() => Instance.fromJson(text)).to.throw(SyntaxError);
  });

  it("reports the offset of syntax errors", () => {
    expect(() => Instance.fromJson("[1, 2,, 3]")).to.throw("at offset 6");
  });
});

describe.each([
  ["fromJs", (json: string, uri?: string) => Instance.fromJs(JSON.parse(json) as Json, uri)],
  ["fromJson", Instance.fromJson]
])("Instance.%s pointers", (_name, fromText) => {
  const json = `{ "foo": [1, { "a/b~c": true }], "": null }`;
  const pointers = (node: JsonNode) => [...Instance.allNodes(node)].map((node) => node.pointer);

  it("computes the pointer of every node", () => {
    expect(pointers(fromText(json))).to.eql(["", "/foo", "/foo/0", "/foo/1", "/foo/1/a~1b~0c", "/"]);
  });

  it("computes the pointer of property and property name nodes", () => {
    const node = Instance.get("#/foo/1/a~1b~0c", fromText(json))!;
    expect(node.parent!.pointer).to.equal("/foo/1/a~1b~0c");
    expect(node.parent!.children[0].pointer).to.equal("*/foo/1/a~1b~0c");
  });

  it("computes the same pointers regardless of access order", () => {
    const node = fromText(json);
    const item = Instance.get("#/foo/1", node)!;
    expect(Instance.uri(item)).to.equal("#/foo/1");
    expect(pointers(node)).to.eql(pointers(fromText(json)));
  });

  it("includes the base URI", () => {
    const node = fromText(json, "https://example.com/instance#foo");
    expect(Instance.uri(Instance.get("#/foo/1", node)!)).to.equal("https://example.com/instance#/foo/1");
  });

  it("creates annotations on first use", () => {
    const node = fromText(json);
    expect(node.annotations).to.eql({});
    node.annotations.foo = [1];
    expect(node.annotations).to.eql({ foo: [1] });
  });
});

describe("Instance.fromJson duplicate keys", () => {
  it("keeps the last value when duplicates have different types", () => {
    const text = `{ "a": [1, { "b": 2 }], "c": 0, "a": { "d": [3] } }`;
    const node = Instance.fromJson(text);
    expect(Instance.value(node)).to.eql(JSON.parse(text));
    expect([...Instance.keys(node)].map(Instance.value)).to.eql(["a", "c"]);
    expect(Instance.value(Instance.get("#/a/d/0", node)!)).to.equal(3);
    expect(Instance.get("#/a/d/0", node)!.pointer).to.equal("/a/d/0");
  });

  it("matches property names to values when JS reorders integer-like keys", () => {
    const text = `{ "b": "x", "1": "y", "a\\\\b": "z" }`;
    const node = Instance.fromJson(text);
    expect([...Instance.entries(node)].map(([key, value]) => [Instance.value(key), Instance.value(value)]))
      .to.eql([["b", "x"], ["1", "y"], ["a\\b", "z"]]);
  });
});

describe("Instance.fromJs", () => {
  it("doesn't include location data", () => {
    const node = Instance.fromJs({ foo: 42 });
    expect(node.offset).to.equal(undefined);
    expect(node.length).to.equal(undefined);
    expect(node.colonOffset).to.equal(undefined);
  });
});
