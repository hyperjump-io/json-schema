import { describe, test, expect } from "vitest";
import { jsonPointerGet } from "@hyperjump/browser";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft202012Dialect, draft202012DialectUri } from "../../dialects/draft-2020-12/index.js";
import { hasOp } from "../kernel.js";
import { optimize } from "../optimize.js";
import staticDynamicScope from "./static-dynamic-scope.js";
import { BASIC } from "../../output/index.js";
import { compile as compileSchema, serialize } from "../../operations/compile.js";
import { annotatorFor, validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Kernel } from "../kernel.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 * @import { KeywordInfo, SchemaInfo } from "../evaluation-plugin.d.ts"
 * @import { ValidationError } from "../../output/validation-error.d.ts"
 */

const jsonSchema = new JsonSchema({ dialects: [draft202012Dialect] });

const fast = { fast: true, plugins: false, annotations: false };
const plugins = { fast: false, plugins: true, annotations: false };
const titleKeywordUri = "https://json-schema.org/keyword/title";

let count = 0;

describe("staticDynamicScope", () => {
  test("applies what the outermost anchor identifies", async () => {
    const { tree, strictTree } = trees();
    const compiled = await compile(strictTree, [tree]);
    const kernel = /** @type Kernel */ (serialize(compiled));
    expect(kernel.reads.dynamicScope.length).to.be.greaterThan(0);

    const optimized = optimize(kernel, fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(hasDynamicApply(optimized)).to.equal(false);
    expect(copies(optimized)).to.equal(0);

    expect(validatorFor(compiled)({ children: [{ data: 1 }] })).to.equal(true);
    expect(validatorFor(compiled)({ children: [{ daat: 1 }] })).to.equal(false);
  });

  test("copies a schema applied with different anchors in scope", async () => {
    const { tree, strictTree } = trees();
    const compiled = await compile({
      properties: {
        loose: { $ref: tree.$id },
        strict: { $ref: strictTree.$id }
      }
    }, [tree, strictTree]);
    const optimized = optimize(/** @type Kernel */ (serialize(compiled)), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.be.greaterThan(0);

    expect(validatorFor(compiled)({ loose: { children: [{ daat: 1 }] } })).to.equal(true);
    expect(validatorFor(compiled)({ strict: { children: [{ daat: 1 }] } })).to.equal(false);
    expect(validatorFor(compiled)({ strict: { children: [{ data: 1 }] } })).to.equal(true);
  });

  test("doesn't copy a schema for anchors it can't read", async () => {
    const { tree } = trees();
    // `other` is in scope through `wrapper`, but `tree` can't read it
    const wrapper = { $id: `https://example.com/wrapper-${count++}`, $dynamicAnchor: "other", $ref: tree.$id };
    const compiled = await compile({
      properties: {
        direct: { $ref: tree.$id },
        wrapped: { $ref: wrapper.$id }
      }
    }, [tree, wrapper]);
    const optimized = optimize(/** @type Kernel */ (serialize(compiled)), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.equal(0);
  });

  test("copies a schema for every path that puts different anchors in scope", async () => {
    // Which of `t1` or `f1`, then `t2` or `f2`, it goes through decides
    // what `x1` and `x2` identify in `phi`
    const [root, schemas] = choices(2);
    const compiled = await compile(root, schemas);
    const optimized = optimize(/** @type Kernel */ (serialize(compiled)), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.be.greaterThan(0);

    expect(validatorFor(compiled)(null)).to.equal(true);
    expect(validatorFor(compiled)("foo")).to.equal(true);
    expect(validatorFor(compiled)(1)).to.equal(false);
  });

  test("gives up when there are more copies than schemas that read the dynamic scope", async () => {
    const [root, schemas] = choices(8);
    const compiled = await compile(root, schemas);
    const kernel = /** @type Kernel */ (serialize(compiled));
    expect(staticDynamicScope.optimize(kernel, fast).size).to.equal(0);
    expect(optimize(kernel, fast).reads.dynamicScope.length).to.be.greaterThan(0);

    expect(validatorFor(compiled)(null)).to.equal(true);
    expect(validatorFor(compiled)(1)).to.equal(false);
  });

  test("removes a schema that reads the dynamic scope that nothing applies", async () => {
    // A resource's dynamic anchors are lowered whether they're applied or not
    const compiled = await compile({
      type: "string",
      $defs: {
        node: { $dynamicAnchor: "node", items: { $dynamicRef: "#node" } }
      }
    });
    const kernel = /** @type Kernel */ (serialize(compiled));
    expect(kernel.reads.dynamicScope.length).to.be.greaterThan(0);

    const optimized = optimize(kernel, fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    for (const handle of kernel.reads.dynamicScope) {
      expect(handle in optimized.schemas).to.equal(false);
    }
  });

  test("lets static-unevaluated see what a dynamic reference applies", async () => {
    const compiled = await compile({
      $dynamicRef: "#meta",
      unevaluatedProperties: false,
      $defs: {
        meta: { $dynamicAnchor: "meta", properties: { foo: true } }
      }
    });
    const kernel = /** @type Kernel */ (serialize(compiled));
    expect(kernel.reads.evaluated.length).to.be.greaterThan(0);
    expect(optimize(kernel, fast).reads.evaluated).to.eql([]);

    expect(validatorFor(compiled)({ foo: 1 })).to.equal(true);
    expect(validatorFor(compiled)({ bar: 1 })).to.equal(false);
  });

  test("doesn't change a kernel with an opaque operation that reads the dynamic scope", () => {
    const uri = "https://example.com/opaque";
    const keywordUri = "https://example.com/keyword/opaque";
    /** @type Kernel */
    const kernel = {
      kernel: 1,
      uri,
      schemas: {
        [uri]: {
          resource: uri,
          keywords: [{
            keywordUri,
            location: `${uri}#/opaque`,
            sources: [],
            expression: { op: "opaque", keyword: keywordUri, value: null, schemas: [], reads: ["dynamicScope"] }
          }]
        }
      },
      resources: { [uri]: { dynamicAnchors: {} } },
      reads: { evaluated: [], dynamicScope: [uri] }
    };
    expect(staticDynamicScope.optimize(kernel, fast).size).to.equal(0);
  });

  describe("with plugins", () => {
    test("they see the location of the schema a copy copies, with its infos", async () => {
      const compiled = await looseAndStrict();
      const optimized = optimize(/** @type Kernel */ (serialize(compiled)), plugins);
      expect(copies(optimized)).to.be.greaterThan(0);
      expect(optimized.reads.dynamicScope).to.eql([]);

      // A schema and a keyword can have the same location, like `if`'s
      /** @type Map<string, Set<SchemaInfo>> */
      const schemaInfos = new Map();
      /** @type Map<string, Set<KeywordInfo>> */
      const keywordInfos = new Map();
      /** @type <T extends SchemaInfo | KeywordInfo>(infos: Map<string, Set<T>>) => (info: T) => void */
      const see = (infos) => (info) => {
        const seen = infos.get(info.absoluteKeywordLocation) ?? new Set();
        seen.add(info);
        infos.set(info.absoluteKeywordLocation, seen);
      };
      validatorFor(compiled, {
        plugins: [{ beforeSchema: see(schemaInfos), beforeKeyword: see(keywordInfos) }]
      })({ loose: { kids: { kids: {} } }, strict: { kids: { kids: {} } } });

      for (const infos of [schemaInfos, keywordInfos]) {
        expect([...infos.keys()].filter((location) => location.includes(" "))).to.eql([]);
        for (const [location, seen] of infos) {
          expect(seen.size, location).to.equal(1);
        }
      }
    });

    test("BASIC reports what it would tracking the dynamic scope", async () => {
      const compiled = await looseAndStrict();
      const { base } = compiled;
      /** @type (instance: Json) => [string, string][] */
      const errors = (instance) => {
        const output = validatorFor(compiled, { output: BASIC })(instance);
        return output.errors.map((error) => {
          const { absoluteKeywordLocation, instanceLocation } = /** @type ValidationError */ (error);
          return [absoluteKeywordLocation.replace(base, ""), instanceLocation];
        });
      };

      // `if`'s condition fails in both trees, and so does `else`, so `if`
      // fails, and the condition's errors aren't reported, only the ones
      // from `properties`
      expect(errors({ loose: { kids: 5 } })).to.eql([
        ["tree#/type", "/loose/kids"],
        ["tree#/else/required", "/loose"]
      ]);
      expect(errors({ strict: { kids: 5 } })).to.eql([
        ["tree#/type", "/strict/kids"],
        ["tree#/else/required", "/strict"],
        ["strict-tree#/unevaluatedProperties", "/strict/kids"]
      ]);
      expect(errors({ strict: { kids: { extra: 1 } } })).to.eql([
        ["strict-tree#/unevaluatedProperties", "/strict/kids/extra"],
        ["tree#/else/required", "/strict"],
        ["strict-tree#/unevaluatedProperties", "/strict/kids"]
      ]);
      expect(errors({ strict: { kids: { forbidden: 1 } } })).to.eql([
        ["tree#/properties/forbidden", "/strict/kids/forbidden"],
        ["strict-tree#/unevaluatedProperties", "/strict/kids/forbidden"],
        ["tree#/else/required", "/strict"],
        ["strict-tree#/unevaluatedProperties", "/strict/kids"]
      ]);
    });

    test("annotating applies the copies", async () => {
      const compiled = await looseAndStrict();
      expect(copies(optimize(/** @type Kernel */ (serialize(compiled)), { fast: false, plugins: false, annotations: true }))).to.be.greaterThan(0);

      // `kids` is applied by `properties` and by `if`'s condition, which passes
      const { output, node } = annotatorFor(compiled)({ strict: { data: 1, kids: { data: 1 } } });
      expect(output).to.equal(true);
      expect(jsonPointerGet("/strict", /** @type any */ (node)).data.annotations.get(titleKeywordUri)).to.eql(["tree"]);
      expect(jsonPointerGet("/strict/kids", /** @type any */ (node)).data.annotations.get(titleKeywordUri)).to.eql(["tree", "tree"]);
      expect(annotatorFor(compiled)({ strict: { data: 1, kids: { data: 1, extra: 1 } } }).output).to.equal(false);
    });
  });
});

/**
 * A tree whose `kids` is a node, and that's also `if`'s condition, applied
 * as a tree and as a strict tree, so its schemas are copied. Its `base` is
 * what its schemas' URIs start with.
 *
 * @type () => Promise<CompiledSchema & { base: string }>
 */
const looseAndStrict = async () => {
  const base = `https://example.com/loose-and-strict-${count++}/`;
  const tree = {
    $id: `${base}tree`,
    $dynamicAnchor: "node",
    title: "tree",
    type: "object",
    properties: { data: true, forbidden: false, kids: { $dynamicRef: "#node" } },
    if: { properties: { kids: { $dynamicRef: "#node" } } },
    else: { required: ["data"] }
  };
  const strictTree = { $id: `${base}strict-tree`, $dynamicAnchor: "node", $ref: "tree", unevaluatedProperties: false };
  const compiled = await compile({
    $id: `${base}root`,
    properties: { loose: { $ref: "tree" }, strict: { $ref: "strict-tree" } }
  }, [tree, strictTree]);
  return Object.assign(compiled, { base });
};

/**
 * The tree schemas from the 2020-12 spec: `strictTree` is `tree` with no
 * other properties in any node
 *
 * @type () => { tree: Record<string, Json> & { $id: string }; strictTree: Record<string, Json> & { $id: string } }
 */
const trees = () => {
  const id = count++;
  const tree = {
    $id: `https://example.com/tree-${id}`,
    $dynamicAnchor: "node",
    type: "object",
    properties: {
      data: true,
      children: { type: "array", items: { $dynamicRef: "#node" } }
    }
  };
  const strictTree = {
    $id: `https://example.com/strict-tree-${id}`,
    $dynamicAnchor: "node",
    $ref: tree.$id,
    unevaluatedProperties: false
  };
  return { tree, strictTree };
};

/**
 * A schema that goes through `t1` or `f1`, ..., then `tn` or `fn`, and
 * then applies `phi`, which applies the dynamic anchors `x1` to `xn`. Each
 * `t` identifies a schema for `null`, and each `f` one for strings, so
 * what `phi` applies depends on the path, and there are 2^n of them. It's
 * the shape of the paper's PSPACE-hardness proof.
 *
 * @type (n: number) => [Record<string, Json>, (Record<string, Json> & { $id: string })[]]
 */
const choices = (n) => {
  const base = `https://example.com/choices-${count++}`;
  const phi = {
    $id: `${base}/phi`,
    allOf: Array.from({ length: n }, (_, index) => ({ $dynamicRef: `${base}/t${index + 1}#x${index + 1}` }))
  };
  /** @type (index: number) => Json */
  const next = (index) => index > n ? { $ref: phi.$id } : { anyOf: [{ $ref: `${base}/t${index}` }, { $ref: `${base}/f${index}` }] };
  /** @type (Record<string, Json> & { $id: string })[] */
  const schemas = [phi];
  for (let index = 1; index <= n; index++) {
    for (const [name, type] of [["t", "null"], ["f", "string"]]) {
      schemas.push({
        $id: `${base}/${name}${index}`,
        allOf: [next(index + 1)],
        $defs: { x: { $dynamicAnchor: `x${index}`, type } }
      });
    }
  }
  const root = /** @type Record<string, Json> */ (next(1));
  return [root, schemas];
};

/** @type (schema: Record<string, Json>, schemas?: (Record<string, Json> & { $id: string })[]) => Promise<CompiledSchema> */
const compile = async (schema, schemas = []) => {
  const uri = /** @type string | undefined */ (schema.$id) ?? `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([
    { schema, retrievalUri: uri, dialectUri: draft202012DialectUri },
    ...schemas.map((each) => ({ schema: each, retrievalUri: each.$id, dialectUri: draft202012DialectUri }))
  ]);
  return compileSchema(jsonSchema, uri, { registry });
};

/**
 * The number of copies of schemas, whose handles have a space
 *
 * @type (kernel: Kernel) => number
 */
const copies = (kernel) => Object.keys(kernel.schemas).filter((handle) => handle.includes(" ")).length;

/** @type (kernel: Kernel) => boolean */
const hasDynamicApply = (kernel) => Object.values(kernel.schemas).some((schema) => {
  return typeof schema !== "boolean" && schema.keywords.some(({ expression }) => hasOp(expression, "dynamicApply"));
});
