import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { fromJs, rejsonParse, rejsonStringify } from "@hyperjump/browser";
import { configureJsonSchema, extendDialect } from "../json-schema.js";
import { JsonSchemaHyperjump } from "../session.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { appliesTo, canPass } from "./analysis.js";
import { documentForLint } from "./document.js";
import { evaluatorForLint } from "./evaluate.js";
import { provenance } from "./provenance.js";
import impossibleProperty from "./rules/impossible-property.js";
import keywordWithoutEffect from "./rules/keyword-without-effect.js";
import { noUrl } from "../identifiers.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode, JsonSchemaNode, JsonSchemaTolerantNode } from "../schema/schema-ast.d.ts"
 * @import { LoweredKeyword } from "../kernel/lower.js"
 * @import { LintDocument } from "./document.d.ts"
 */

/**
 * The switches aren't lowered from built-in keywords, but a keyword can
 * lower to one, so these keywords do. Each schema of the value is a branch.
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type Keyword<[string, Expression][]> */
const byKindKeyword = {
  uri: "https://example.com/keyword/byKind",
  shape: { map: "schema" },
  lower: (pairs) => ({
    op: "propertySwitch",
    name: "kind",
    cases: pairs,
    other: { op: "fail" },
    absent: { op: "pass" },
    unparsed: anyOf(pairs)
  })
};

/** @type Keyword<[string, Expression][]> */
const byTypeKeyword = {
  uri: "https://example.com/keyword/byType",
  shape: { map: "schema" },
  lower: (pairs) => ({ op: "typeSwitch", cases: Object.fromEntries(pairs), otherwise: { op: "pass" } })
};

/** @type Keyword<[string, Expression][]> */
const byKeyKeyword = {
  uri: "https://example.com/keyword/byKey",
  shape: { map: "schema" },
  lower: (pairs) => ({ op: "keySwitch", cases: pairs, none: { op: "fail" }, unparsed: anyOf(pairs) })
};

const jsonSchema = configureJsonSchema({
  dialects: [extendDialect(draft202012Dialect, {
    keywords: { byKind: byKindKeyword, byType: byTypeKeyword, byKey: byKeyKeyword }
  })]
});

describe("the switches in lint", () => {
  describe("evaluated", () => {
    test("propertySwitch", async () => {
      const valid = await evaluatorFor({ byKind: { a: { required: ["x"] }, b: { $ref: "https://example.com/nope" } } });
      expect(/** @type Json[] */ ([{ kind: "a", x: 1 }, { kind: "a" }, { kind: "c" }, {}, "s"]).map((value) => valid(value))).to.eql([true, false, false, true, true]);
      expect(valid({ kind: "b" })).to.equal(undefined);
    });

    test("typeSwitch", async () => {
      const valid = await evaluatorFor({ byType: { string: { minLength: 2 }, number: { minimum: 0 } } });
      expect(/** @type Json[] */ (["ab", "a", 1, -1, null, {}]).map((value) => valid(value))).to.eql([true, false, true, false, true, true]);
    });

    test("keySwitch", async () => {
      const valid = await evaluatorFor({ byKey: { eq: { maxProperties: 1 }, gt: true } });
      expect(/** @type Json[] */ ([{ eq: 1 }, { eq: 1, gt: 1 }, { gt: 1 }, {}, 1]).map((value) => valid(value))).to.eql([true, false, true, false, true]);
    });
  });

  test("a switch whose branches have no effect has none", async () => {
    expect(await reasons(keywordWithoutEffect, `{ "$schema": "${draft2020}", "byType": { "string": {}, "number": true } }`))
      .to.eql(["'byType' has no effect"]);
    expect(await reasons(keywordWithoutEffect, `{ "$schema": "${draft2020}", "byType": { "string": { "minLength": 1 } } }`)).to.eql([]);
  });

  test("a property a switch is by can be impossible", async () => {
    /** @type (name: string) => string */
    const reason = (name) => `An object with '${name}' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has '${name}'`;
    expect(await reasons(impossibleProperty, `{ "$schema": "${draft2020}", "byKey": { "a": { "required": ["b", "c"] } }, "maxProperties": 2 }`))
      .to.eql([reason("a"), reason("a")]);
    expect(await reasons(impossibleProperty, `{ "$schema": "${draft2020}", "byKind": { "x": { "required": ["b", "c"] } }, "maxProperties": 2 }`))
      .to.eql([reason("kind"), reason("kind")]);
    expect(await reasons(impossibleProperty, `{ "$schema": "${draft2020}", "byKind": { "x": { "required": ["b"] } }, "maxProperties": 2 }`)).to.eql([]);
  });

  describe("analysis", () => {
    /** @type Expression */
    const isString = { op: "typeIs", types: ["string"] };

    test("a typeSwitch's branch is about its type", () => {
      /** @type Expression */
      const expression = { op: "typeSwitch", cases: { string: { op: "stringLength", min: 1 }, number: { op: "fail" } }, otherwise: { op: "pass" } };
      expect([...appliesTo(noDefinitions, expression)]).to.eql(["number", "string"]);
      expect([...canPass(expression)].toSorted()).to.eql(["array", "boolean", "null", "object", "string"]);
    });

    test("a propertySwitch or keySwitch is about objects, and passes the rest", () => {
      /** @type Expression[] */
      const expressions = [
        { op: "propertySwitch", name: "kind", cases: [["a", isString]], other: { op: "fail" }, absent: { op: "fail" }, unparsed: { op: "fail" } },
        { op: "keySwitch", cases: [["a", isString]], none: { op: "fail" }, unparsed: { op: "fail" } }
      ];
      for (const expression of expressions) {
        expect([...appliesTo(noDefinitions, expression)]).to.eql(["object"]);
        expect([...canPass(expression)].toSorted()).to.eql(["array", "boolean", "null", "number", "string"]);
      }
    });
  });

  test("provenance follows a switch's branches", () => {
    /** @type Expression */
    const fromSibling = { op: "stringLength", max: 3 };
    /** @type Expression */
    const typeSwitch = { op: "typeSwitch", cases: { string: { op: "all", of: [isStringOp(), fromSibling] } }, otherwise: { op: "pass" } };
    /** @type Expression */
    const propertySwitch = {
      op: "propertySwitch", name: "kind", cases: [], other: { op: "pass" }, absent: { op: "pass" }, unparsed: { op: "all", of: [isStringOp(), fromSibling] }
    };
    for (const [expression, without] of /** @type [Expression, Expression][] */ ([
      [typeSwitch, { ...typeSwitch, cases: { string: isStringOp() } }],
      [propertySwitch, { ...propertySwitch, unparsed: isStringOp() }]
    ])) {
      const keywordNode = /** @type JsonSchemaKeywordNode */ (/** @type unknown */ ({ position: { start: { offset: 0 } } }));
      const sourceNode = /** @type JsonSchemaKeywordNode */ (/** @type unknown */ ({ position: { start: { offset: 10 } } }));
      const group = { keywordUri: "", location: "", sources: [""], expression };
      const cameFrom = provenance(/** @type LoweredKeyword */ (/** @type unknown */ ({ group, keywordNode, sourceNodes: [sourceNode], withoutSiblings: [without] })));
      expect(cameFrom(fromSibling)).to.eql([keywordNode, sourceNode]);
    }
  });
});

/** @type (pairs: [string, Expression][]) => Expression */
const anyOf = (pairs) => ({ op: "any", of: pairs.map(([, schema]) => schema) });

// What `appliesTo` reads of a document, for an expression without formats
const noDefinitions = /** @type LintDocument */ (/** @type unknown */ ({ definitions: { keywords: {}, formats: {} } }));

/** @type (schema: object) => Promise<LintDocument> */
const resolve = async (schema) => {
  const session = new JsonSchemaHyperjump(jsonSchema);
  const file = new VFile({ path: "/schemas/a.schema.json", value: JSON.stringify({ $schema: draft2020, ...schema }) });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  return /** @type LintDocument */ (await documentForLint(tree, file));
};

/** @type (schema: object) => Promise<(value: Json) => boolean | undefined> */
const evaluatorFor = async (schema) => {
  const document = await resolve(schema);
  const evaluator = evaluatorForLint(document);
  const schemaNode = /** @type JsonSchemaNode */ (document.tree.children[0]);
  return (value) => evaluator.schema(schemaNode, /** @type JsonSchemaTolerantNode */ (/** @type unknown */ (fromJs(value, noUrl)))).valid;
};

/** @type (rule: any, json: string) => Promise<string[]> */
const reasons = async (rule, json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await unified()
    .use(rejsonParse)
    .use(function () {
      return /** @type Function */ (jsonSchemaResolve).call(this, { session: new JsonSchemaHyperjump(jsonSchema) });
    })
    .use(rule)
    .use(rejsonStringify)
    .process(file);
  return file.messages.map((message) => message.reason);
};

/** @type () => Expression */
const isStringOp = () => ({ op: "typeIs", types: ["string"] });
