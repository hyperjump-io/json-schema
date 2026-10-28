import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";
import fractionalLimitForInteger from "./rules/fractional-limit-for-integer.js";
import keywordForDisallowedType from "./rules/keyword-for-disallowed-type.js";
import multipleOfOne from "./rules/multiple-of-one.js";
import propertyNamesType from "./rules/property-names-type.js";
import singleValueRange from "./rules/single-value-range.js";
import unsafeIntegerLimit from "./rules/unsafe-integer-limit.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 * @import { TypeName } from "../kernel/kernel.d.ts"
 */

/**
 * The rules about `type` read every keyword that lowers to `typeIs`
 * (`typeIsOf`), and a schema allows the types they all allow. `allows` is
 * a keyword that lowers like `type`.
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type Keyword<TypeName | TypeName[], "data"> */
const allowsKeyword = {
  uri: "https://example.com/keyword/allows",
  shape: "data",
  lower: (types) => ({ op: "typeIs", types: Array.isArray(types) ? types : [types] })
};

const jsonSchema = new JsonSchema();
addDraft202012(jsonSchema);
jsonSchema.addKeyword(allowsKeyword);
jsonSchema.extendDialect(draft2020, { keywords: { allows: allowsKeyword.uri } });

describe("more than one keyword that lowers to typeIs", () => {
  test("keyword-for-disallowed-type names the keywords that don't allow the type", async () => {
    expect(await reasons(keywordForDisallowedType, `{ "$schema": "${draft2020}", "type": ["integer", "string"], "allows": "string", "minimum": 1 }`)).to.eql([
      "'minimum' applies only to numbers, which 'allows' doesn't allow"
    ]);
    expect(await reasons(keywordForDisallowedType, `{ "$schema": "${draft2020}", "type": "number", "allows": ["number", "string"], "maxLength": 1 }`)).to.eql([
      "'maxLength' applies only to strings, which 'type' doesn't allow"
    ]);
    expect(await reasons(keywordForDisallowedType, `{ "$schema": "${draft2020}", "type": ["number", "string"], "allows": ["number", "string"], "minimum": 1 }`)).to.eql([]);
  });

  test("keyword-for-disallowed-type doesn't report keywords that allow no type together", async () => {
    expect(await reasons(keywordForDisallowedType, `{ "$schema": "${draft2020}", "type": "string", "allows": "number", "minLength": 1 }`)).to.eql([]);
  });

  test("property-names-type reports each keyword", async () => {
    expect(await reasons(propertyNamesType, `{ "$schema": "${draft2020}", "propertyNames": { "type": ["string", "number"], "allows": "string" } }`)).to.eql([
      "'type' has no effect in 'propertyNames', because property names are always strings",
      "'allows' has no effect in 'propertyNames', because property names are always strings"
    ]);
    expect(await reasons(propertyNamesType, `{ "$schema": "${draft2020}", "propertyNames": { "type": ["string", "number"], "allows": "number" } }`)).to.eql([
      "'allows' doesn't allow strings, so no property name is valid, and only objects without properties are"
    ]);
  });

  test("multiple-of-one", async () => {
    expect(await reasons(multipleOfOne, `{ "$schema": "${draft2020}", "type": "number", "allows": ["number", "string"], "multipleOf": 1 }`)).to.eql([
      "'multipleOf': 1 only allows integers. Remove it, and allow 'integer' instead of 'number' in 'type' and 'allows'."
    ]);
    expect(await reasons(multipleOfOne, `{ "$schema": "${draft2020}", "type": ["integer", "string"], "allows": "number", "multipleOf": 1 }`)).to.eql([
      "'multipleOf': 1 has no effect, because 'type' and 'allows' only allow integers"
    ]);
  });

  test("fractional-limit-for-integer", async () => {
    expect(await reasons(fractionalLimitForInteger, `{ "$schema": "${draft2020}", "type": "number", "allows": ["integer", "string"], "minimum": 0.5 }`)).to.eql([
      "'minimum' isn't an integer, but 'type' and 'allows' only allow integers, so it's the same as 1"
    ]);
  });

  test("single-value-range", async () => {
    expect(await reasons(singleValueRange, `{ "$schema": "${draft2020}", "type": ["number", "string"], "allows": "number", "minimum": 1, "maximum": 1 }`)).to.have.length(1);
    expect(await reasons(singleValueRange, `{ "$schema": "${draft2020}", "type": ["number", "string"], "allows": ["number", "string"], "minimum": 1, "maximum": 1 }`)).to.eql([]);
  });

  test("unsafe-integer-limit", async () => {
    expect(await reasons(unsafeIntegerLimit, `{ "$schema": "${draft2020}", "type": "number", "allows": "integer", "maximum": 1e20 }`)).to.have.length(1);
    expect(await reasons(unsafeIntegerLimit, `{ "$schema": "${draft2020}", "type": "number", "allows": ["number", "string"], "maximum": 1e20 }`)).to.eql([]);
  });
});

/** @type (rule: any, json: string) => Promise<string[]> */
const reasons = async (rule, json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await unified()
    .use(rejsonParse)
    .use(function () {
      return /** @type Function */ (jsonSchemaResolve).call(this, { session: jsonSchema.session() });
    })
    .use(rule)
    .use(rejsonStringify)
    .process(file);
  return file.messages.map((message) => message.reason);
};
