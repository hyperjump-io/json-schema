import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bundle } from "./index.js";
import { registerSchema, unregisterSchema, validate } from "../lib/index.js";
import { getKeywordName } from "../lib/experimental.js";
import "../v1/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";

import type { SchemaObject } from "../lib/index.js";


const testDomain = "https://bundler.hyperjump.io";

const testRunner = (dialect: string) => {
  describe(dialect, () => {
    describe("root $ref to a fragment of an external schema", () => {
      const mainUri = `${testDomain}/main`;
      const subUri = `${testDomain}/sub`;
      const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
      const idToken = getKeywordName(dialect, "https://json-schema.org/keyword/id")
        || getKeywordName(dialect, "https://json-schema.org/keyword/draft-04/id");
      const refToken = getKeywordName(dialect, "https://json-schema.org/keyword/ref")
        || getKeywordName(dialect, "https://json-schema.org/keyword/draft-04/ref");

      beforeEach(() => {
        registerSchema({
          [definitionsToken]: {
            integer: { type: "integer" }
          }
        }, subUri, dialect);

        registerSchema({
          [refToken]: `${subUri}#/${definitionsToken}/integer`
        }, mainUri, dialect);
      });

      afterEach(() => {
        unregisterSchema(mainUri);
        unregisterSchema(subUri);
      });

      it("should keep the root $ref and embed the referenced document", async () => {
        const bundledSchema = await bundle(mainUri);
        const definitions = bundledSchema[definitionsToken] as Record<string, SchemaObject>;

        expect(bundledSchema[idToken]).to.equal(mainUri);
        expect(bundledSchema[refToken]).to.equal(`${subUri}#/${definitionsToken}/integer`);
        expect(definitions).to.haveOwnProperty(subUri);
        expect(definitions[subUri][idToken]).to.equal(subUri);
      });

      it("should validate the same after bundling", async () => {
        expect((await validate(mainUri, "a")).valid).to.equal(false);
        expect((await validate(mainUri, 1)).valid).to.equal(true);

        const bundledSchema = await bundle(mainUri);
        unregisterSchema(mainUri);
        unregisterSchema(subUri);
        registerSchema(bundledSchema, mainUri, dialect);

        expect((await validate(mainUri, "a")).valid).to.equal(false);
        expect((await validate(mainUri, 1)).valid).to.equal(true);
      });
    });
  });
};

describe("bundle", () => {
  testRunner("https://json-schema.org/v1");
  testRunner("https://json-schema.org/draft/2020-12/schema");
  testRunner("https://json-schema.org/draft/2019-09/schema");
  testRunner("http://json-schema.org/draft-07/schema");
  testRunner("http://json-schema.org/draft-06/schema");
  testRunner("http://json-schema.org/draft-04/schema");
});
