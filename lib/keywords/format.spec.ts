import { afterEach, describe, expect, test } from "vitest";
import { validate, registerSchema, unregisterSchema, setShouldValidateFormat } from "../../v1/index.js";


describe("v1 format", () => {
  const schemaUri = "schema:main";
  const dialectUri = "https://json-schema.org/v1";

  afterEach(() => {
    unregisterSchema(schemaUri);
    setShouldValidateFormat(undefined);
  });

  test("validates formats by default", async () => {
    registerSchema({ format: "email" }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "foo");
    expect(output.valid).to.equal(false);
  });

  test("validates formats if turned on", async () => {
    setShouldValidateFormat(true);
    registerSchema({ format: "email" }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "foo");
    expect(output.valid).to.equal(false);
  });

  test("doesn't validate formats if turned off", async () => {
    setShouldValidateFormat(false);
    registerSchema({ format: "email" }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "foo");
    expect(output.valid).to.equal(true);
  });

  test("unsupported formats are an error", async () => {
    registerSchema({ format: "unsupported" }, schemaUri, dialectUri);
    await expect(validate(schemaUri, "foo")).rejects.toThrow("The 'unsupported' format is not supported.");
  });

  test("unsupported formats aren't an error if turned off", async () => {
    setShouldValidateFormat(false);
    registerSchema({ format: "unsupported" }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "foo");
    expect(output.valid).to.equal(true);
  });
});
