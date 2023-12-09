import { describe, it, expect } from "vitest";
import { bundle } from "./index.js";
import { addSchema } from "../lib/index.js";
import { getKeywordName } from "../lib/keywords.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";

import type { SchemaObject } from "../lib/schema.js";


const testDomain = "https://bundler.hyperjump.io";

const testRunner = (dialect: string) => {
  describe(dialect, () => {
    it("Schemas in 'externalSchemas' should not be included in the bundle", async () => {
      addSchema({
        type: "object",
        properties: {
          foo: { $ref: "/string" },
          bar: { $ref: "/number" }
        }
      }, `${testDomain}/main`, dialect);

      addSchema({
        type: "string"
      }, `${testDomain}/string`, dialect);

      addSchema({
        type: "number"
      }, `${testDomain}/number`, dialect);

      const bundledSchema = await bundle(`${testDomain}/main`, { externalSchemas: [`${testDomain}/string`] });

      const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");

      expect(bundledSchema[definitionsToken]).to.not.haveOwnProperty(`${testDomain}/string`);
    });

    it("$schema should appear in all embedded schemas when 'alwaysIncludeDialect' option is used", async () => {
      addSchema({
        type: "object",
        properties: {
          foo: { $ref: "/string" }
        }
      }, `${testDomain}/main`, dialect);

      addSchema({
        type: "string"
      }, `${testDomain}/string`, dialect);

      const bundledSchema = await bundle(`${testDomain}/main`, { alwaysIncludeDialect: true });

      const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
      const definitions = bundledSchema[definitionsToken] as Record<string, SchemaObject>;
      const embeddedSchema = definitions[`${testDomain}/string`];

      expect(embeddedSchema.$schema as string).to.equal(dialect);
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
