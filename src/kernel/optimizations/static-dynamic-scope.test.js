import { describe, test, expect } from "vitest";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { addDraft202012, draft202012DialectUri } from "../../dialects/draft-2020-12/index.js";
import { hasOp } from "../kernel.js";
import { optimize } from "../optimize.js";
import staticDynamicScope from "./static-dynamic-scope.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Kernel } from "../kernel.d.ts"
 * @import { Validator } from "../../json-schema.d.ts"
 */

const jsonSchema = new JsonSchema();
addDraft202012(jsonSchema);

const fast = { fast: true, plugins: false, annotations: false };

let count = 0;

describe("staticDynamicScope", () => {
  test("applies what the outermost anchor identifies", async () => {
    const { tree, strictTree } = trees();
    const validator = await compile(strictTree, [tree]);
    const kernel = /** @type Kernel */ (validator.serialize());
    expect(kernel.reads.dynamicScope.length).to.be.greaterThan(0);

    const optimized = optimize(kernel, fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(hasDynamicApply(optimized)).to.equal(false);
    expect(copies(optimized)).to.equal(0);

    expect(validator.validate({ children: [{ data: 1 }] })).to.equal(true);
    expect(validator.validate({ children: [{ daat: 1 }] })).to.equal(false);
  });

  test("copies a schema applied with different anchors in scope", async () => {
    const { tree, strictTree } = trees();
    const validator = await compile({
      properties: {
        loose: { $ref: tree.$id },
        strict: { $ref: strictTree.$id }
      }
    }, [tree, strictTree]);
    const optimized = optimize(/** @type Kernel */ (validator.serialize()), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.be.greaterThan(0);

    expect(validator.validate({ loose: { children: [{ daat: 1 }] } })).to.equal(true);
    expect(validator.validate({ strict: { children: [{ daat: 1 }] } })).to.equal(false);
    expect(validator.validate({ strict: { children: [{ data: 1 }] } })).to.equal(true);
  });

  test("doesn't copy a schema for anchors it can't read", async () => {
    const { tree } = trees();
    // `other` is in scope through `wrapper`, but `tree` can't read it
    const wrapper = { $id: `https://example.com/wrapper-${count++}`, $dynamicAnchor: "other", $ref: tree.$id };
    const validator = await compile({
      properties: {
        direct: { $ref: tree.$id },
        wrapped: { $ref: wrapper.$id }
      }
    }, [tree, wrapper]);
    const optimized = optimize(/** @type Kernel */ (validator.serialize()), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.equal(0);
  });

  test("copies a schema for every path that puts different anchors in scope", async () => {
    // Which of `t1` or `f1`, then `t2` or `f2`, it goes through decides
    // what `x1` and `x2` identify in `phi`
    const [root, schemas] = choices(2);
    const validator = await compile(root, schemas);
    const optimized = optimize(/** @type Kernel */ (validator.serialize()), fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    expect(copies(optimized)).to.be.greaterThan(0);

    expect(validator.validate(null)).to.equal(true);
    expect(validator.validate("foo")).to.equal(true);
    expect(validator.validate(1)).to.equal(false);
  });

  test("gives up when there are more copies than schemas that read the dynamic scope", async () => {
    const [root, schemas] = choices(8);
    const validator = await compile(root, schemas);
    const kernel = /** @type Kernel */ (validator.serialize());
    expect(staticDynamicScope.optimize(kernel, fast).size).to.equal(0);
    expect(optimize(kernel, fast).reads.dynamicScope.length).to.be.greaterThan(0);

    expect(validator.validate(null)).to.equal(true);
    expect(validator.validate(1)).to.equal(false);
  });

  test("removes a schema that reads the dynamic scope that nothing applies", async () => {
    // A resource's dynamic anchors are lowered whether they're applied or not
    const validator = await compile({
      type: "string",
      $defs: {
        node: { $dynamicAnchor: "node", items: { $dynamicRef: "#node" } }
      }
    });
    const kernel = /** @type Kernel */ (validator.serialize());
    expect(kernel.reads.dynamicScope.length).to.be.greaterThan(0);

    const optimized = optimize(kernel, fast);
    expect(optimized.reads.dynamicScope).to.eql([]);
    for (const handle of kernel.reads.dynamicScope) {
      expect(handle in optimized.schemas).to.equal(false);
    }
  });

  test("lets static-unevaluated see what a dynamic reference applies", async () => {
    const validator = await compile({
      $dynamicRef: "#meta",
      unevaluatedProperties: false,
      $defs: {
        meta: { $dynamicAnchor: "meta", properties: { foo: true } }
      }
    });
    const kernel = /** @type Kernel */ (validator.serialize());
    expect(kernel.reads.evaluated.length).to.be.greaterThan(0);
    expect(optimize(kernel, fast).reads.evaluated).to.eql([]);

    expect(validator.validate({ foo: 1 })).to.equal(true);
    expect(validator.validate({ bar: 1 })).to.equal(false);
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

  test("is for the fast mode only", async () => {
    const { tree, strictTree } = trees();
    const kernel = /** @type Kernel */ ((await compile(strictTree, [tree])).serialize());
    expect(staticDynamicScope.optimize(kernel, { fast: false, plugins: true, annotations: false }).size).to.equal(0);
    expect(staticDynamicScope.optimize(kernel, { fast: false, plugins: false, annotations: true }).size).to.equal(0);
  });
});

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

/** @type (schema: Record<string, Json>, schemas?: (Record<string, Json> & { $id: string })[]) => Promise<Validator> */
const compile = async (schema, schemas = []) => {
  const uri = /** @type string | undefined */ (schema.$id) ?? `https://example.com/schema-${count++}`;
  const registry = new SchemaRegistry([
    { schema, retrievalUri: uri, dialectUri: draft202012DialectUri },
    ...schemas.map((each) => ({ schema: each, retrievalUri: each.$id, dialectUri: draft202012DialectUri }))
  ]);
  return jsonSchema.compile(uri, { registries: [registry] });
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
