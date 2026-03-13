import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerSchema, unregisterSchema, validate } from "../lib/index.js";
import "./index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";

import type { Validator } from "../lib/index.js";


describe("hostname", () => {
  describe("draft4", () => {
    const schemaUri = "https://json-schema.org/tests/draft4/hostname";
    let _validate: Validator;

    beforeAll(async () => {
      registerSchema({
        type: "string",
        format: "hostname"
      }, schemaUri, "http://json-schema.org/draft-04/schema");

      _validate = await validate(schemaUri);
    });

    afterAll(() => {
      unregisterSchema(schemaUri);
    });

    it("accepts rfc1123 hostname labels with consecutive hyphens", () => {
      const output = _validate("ab--cd.example");
      expect(output.valid).to.equal(true);
    });
  });

  describe("draft6", () => {
    const schemaUri = "https://json-schema.org/tests/draft6/hostname";
    let _validate: Validator;

    beforeAll(async () => {
      registerSchema({
        type: "string",
        format: "hostname"
      }, schemaUri, "http://json-schema.org/draft-06/schema");

      _validate = await validate(schemaUri);
    });

    afterAll(() => {
      unregisterSchema(schemaUri);
    });

    it("accepts rfc1123 hostname labels with consecutive hyphens", () => {
      const output = _validate("ab--cd.example");
      expect(output.valid).to.equal(true);
    });
  });
});
