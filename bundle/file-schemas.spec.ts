import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import "../v1/index.js";
import "../draft-2020-12/index.js";
import { bundle } from "./index.js";

import type { SchemaObject } from "../lib/index.js";


describe("bundle", () => {
  describe("file-based bundle", () => {
    const fileId = "string.schema.json";
    let bundledSchema: SchemaObject;

    beforeAll(async () => {
      bundledSchema = await bundle("./bundle/file-schemas/main.schema.json");
    });

    it("should not have an identifier", () => {
      expect(bundledSchema).to.not.haveOwnProperty("$id");
    });

    it("definition name should be relative", () => {
      expect(bundledSchema.$defs).to.haveOwnProperty(fileId);
    });

    it("definition should have a relative identifier", () => {
      const definitions = bundledSchema.$defs as Record<string, SchemaObject>;
      expect(definitions[fileId].$id).to.equal(fileId);
    });
  });

  describe("file-based bundle with http-based references", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";
    const fileId = "string.schema.json";
    const httpId = "https://bundler.hyperjump.io/number";
    let bundledSchema: SchemaObject;

    beforeAll(async () => {
      registerSchema({ "type": "number" }, "https://bundler.hyperjump.io/number", dialect);
      bundledSchema = await bundle("./bundle/file-schemas/mixed-schemes.schema.json");
    });

    afterAll(() => {
      unregisterSchema("https://bundler.hyperjump.io/number");
    });

    it("should not have an identifier", () => {
      expect(bundledSchema).to.not.haveOwnProperty("$id");
    });

    it("file definition name should be relative", () => {
      expect(bundledSchema.$defs).to.haveOwnProperty(fileId);
    });

    it("file definition should have a relative identifier", () => {
      const definitions = bundledSchema.$defs as Record<string, SchemaObject>;
      expect(definitions[fileId].$id).to.equal(fileId);
    });

    it("http definition name should be absolute", () => {
      expect(bundledSchema.$defs).to.haveOwnProperty(httpId);
    });

    it("http definition should have an identifier", () => {
      const definitions = bundledSchema.$defs as Record<string, SchemaObject>;
      expect(definitions[httpId].$id).to.equal(httpId);
    });
  });
});
