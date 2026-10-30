import { describe, test, expect, vi } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { BASIC } from "../output/index.js";
import { compile } from "./compile.js";
import { validate, validator } from "./validate.js";

// The instrumented evaluator is mocked so a test can tell whether it was
// loaded. It's only loaded for evaluations that need it.
const loaded = vi.hoisted(() => ({ count: 0 }));
vi.mock("../kernel/instrumented.js", async (importOriginal) => {
  loaded.count++;
  return importOriginal();
});

const jsonSchema = new JsonSchema({ allowRetrieval: [], dialects: [v1Dialect] });
const schema = /** @type const */ ({ $schema: v1DialectUri, type: "string" });

describe("the instrumented evaluator", () => {
  test("isn't loaded to validate values with FLAG", async () => {
    const isString = await validator(jsonSchema, schema);
    await compile(jsonSchema, schema);

    expect(isString(42)).to.equal(false);
    expect(loaded.count).to.equal(0);
  });

  test("is loaded for output", async () => {
    const output = await validate(jsonSchema, schema, 42, { output: BASIC });

    expect(output.valid).to.equal(false);
    expect(loaded.count).to.equal(1);
  });
});
