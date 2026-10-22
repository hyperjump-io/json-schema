import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { VFileMessage } from "vfile-message";
import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { fromJson, pointerGet } from "@hyperjump/browser/json";
import { JsonSchema, outputErrorMessage, toVFileMessage } from "../json-schema.js";
import idKeyword from "../keywords/id.js";
import anchorKeyword from "../keywords/anchor.js";
import dynamicAnchorKeyword from "../keywords/dynamicAnchor.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { CompileContext, Keyword } from "../keyword.d.ts"
 * @import { EvaluationLocation, EvaluationPlugin } from "./evaluation-plugin.d.ts"
 * @import { DetailedValidationError, ValidationError } from "../output/validation-error.d.ts"
 */

const dialectUri = "https://example.com/dialect";

/** @type (node: any) => [string, any][] */
const propertiesOf = (node) => node.children.map((/** @type any */ property) => [property.children[0].value, property.children[1]]);

/** @type (node: any) => any[] */
const itemsOf = (node) => node.children;

/** @type (node: any) => string */
const stringOf = (node) => node.value;

/** @type (valueNode: any, context: CompileContext) => Promise<string[]> */
const compileSchemas = async (valueNode, context) => {
  const handles = [];
  for (const schemaNode of itemsOf(valueNode)) {
    handles.push(await context.compileSchema(schemaNode));
  }
  return handles;
};

/** @type Keyword<string> */
const typeKeyword = {
  uri: "https://example.com/keyword/type",
  shape: "data",
  evaluate: (type, { instance }) => (value) => instance.typeOf(value) === type
};

/** @type Keyword<number> */
const minimumKeyword = {
  uri: "https://example.com/keyword/minimum",
  shape: "data",
  evaluate: (minimum, { instance }) => (value) => {
    return instance.typeOf(value) !== "number" || /** @type number */ (instance.value(value)) >= minimum;
  }
};

/** @type Keyword<string> */
const titleKeyword = {
  uri: "https://example.com/keyword/title",
  shape: "data",
  evaluate(title, { annotate }) {
    if (annotate === undefined) {
      return;
    }

    return () => {
      annotate(title);
      return true;
    };
  }
};

/** @type Keyword<Record<string, string>> */
const propertiesKeyword = {
  uri: "https://example.com/keyword/properties",
  shape: { map: "schema" },
  async compile(valueNode, context) {
    /** @type Record<string, string> */
    const properties = {};
    for (const [name, schemaNode] of propertiesOf(valueNode)) {
      properties[name] = await context.compileSchema(schemaNode);
    }
    return properties;
  },
  evaluate(properties, context) {
    const evaluators = Object.entries(properties).map(([name, handle]) => /** @type const */ ([name, context.schema(handle)]));
    return (value) => {
      if (context.instance.typeOf(value) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, evaluate] of evaluators) {
        const property = context.instance.get(value, name);
        if (property === undefined) {
          continue;
        }

        if (evaluate(property, name)) {
          context.markEvaluated?.(name);
        } else {
          valid = false;
          if (!context.exhaustive) {
            return false;
          }
        }
      }

      return valid;
    };
  },
  simpleApplicator: true
};

/** @type Keyword<string[]> */
const allOfKeyword = {
  uri: "https://example.com/keyword/allOf",
  shape: { array: "schema" },
  compile: compileSchemas,
  evaluate(handles, context) {
    const evaluators = handles.map(context.schema);
    return (value) => {
      let valid = true;
      for (const evaluate of evaluators) {
        if (!evaluate(value)) {
          valid = false;
          if (!context.exhaustive) {
            return false;
          }
        }
      }
      return valid;
    };
  },
  simpleApplicator: true
};

/** @type Keyword<string[]> */
const anyOfKeyword = {
  uri: "https://example.com/keyword/anyOf",
  shape: { array: "schema" },
  compile: compileSchemas,
  evaluate(handles, context) {
    const evaluators = handles.map(context.schema);
    const evaluateAll = context.exhaustive || context.markEvaluated !== undefined;
    return (value) => {
      let valid = false;
      for (const evaluate of evaluators) {
        if (evaluate(value)) {
          valid = true;
          if (!evaluateAll) {
            return true;
          }
        }
      }
      return valid;
    };
  }
};

/** @type Keyword<string> */
const refKeyword = {
  uri: "https://example.com/keyword/ref",
  shape: "data",
  compile(valueNode, context) {
    return context.compileSchema(resolveIri(stringOf(valueNode), toAbsoluteIri(context.schemaNode.location)));
  },
  evaluate: (handle, context) => context.schema(handle),
  simpleApplicator: true
};

/** @type Keyword<{ name: string; handle: string }> */
const dynamicRefKeyword = {
  uri: "https://example.com/keyword/dynamicRef",
  shape: "data",
  async compile(valueNode, context) {
    const uri = resolveIri(stringOf(valueNode), toAbsoluteIri(context.schemaNode.location));
    const name = uri.slice(uri.indexOf("#") + 1);
    return { name, handle: await context.compileSchema(uri) };
  },
  evaluate({ name, handle }, context) {
    const lexical = context.schema(handle);
    const dynamicAnchor = /** @type NonNullable<typeof context.dynamicAnchor> */ (context.dynamicAnchor);
    return (value) => (dynamicAnchor(name) ?? lexical)(value);
  },
  reads: ["dynamicScope"],
  simpleApplicator: true
};

/** @type Keyword<{ if: string; then: string }> */
const ifKeyword = {
  uri: "https://example.com/keyword/if",
  shape: "schema",
  async compile(valueNode, context) {
    const schemaNode = /** @type any */ (context.schemaNode);
    const thenProperty = schemaNode.children.find((/** @type any */ property) => property.children[0].value === "then");
    return {
      if: await context.compileSchema(valueNode),
      then: await context.compileSchema(thenProperty.children[1])
    };
  },
  evaluate(compiled, context) {
    const evaluateIf = context.schema(compiled.if);
    const evaluateThen = context.schema(compiled.then);
    return (value) => !evaluateIf(value) || evaluateThen(value);
  },
  simpleApplicator: true
};

/** @type Keyword<string> */
const unevaluatedPropertiesKeyword = {
  uri: "https://example.com/keyword/unevaluatedProperties",
  shape: "schema",
  compile: (valueNode, context) => context.compileSchema(valueNode),
  evaluate(handle, context) {
    const evaluate = context.schema(handle);
    const evaluated = /** @type NonNullable<typeof context.evaluated> */ (context.evaluated);
    return (value) => {
      if (context.instance.typeOf(value) !== "object") {
        return true;
      }

      let valid = true;
      for (const [name, property] of context.instance.entries(value)) {
        if (evaluated().has(name)) {
          continue;
        }

        if (evaluate(property, name)) {
          context.markEvaluated?.(name);
        } else {
          valid = false;
        }
      }
      return valid;
    };
  },
  reads: ["evaluated"]
};

/** @type Keyword[] */
const keywords = [
  idKeyword, anchorKeyword, dynamicAnchorKeyword, typeKeyword, minimumKeyword, titleKeyword, propertiesKeyword,
  allOfKeyword, anyOfKeyword, refKeyword, dynamicRefKeyword, unevaluatedPropertiesKeyword, ifKeyword,
  { uri: "https://example.com/keyword/defs", shape: { map: "schema" } },
  { uri: "https://example.com/keyword/then", shape: "schema" }
];

/** @type (jsonSchema: JsonSchema) => void */
const addTestDialect = (jsonSchema) => {
  for (const keyword of keywords) {
    jsonSchema.addKeyword(keyword);
  }

  jsonSchema.addDialect({
    uri: dialectUri,
    keywords: {
      $id: idKeyword.uri,
      $anchor: anchorKeyword.uri,
      $dynamicAnchor: dynamicAnchorKeyword.uri,
      $defs: "https://example.com/keyword/defs",
      $ref: refKeyword.uri,
      $dynamicRef: dynamicRefKeyword.uri,
      type: typeKeyword.uri,
      minimum: minimumKeyword.uri,
      title: titleKeyword.uri,
      properties: propertiesKeyword.uri,
      allOf: allOfKeyword.uri,
      anyOf: anyOfKeyword.uri,
      if: ifKeyword.uri,
      then: "https://example.com/keyword/then",
      unevaluatedProperties: unevaluatedPropertiesKeyword.uri
    },
    unknownKeywords: "annotation"
  });
};

/** @type (error: ValidationError) => Record<string, string> */
const locations = (error) => ({
  ruleId: error.ruleId,
  absoluteKeywordLocation: error.absoluteKeywordLocation,
  instanceLocation: error.instanceLocation
});

/** @type (error: DetailedValidationError) => unknown */
const detailedLocations = (error) => error.errors
  ? { ...locations(error), errors: error.errors.map(detailedLocations) }
  : locations(error);

describe("Validator", () => {
  /** @type JsonSchema */
  let jsonSchema;

  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: dialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  beforeEach(() => {
    jsonSchema = new JsonSchema({ allowRetrieval: () => true });
    addTestDialect(jsonSchema);
  });

  describe("validate", () => {
    test("keywords", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        type: "object",
        properties: { foo: { type: "number", minimum: 3 } }
      }));

      expect(validator.validate({ foo: 3 })).to.equal(true);
      expect(validator.validate({ foo: 2 })).to.equal(false);
      expect(validator.validate({ foo: "3" })).to.equal(false);
      expect(validator.validate([])).to.equal(false);
    });

    test("keywords that always pass", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        title: "foo",
        properties: { foo: { title: "bar" }, bar: { title: "baz", type: "number" } }
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: "1" })).to.equal(false);
      expect(validator.validateJson(`{ "foo": 1, "bar": "1" }`)).to.equal(false);
    });

    test("boolean schemas", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: false, bar: true } }));

      expect(validator.validate({ bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1 })).to.equal(false);
    });

    test("schemas that refer to each other", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/tree",
        type: "object",
        properties: { child: { $ref: "#" }, value: { type: "number" } }
      }));

      expect(validator.validate({ value: 1, child: { value: 2, child: {} } })).to.equal(true);
      expect(validator.validate({ value: 1, child: { child: { value: "2" } } })).to.equal(false);
    });

    test("a schema that doesn't exist", async () => {
      const uri = await schemaFile({});
      await expect(jsonSchema.compile(`${uri}#/nope`)).rejects.toThrow();
    });

    test("the shortcut", async () => {
      const uri = await schemaFile({ type: "string" });
      expect(await jsonSchema.validate(uri, "foo")).to.equal(true);
    });
  });

  describe("output formats", () => {
    test("BASIC", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/basic",
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number", minimum: 3 } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "BASIC" });

      expect(result.valid).to.equal(false);
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/basic#/$defs/number/type",
          instanceLocation: "/foo"
        }
      ]);
      expect(result.errors[0]).to.eql({
        source: "json-schema",
        ruleId: typeKeyword.uri,
        absoluteKeywordLocation: "https://example.com/basic#/$defs/number/type",
        instanceLocation: "/foo",
        place: undefined
      });
    });

    test("the absolute keyword location of a subschema with its own identifier", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $id: "https://example.com/embedded", type: "number" } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/embedded#/type",
          instanceLocation: "/foo"
        }
      ]);
    });

    test("the absolute keyword location of a subschema in a sibling keyword", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/sibling",
        if: { type: "string" },
        then: { minimum: 3, allOf: [{ $id: "https://example.com/sibling-embedded", type: "number" }] }
      }));

      const result = validator.validate("foo", { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/sibling-embedded#/type",
          instanceLocation: ""
        }
      ]);
    });

    test("locations with characters that aren't allowed in a fragment", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/encoded",
        properties: { "a^b": { $ref: "#/$defs/c%20d" } },
        $defs: { "c d": { type: "number" } }
      }));

      const result = validator.validate({ "a^b": "x" }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/encoded#/$defs/c%20d/type",
          instanceLocation: "/a^b"
        }
      ]);
    });

    test("an error is described by its instance location and absolute keyword location", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/message",
        properties: { foo: { type: "number" } }
      }));

      const [error] = validator.validate({ foo: "bar" }, { output: "BASIC" }).errors;
      expect(outputErrorMessage(error)).to.equal("'/foo' fails the constraint at 'https://example.com/message#/properties/foo/type'");
    });

    test("an error for the whole instance is described as the instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/root-message", type: "number" }));

      const [error] = validator.validate("foo", { output: "BASIC" }).errors;
      expect(outputErrorMessage(error)).to.equal("The instance fails the constraint at 'https://example.com/root-message#/type'");
    });

    test("an error converts to a VFileMessage and leaves stackTraceLimit as it was", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ $id: "https://example.com/vfile", type: "number" }));
      const stackTraceLimit = Error.stackTraceLimit;

      const [error] = validator.validate("foo", { output: "BASIC" }).errors;
      const message = toVFileMessage(error);
      expect(message).to.be.instanceOf(VFileMessage);
      expect(message.reason).to.equal("The instance fails the constraint at 'https://example.com/vfile#/type'");
      expect(message.ruleId).to.equal(typeKeyword.uri);
      expect(message.source).to.equal("json-schema");
      expect(Error.stackTraceLimit).to.equal(stackTraceLimit);
    });

    test("BASIC for a valid instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ type: "number" }));

      expect(validator.validate(1, { output: "BASIC" })).to.eql({ valid: true, errors: [] });
    });

    test("BASIC drops errors from subschemas that don't matter", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/any-of",
        anyOf: [{ type: "number" }, { type: "string" }],
        properties: { foo: false }
      }));

      expect(validator.validate("foo", { output: "BASIC" })).to.eql({ valid: true, errors: [] });

      const result = validator.validate({ foo: 1 }, { output: "BASIC" });
      expect(result.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: anyOfKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf",
          instanceLocation: ""
        },
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf/0/type",
          instanceLocation: ""
        },
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/any-of#/anyOf/1/type",
          instanceLocation: ""
        },
        {
          ruleId: "https://json-schema.org/validation",
          absoluteKeywordLocation: "https://example.com/any-of#/properties/foo",
          instanceLocation: "/foo"
        }
      ]);
    });

    test("DETAILED", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/detailed",
        properties: { foo: { type: "number" } }
      }));

      const result = validator.validate({ foo: "bar" }, { output: "DETAILED" });
      expect(result.errors.map((error) => detailedLocations(/** @type DetailedValidationError */ (error)))).to.eql([
        {
          ruleId: propertiesKeyword.uri,
          absoluteKeywordLocation: "https://example.com/detailed#/properties",
          instanceLocation: "",
          errors: [
            {
              ruleId: typeKeyword.uri,
              absoluteKeywordLocation: "https://example.com/detailed#/properties/foo/type",
              instanceLocation: "/foo"
            }
          ]
        }
      ]);
    });

    test("a custom output format", async () => {
      jsonSchema.addOutputFormat(/** @type any */ ("COUNT"), () => {
        let count = 0;
        return {
          plugin: { afterKeyword: (_keyword, _at, valid) => count += valid ? 0 : 1 },
          output: () => /** @type any */ (count)
        };
      });
      const validator = await jsonSchema.compile(await schemaFile({ type: "number", minimum: 3 }));

      expect(validator.validate("foo", { output: /** @type any */ ("COUNT") })).to.equal(1);
      expect(validator.validate(1, { output: /** @type any */ ("COUNT") })).to.equal(1);
      expect(validator.validate(5, { output: /** @type any */ ("COUNT") })).to.equal(0);
    });

    test("FLAG can't be replaced", () => {
      expect(() => jsonSchema.addOutputFormat("FLAG", () => ({ output: () => true }))).to.throw("built in");
    });

    test("an unknown output format", async () => {
      const validator = await jsonSchema.compile(await schemaFile({}));
      expect(() => validator.validate(1, { output: /** @type any */ ("NOPE") })).to.throw("isn't supported");
    });
  });

  describe("validateJson", () => {
    test("instance locations of names that are encoded in node locations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { "a/b": { properties: { "c~d": { properties: { "%41 é": { type: "number" } } } } } }
      }));

      const result = validator.validateJson(`{ "a/b": { "c~d": { "%41 é": "x" } } }`, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).instanceLocation)).to.eql(["/a~1b/c~0d/%41 é"]);
    });

    test("instance locations are relative to the node evaluation starts from", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { bar: { type: "number" } } }));
      const document = fromJson(`{ "foo": { "bar": "x" } }`, "https://example.com/document");
      const node = /** @type any */ (document.node).children[0].children[1];

      const result = validator.validateNode(node, { output: "BASIC" });
      expect(result.errors.map((error) => /** @type ValidationError */ (error).instanceLocation)).to.eql(["/bar"]);
    });

    test("errors have positions", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      const result = validator.validateJson(`{\n  "foo": "bar"\n}`, { output: "BASIC" });
      expect(result.valid).to.equal(false);
      expect(result.errors[0].place).to.eql({
        start: { line: 2, column: 10, offset: 11 },
        end: { line: 2, column: 15, offset: 16 }
      });
    });

    test("an error with a position is described without its instance location", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/positioned",
        properties: { foo: { type: "number" } }
      }));

      const [error] = validator.validateJson(`{ "foo": "bar" }`, { output: "BASIC" }).errors;
      expect(String(toVFileMessage(error))).to.equal("1:10-1:15: Fails the constraint at 'https://example.com/positioned#/properties/foo/type'");
    });

    test("a syntax error converts to a VFileMessage", async () => {
      const validator = await jsonSchema.compile(await schemaFile({}));

      const [error] = validator.validateJson(`[True]`, { output: "BASIC" }).errors;
      const message = toVFileMessage(error);
      expect(String(message)).to.equal("1:2-1:6: 'True' is not a valid value");
      expect(message.ruleId).to.equal("invalid-literal");
      expect(message.source).to.equal("json");
      expect(message.actual).to.equal("True");
    });

    test("syntax errors are included and make the instance invalid", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      expect(validator.validateJson(`{ "foo": 1, }`)).to.equal(false);

      const result = validator.validateJson(`{ "bar": 1, "foo": "x", }`, { output: "BASIC" });
      expect(result.errors.map((error) => error.ruleId)).to.eql([typeKeyword.uri, "trailing-comma"]);
    });

    test("values that couldn't be parsed aren't evaluated", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      const result = validator.validateJson(`{ "foo": }`, { output: "BASIC" });
      expect(result.errors.map((error) => error.ruleId)).to.eql(["value-expected"]);
    });
  });

  describe("annotate", () => {
    test("annotations are attached to the instance", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        title: "root",
        properties: { foo: { title: "foo", allOf: [{ title: "also foo" }] } }
      }));

      const { output, node } = validator.annotate({ foo: 1 });
      expect(output).to.equal(true);
      expect(node.data?.annotations?.get(titleKeyword.uri)).to.eql(["root"]);
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo", "also foo"]);
    });

    test("annotations from failing schemas are dropped", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [{ title: "number", type: "number" }, { title: "string", type: "string" }]
      }));

      const { node } = validator.annotate("foo");
      expect(node.data?.annotations?.get(titleKeyword.uri)).to.eql(["string"]);
    });

    test("an invalid instance has no annotations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ title: "root", type: "number" }));

      const { output, node } = validator.annotate("foo", { output: "BASIC" });
      expect(output.valid).to.equal(false);
      expect(node.data?.annotations).to.equal(undefined);
    });

    test("unknown keywords are annotations", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ foo: { bar: 1 } }));

      const { node } = validator.annotate(1);
      expect(node.data?.annotations?.get("https://json-schema.org/keyword/unknown#foo")).to.eql([{ bar: 1 }]);
    });

    test("x- keywords are annotations if unknown keywords are errors", async () => {
      for (const unknownKeywords of /** @type const */ (["error", "ignore"])) {
        const strictDialectUri = `https://example.com/${unknownKeywords}-dialect`;
        jsonSchema.addDialect({ uri: strictDialectUri, keywords: {}, unknownKeywords });
        const path = join(directory, `${fileCount++}.schema.json`);
        await writeFile(path, JSON.stringify({ "$schema": strictDialectUri, "x-foo": 1 }));
        const validator = await jsonSchema.compile(pathToFileURL(path).toString());

        const { node } = validator.annotate(1);
        const annotations = node.data?.annotations?.get("https://json-schema.org/keyword/unknown#x-foo");
        expect(annotations).to.eql(unknownKeywords === "error" ? [1] : undefined);
      }
    });

    test("annotateJson", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { title: "foo" } } }));

      const { output, status, node } = validator.annotateJson(`{ "foo": 1, }`);
      expect(output).to.equal(false);
      expect(status).to.equal("recovered");
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo"]);
    });

    test("annotateNode", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { title: "foo" } } }));
      const { node } = fromJson(`{ "foo": 1 }`);

      expect(validator.annotateNode(node)).to.equal(true);
      expect(pointerGet("/foo", /** @type any */ (node)).data.annotations.get(titleKeyword.uri)).to.eql(["foo"]);
    });
  });

  describe("unevaluatedProperties", () => {
    test("properties evaluated by subschemas", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        allOf: [{ properties: { foo: true } }],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: 2 })).to.equal(false);
    });

    test("keyword order doesn't matter", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        unevaluatedProperties: false,
        properties: { foo: true }
      }));

      expect(validator.validate({ foo: 1 })).to.equal(true);
    });

    test("properties evaluated by a failing subschema don't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [
          { properties: { foo: true, bar: { type: "number" } } },
          { properties: { foo: true } }
        ],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
      expect(validator.validate({ foo: 1, bar: "x" })).to.equal(false);
    });

    test("every passing branch counts", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        anyOf: [{ properties: { foo: true } }, { properties: { bar: true } }],
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: 1, bar: 1 })).to.equal(true);
    });

    test("properties of a property don't count", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { properties: { bar: true } } },
        unevaluatedProperties: false
      }));

      expect(validator.validate({ foo: { bar: 1 } })).to.equal(true);
      expect(validator.validate({ foo: {}, bar: 1 })).to.equal(false);
    });
  });

  describe("dynamic scope", () => {
    test("the outermost dynamic anchor is used", async () => {
      const uri = await schemaFile({
        $id: "https://example.com/strict-tree",
        $dynamicAnchor: "node",
        $ref: "tree",
        unevaluatedProperties: false,
        $defs: {
          tree: {
            $id: "https://example.com/tree",
            $dynamicAnchor: "node",
            properties: { children: { $ref: "#/$defs/children" } },
            $defs: { children: { anyOf: [{ type: "null" }, { properties: { child: { $dynamicRef: "#node" } } }] } }
          }
        }
      });

      const strictTree = await jsonSchema.compile(uri);
      expect(strictTree.validate({ children: { child: {} } })).to.equal(true);
      expect(strictTree.validate({ children: { child: { extra: 1 } } })).to.equal(false);

      const tree = await jsonSchema.compile(`${uri}#/$defs/tree`);
      expect(tree.validate({ children: { child: { extra: 1 } } })).to.equal(true);
    });
  });

  describe("plugins", () => {
    test("state is passed explicitly", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/plugin",
        properties: { foo: { type: "number" } }
      }));

      /** @type string[] */
      const calls = [];
      /** @type EvaluationPlugin<string, string> */
      const plugin = {
        beforeSchema: (schema, at, parent) => {
          calls.push(`beforeSchema ${schema.absoluteKeywordLocation} ${at.instanceLocation} ${parent}`);
          return `schema ${at.instanceLocation}`;
        },
        afterSchema: (_schema, _at, valid, state) => calls.push(`afterSchema ${state} ${valid}`),
        beforeKeyword: (keyword, _at, schema) => {
          calls.push(`beforeKeyword ${keyword.keywordUri} in ${schema}`);
          return `keyword ${keyword.absoluteKeywordLocation.replace(/.*#/, "")}`;
        },
        afterKeyword: (_keyword, _at, valid, state) => calls.push(`afterKeyword ${state} ${valid}`)
      };

      expect(validator.validate({ foo: 1 }, { plugins: [plugin] })).to.equal(true);
      expect(calls).to.eql([
        "beforeSchema https://example.com/plugin#  undefined",
        `beforeKeyword ${propertiesKeyword.uri} in schema `,
        "beforeSchema https://example.com/plugin#/properties/foo /foo keyword /properties",
        `beforeKeyword ${typeKeyword.uri} in schema /foo`,
        "afterKeyword keyword /properties/foo/type true",
        "afterSchema schema /foo true",
        "afterKeyword keyword /properties true",
        "afterSchema schema  true"
      ]);
    });

    test("each plugin gets its own state", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      /** @type (name: string, calls: string[]) => EvaluationPlugin<string, string> */
      const namedPlugin = (name, calls) => ({
        beforeSchema: (_schema, at, parent) => `${name} schema ${at.instanceLocation} in ${parent}`,
        afterSchema: (_schema, _at, _valid, state) => calls.push(state),
        beforeKeyword: (keyword, _at, schema) => `${name} keyword ${keyword.absoluteKeywordLocation.replace(/.*#/, "")} in ${schema}`,
        afterKeyword: (_keyword, _at, _valid, state) => calls.push(state)
      });

      /** @type string[] */
      const aCalls = [];
      /** @type string[] */
      const bCalls = [];
      const result = validator.validate({ foo: "bar" }, { output: "BASIC", plugins: [namedPlugin("a", aCalls), namedPlugin("b", bCalls)] });

      expect(result.errors.map((error) => error.ruleId)).to.eql([typeKeyword.uri]);
      expect(aCalls).to.eql([
        "a keyword /properties/foo/type in a schema /foo in a keyword /properties in a schema  in undefined",
        "a schema /foo in a keyword /properties in a schema  in undefined",
        "a keyword /properties in a schema  in undefined",
        "a schema  in undefined"
      ]);
      expect(bCalls).to.eql(aCalls.map((call) => call.replaceAll(/\ba /g, "b ")));
    });

    test("schemas and keywords evaluated on the same instance share a location that can be kept", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        properties: { foo: { $ref: "#/$defs/number" } },
        $defs: { number: { type: "number" } }
      }));

      /** @type EvaluationLocation[] */
      const locations = [];
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: (_keyword, at) => locations.push(at) };

      validator.validate({ foo: 1 }, { plugins: [plugin] });
      expect(locations.map((at) => at.instanceLocation)).to.eql(["/foo", "/foo", ""]);
      expect(locations[0]).to.equal(locations[1]);
      expect(locations[1]).not.to.equal(locations[2]);
    });

    test("a location's value is the instance, for a JS value or an AST", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));

      /** @type unknown[] */
      const values = [];
      /** @type EvaluationPlugin */
      const plugin = { afterSchema: (_schema, at) => values.push(at.value()) };

      validator.validate({ foo: 1 }, { plugins: [plugin] });
      validator.validateNode(fromJson(`{ "foo": 1 }`).node, { plugins: [plugin] });
      expect(values).to.eql([1, { foo: 1 }, 1, { foo: 1 }]);
    });

    test("plugins see keywords that always pass", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ title: "foo", type: "number" }));

      /** @type [string, boolean][] */
      const calls = [];
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: (keyword, _at, valid) => calls.push([keyword.keywordUri, valid]) };

      expect(validator.validate(1, { plugins: [plugin] })).to.equal(true);
      expect(calls).to.eql([[titleKeyword.uri, true], [typeKeyword.uri, true]]);
    });

    test("plugins see every keyword once, even with an output format", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ anyOf: [{ type: "number" }, { type: "string" }, false] }));

      let count = 0;
      /** @type EvaluationPlugin */
      const plugin = { afterKeyword: () => count++ };

      const result = validator.validate(1, { output: "BASIC", plugins: [plugin] });
      expect(result.valid).to.equal(true);
      expect(count).to.equal(3);
    });
  });

  describe("an evaluation inside an evaluation", () => {
    test("the outer evaluation isn't affected", async () => {
      const validator = await jsonSchema.compile(await schemaFile({
        $id: "https://example.com/nested",
        title: "root",
        properties: { foo: { type: "number" } }
      }));

      /** @type unknown[] */
      const nestedResults = [];
      /** @type EvaluationPlugin */
      const plugin = {
        afterKeyword: (keyword) => {
          if (keyword.keywordUri === typeKeyword.uri && nestedResults.length === 0) {
            // The same specialization as the outer evaluation
            nestedResults.push(validator.annotate({ foo: 1 }, { output: "BASIC", plugins: [{}] }).output);
          }
        }
      };

      const result = validator.annotate({ foo: "bar" }, { output: "BASIC", plugins: [plugin] });
      expect(nestedResults).to.eql([{ valid: true, errors: [] }]);
      expect(result.output.errors.map((error) => locations(/** @type ValidationError */ (error)))).to.eql([
        {
          ruleId: typeKeyword.uri,
          absoluteKeywordLocation: "https://example.com/nested#/properties/foo/type",
          instanceLocation: "/foo"
        }
      ]);
    });
  });

  describe("serialize", () => {
    test("a restored validator works without compiling", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ properties: { foo: { type: "number" } } }));
      const serialized = JSON.parse(JSON.stringify(validator.serialize()));

      const restored = jsonSchema.restoreValidator(serialized);
      expect(restored.uri).to.equal(validator.uri);
      expect(restored.validate({ foo: 1 })).to.equal(true);
      expect(restored.validate({ foo: "1" })).to.equal(false);
    });

    test("restoring needs the same keywords", async () => {
      const validator = await jsonSchema.compile(await schemaFile({ type: "number" }));
      const serialized = validator.serialize();

      expect(() => new JsonSchema().restoreValidator(serialized)).to.throw("isn't supported");
    });
  });
});
