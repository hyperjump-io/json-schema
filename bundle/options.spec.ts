import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { bundle } from "./index.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import { getKeywordName } from "../lib/experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";

import type { SchemaObject } from "../lib/index.js";


const testDomain = "https://bundler.hyperjump.io";

const testRunner = (dialect: string) => {
  describe(dialect, () => {
    describe("externalSchemas", () => {
      beforeAll(() => {
        registerSchema({
          type: "object",
          properties: {
            foo: { $ref: "/string" },
            bar: { $ref: "/number" }
          }
        }, `${testDomain}/main`, dialect);

        registerSchema({
          type: "string"
        }, `${testDomain}/string`, dialect);

        registerSchema({
          type: "number"
        }, `${testDomain}/number`, dialect);
      });

      afterAll(() => {
        unregisterSchema(`${testDomain}/main`);
        unregisterSchema(`${testDomain}/string`);
        unregisterSchema(`${testDomain}/number`);
      });

      it("should not be included in the bundle", async () => {
        const bundledSchema = await bundle(`${testDomain}/main`, { externalSchemas: [`${testDomain}/string`] });

        const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");

        expect(bundledSchema[definitionsToken]).to.not.haveOwnProperty(`${testDomain}/string`);
      });
    });

    describe("alwaysIncludeDialect", () => {
      beforeAll(() => {
        registerSchema({
          type: "object",
          properties: {
            foo: { $ref: "/string" }
          }
        }, `${testDomain}/main`, dialect);

        registerSchema({
          type: "string"
        }, `${testDomain}/string`, dialect);
      });

      afterAll(() => {
        unregisterSchema(`${testDomain}/main`);
        unregisterSchema(`${testDomain}/string`);
      });

      it("$schema should appear in all embedded schemas", async () => {
        const bundledSchema = await bundle(`${testDomain}/main`, { alwaysIncludeDialect: true });

        const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
        const definitions = bundledSchema[definitionsToken] as Record<string, SchemaObject>;
        const embeddedSchema = definitions.string;

        const legacyIdToken = getKeywordName(dialect, "https://json-schema.org/keyword/draft-04/id");
        const expectedDialect = legacyIdToken ? dialect + "#" : dialect;

        expect(embeddedSchema.$schema as string).to.equal(expectedDialect);
      });
    });
  });
};

describe("bundle", () => {
  testRunner("https://json-schema.org/validation");
  testRunner("https://json-schema.org/draft/2020-12/schema");
  testRunner("https://json-schema.org/draft/2019-09/schema");
  testRunner("http://json-schema.org/draft-07/schema");
  testRunner("http://json-schema.org/draft-06/schema");
  testRunner("http://json-schema.org/draft-04/schema");
});
