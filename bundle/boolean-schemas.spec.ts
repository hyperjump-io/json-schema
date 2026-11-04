import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bundle, URI, UUID } from "./index.js";
import { registerSchema, unregisterSchema, validate } from "../lib/index.js";
import { getKeywordName } from "../lib/experimental.js";
import "../v1/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";

import type { SchemaObject } from "../lib/index.js";


const testDomain = "https://bundler.hyperjump.io";

const testRunner = (dialect: string) => {
  describe(dialect, () => {
    const idToken = getKeywordName(dialect, "https://json-schema.org/keyword/id")
      || getKeywordName(dialect, "https://json-schema.org/keyword/draft-04/id");
    const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
    const notToken = getKeywordName(dialect, "https://json-schema.org/keyword/not");

    describe("external false schema", () => {
      beforeEach(() => {
        registerSchema(false, `${testDomain}/external-false`, dialect);
        registerSchema({
          type: "object",
          properties: {
            foo: { $ref: `${testDomain}/external-false` }
          }
        }, `${testDomain}/main-false`, dialect);
      });

      afterEach(() => {
        unregisterSchema(`${testDomain}/main-false`);
        unregisterSchema(`${testDomain}/external-false`);
      });

      it("should embed { [idToken]: ..., not: {} } and validate false with URI naming", async () => {
        const bundled = await bundle(`${testDomain}/main-false`, { definitionNamingStrategy: URI });
        const definitions = bundled[definitionsToken] as Record<string, SchemaObject>;

        expect(definitions[`${testDomain}/external-false`]).to.eql({
          [idToken]: `${testDomain}/external-false`,
          [notToken]: {}
        });

        unregisterSchema(`${testDomain}/main-false`);
        unregisterSchema(`${testDomain}/external-false`);

        registerSchema(bundled, `${testDomain}/main-false`, dialect);
        const result = await validate(`${testDomain}/main-false`, { foo: "anything" });
        expect(result.valid).to.equal(false);
      });

      it("should embed { [idToken]: ..., not: {} } and validate false with UUID naming", async () => {
        const bundled = await bundle(`${testDomain}/main-false`, { definitionNamingStrategy: UUID });
        const definitions = bundled[definitionsToken] as Record<string, SchemaObject>;
        const keys = Object.keys(definitions);
        expect(keys.length).to.equal(1);
        expect(definitions[keys[0]]).to.eql({
          [idToken]: `${testDomain}/external-false`,
          [notToken]: {}
        });

        unregisterSchema(`${testDomain}/main-false`);
        unregisterSchema(`${testDomain}/external-false`);

        registerSchema(bundled, `${testDomain}/main-false`, dialect);
        const result = await validate(`${testDomain}/main-false`, { foo: "anything" });
        expect(result.valid).to.equal(false);
      });
    });

    describe("external true schema", () => {
      beforeEach(() => {
        registerSchema(true, `${testDomain}/external-true`, dialect);
        registerSchema({
          type: "object",
          properties: {
            foo: { $ref: `${testDomain}/external-true` }
          }
        }, `${testDomain}/main-true`, dialect);
      });

      afterEach(() => {
        unregisterSchema(`${testDomain}/main-true`);
        unregisterSchema(`${testDomain}/external-true`);
      });

      it("should embed { [idToken]: ... } and validate true with URI naming", async () => {
        const bundled = await bundle(`${testDomain}/main-true`, { definitionNamingStrategy: URI });
        const definitions = bundled[definitionsToken] as Record<string, SchemaObject>;

        expect(definitions[`${testDomain}/external-true`]).to.eql({
          [idToken]: `${testDomain}/external-true`
        });

        unregisterSchema(`${testDomain}/main-true`);
        unregisterSchema(`${testDomain}/external-true`);

        registerSchema(bundled, `${testDomain}/main-true`, dialect);
        const result = await validate(`${testDomain}/main-true`, { foo: "anything" });
        expect(result.valid).to.equal(true);
      });

      it("should embed { [idToken]: ... } and validate true with UUID naming", async () => {
        const bundled = await bundle(`${testDomain}/main-true`, { definitionNamingStrategy: UUID });
        const definitions = bundled[definitionsToken] as Record<string, SchemaObject>;
        const keys = Object.keys(definitions);
        expect(keys.length).to.equal(1);
        expect(definitions[keys[0]]).to.eql({
          [idToken]: `${testDomain}/external-true`
        });

        unregisterSchema(`${testDomain}/main-true`);
        unregisterSchema(`${testDomain}/external-true`);

        registerSchema(bundled, `${testDomain}/main-true`, dialect);
        const result = await validate(`${testDomain}/main-true`, { foo: "anything" });
        expect(result.valid).to.equal(true);
      });
    });

    describe("nested property references to external boolean schemas", () => {
      beforeEach(() => {
        registerSchema(false, `${testDomain}/external-nested-false`, dialect);
        registerSchema(true, `${testDomain}/external-nested-true`, dialect);
        registerSchema({
          type: "object",
          properties: {
            foo: { $ref: `${testDomain}/external-nested-false` },
            bar: { $ref: `${testDomain}/external-nested-true` }
          }
        }, `${testDomain}/main-nested`, dialect);
      });

      afterEach(() => {
        unregisterSchema(`${testDomain}/main-nested`);
        unregisterSchema(`${testDomain}/external-nested-false`);
        unregisterSchema(`${testDomain}/external-nested-true`);
      });

      it("should bundle nested properties referencing boolean schemas", async () => {
        const bundled = await bundle(`${testDomain}/main-nested`);
        const definitions = bundled[definitionsToken] as Record<string, SchemaObject>;

        expect(definitions[`${testDomain}/external-nested-false`]).to.eql({
          [idToken]: `${testDomain}/external-nested-false`,
          [notToken]: {}
        });
        expect(definitions[`${testDomain}/external-nested-true`]).to.eql({
          [idToken]: `${testDomain}/external-nested-true`
        });

        unregisterSchema(`${testDomain}/main-nested`);
        unregisterSchema(`${testDomain}/external-nested-false`);
        unregisterSchema(`${testDomain}/external-nested-true`);

        registerSchema(bundled, `${testDomain}/main-nested`, dialect);
        const validResult = await validate(`${testDomain}/main-nested`, { bar: "anything" });
        expect(validResult.valid).to.equal(true);

        const invalidResult = await validate(`${testDomain}/main-nested`, { foo: "anything" });
        expect(invalidResult.valid).to.equal(false);
      });
    });
  });
};

describe("bundle - boolean schemas", () => {
  testRunner("https://json-schema.org/v1");
  testRunner("https://json-schema.org/draft/2020-12/schema");
  testRunner("https://json-schema.org/draft/2019-09/schema");
  testRunner("http://json-schema.org/draft-07/schema");
  testRunner("http://json-schema.org/draft-06/schema");
});
