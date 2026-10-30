import { describe, test, expect } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { fromJs } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { BASIC } from "../output/index.js";
import { compile, restore, serialize } from "./compile.js";
import { annotate, annotator, annotatorFor, validate, validator, validatorFor } from "./validate.js";
import { bundle } from "./bundle.js";
import { lint } from "./lint.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { BasicOutput } from "../output/output-format.d.ts"
 */

const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [v1Dialect] });

/** @type (properties: Record<string, Json>) => Record<string, Json> */
const v1 = (properties) => ({ $schema: v1DialectUri, ...properties });

describe("operations", () => {
  describe("schemas as values", () => {
    test("a schema without an $id is identified by a urn:uuid: URI", async () => {
      const output = /** @type BasicOutput */ (await validate(jsonSchema, v1({ type: "string" }), 42, { output: BASIC }));

      expect(output.valid).to.equal(false);
      expect(output.errors[0]).to.include({ instanceLocation: "" });
      expect(/** @type {{ absoluteKeywordLocation: string }} */ (output.errors[0]).absoluteKeywordLocation).to.match(/^urn:uuid:[0-9a-f-]{36}#\/type$/);
    });

    test("each call identifies a schema without an $id differently", async () => {
      const a = await compile(jsonSchema, v1({}));
      const b = await compile(jsonSchema, v1({}));

      expect(a.uri).to.not.equal(b.uri);
    });

    test("a schema with an $id is identified by it", async () => {
      const compiled = await compile(jsonSchema, v1({ $id: "https://example.com/value", $defs: { a: { type: "string" } }, $ref: "#/$defs/a" }));

      expect(compiled.uri).to.equal("https://example.com/value#");
      expect(validatorFor(compiled)(42)).to.equal(false);
    });

    test("a schema can reference schemas in a registry", async () => {
      const registry = new SchemaRegistry().with(v1({ $id: "https://example.com/string", type: "string" }));

      expect(await validate(jsonSchema, v1({ $ref: "https://example.com/string" }), 42, { registry })).to.equal(false);
    });

    test("an $id a registry also has is an error, even if they're identical", async () => {
      const schema = v1({ $id: "https://example.com/both", type: "string" });
      const registry = new SchemaRegistry().with(schema);

      await expect(validate(jsonSchema, schema, 42, { registry })).rejects.toThrow(RetrievalError);
    });

    test("an $id the JsonSchema's registry has is an error", async () => {
      const other = new JsonSchema({ allowRetrieval: [], dialects: [v1Dialect] });
      other.registry = new SchemaRegistry().with(v1({ $id: "https://example.com/both" }));

      await expect(validate(other, v1({ $id: "https://example.com/both" }), 42)).rejects.toThrow(RetrievalError);
    });

    test("a schema is copied, so changing it afterward has no effect", async () => {
      const schema = v1({ type: "string" });
      const check = await validator(jsonSchema, schema);
      schema.type = "number";

      expect(check(42)).to.equal(false);
    });

    test("a boolean schema", async () => {
      const withDefault = new JsonSchema({ allowRetrieval: [], dialects: [v1Dialect], defaultDialectUri: v1DialectUri });

      expect(await validate(withDefault, true, 42)).to.equal(true);
      expect(await validate(withDefault, false, 42)).to.equal(false);
    });
  });

  describe("contexts", () => {
    test("a session's operations share what it found", async () => {
      const session = jsonSchema.session({ registry: new SchemaRegistry().with(v1({ $id: "https://example.com/shared", type: "string" })) });

      expect(await validate(session, "https://example.com/shared", 42)).to.equal(false);
      expect(await validate(session, v1({ $ref: "https://example.com/shared" }), "foo")).to.equal(true);
      expect(await session.getDocument("https://example.com/shared")).to.equal(await session.getDocument("https://example.com/shared"));
    });

    test("a session can't be given a registry or allowRetrieval", async () => {
      const session = jsonSchema.session();

      await expect(validate(session, v1({}), 42, { registry: new SchemaRegistry() })).rejects.toThrow(TypeError);
      await expect(compile(session, v1({}), { allowRetrieval: ["./"] })).rejects.toThrow(TypeError);
    });
  });

  describe("inputs", () => {
    const schema = v1({ type: "object", properties: { a: { type: "string" } } });

    test("a value", async () => {
      expect(await validate(jsonSchema, schema, { a: 1 })).to.equal(false);
    });

    test("JSON text", async () => {
      const output = await validate(jsonSchema, schema, `{ "a": 1 }`, { input: "json", output: BASIC });

      expect(output.valid).to.equal(false);
      expect(output.errors[0].place).to.deep.include({ start: { line: 1, column: 8, offset: 7 } });
    });

    test("JSON text with a syntax error is invalid", async () => {
      expect(await validate(jsonSchema, schema, `{ "a": "b", }`, { input: "json" })).to.equal(false);
    });

    test("a node", async () => {
      expect(await validate(jsonSchema, schema, fromJs({ a: "b" }), { input: "node" })).to.equal(true);
    });

    test("an input that isn't one", async () => {
      const compiled = await compile(jsonSchema, schema);

      expect(() => validatorFor(compiled, /** @type any */ ({ input: "yaml" }))).to.throw(TypeError);
    });
  });

  describe("annotating", () => {
    const schema = v1({ title: "root" });

    test("a value", async () => {
      const { output, status, node } = await annotate(jsonSchema, schema, {});

      expect(output).to.equal(true);
      expect(status).to.equal("success");
      expect(jsonSchema.session().annotation(node, "title")).to.eql(["root"]);
    });

    test("JSON text", async () => {
      const annotateText = await annotator(jsonSchema, schema, { input: "json" });
      const { output, status, node } = annotateText(`{ "a": 1, }`);

      expect(output).to.equal(false);
      expect(status).to.equal("recovered");
      expect(jsonSchema.session().annotation(node, "title")).to.eql(["root"]);
    });

    test("a node is annotated where it is", async () => {
      const node = fromJs({});
      const result = annotatorFor(await compile(jsonSchema, schema), { input: "node" })(node);

      expect(result).to.include({ output: true, status: "success", node });
      expect(jsonSchema.session().annotation(node, "title")).to.eql(["root"]);
    });
  });

  test("serialize and restore", async () => {
    const compiled = await compile(jsonSchema, v1({ $id: "https://example.com/kept", type: "string" }));
    const restored = restore(jsonSchema, JSON.parse(JSON.stringify(serialize(compiled))));

    expect(restored.uri).to.equal(compiled.uri);
    expect(validatorFor(restored)(42)).to.equal(false);
  });

  test("bundle a schema given as a value", async () => {
    const registry = new SchemaRegistry().with(v1({ $id: "https://example.com/string", type: "string" }));
    const bundled = /** @type Record<string, Json> */ (await bundle(jsonSchema, v1({ $id: "https://example.com/main", $ref: "string" }), { registry }));

    expect(Object.keys(/** @type Record<string, Json> */ (bundled.$defs))).to.eql(["https://example.com/string"]);
  });

  test("lint", async () => {
    const registry = new SchemaRegistry().with(v1({ $id: "https://example.com/lint", type: "object", properties: { name: { type: "string" } }, required: ["nmae"] }));
    const messages = await lint(jsonSchema, "https://example.com/lint", { registry });

    expect(messages.map(({ ruleId }) => ruleId)).to.include("required-property-not-defined");
  });
});
