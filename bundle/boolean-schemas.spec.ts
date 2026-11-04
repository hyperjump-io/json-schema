import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bundle, URI, UUID } from "./index.js";
import { registerSchema, unregisterSchema, validate } from "../lib/index.js";
import { loadDialect, unloadDialect, defineVocabulary } from "../lib/experimental.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../v1/index.js";

import type { SchemaObject } from "../lib/index.js";


describe("bundle - boolean schemas", () => {
  const testDomain = "https://bundler.hyperjump.io";
  const mainId = `${testDomain}/main`;
  const externalId = `${testDomain}/external`;

  afterEach(() => {
    unregisterSchema(mainId);
    unregisterSchema(externalId);
  });

  describe("Issue #139 reproduction", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";

    it("external false schema produces valid: false before and after bundling", async () => {
      registerSchema(false, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });

    it("external true schema produces valid: true before and after bundling", async () => {
      registerSchema(true, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(true);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(true);
    });
  });

  const dialects = [
    "https://json-schema.org/v1",
    "https://json-schema.org/draft/2020-12/schema",
    "https://json-schema.org/draft/2019-09/schema",
    "http://json-schema.org/draft-07/schema",
    "http://json-schema.org/draft-06/schema"
  ];

  for (const dialect of dialects) {
    describe(`dialect: ${dialect}`, () => {
      for (const namingStrategy of [URI, UUID]) {
        describe(`naming strategy: ${namingStrategy}`, () => {
          it("bundles external false schema and preserves invalid outcome", async () => {
            registerSchema(false, externalId, dialect);
            registerSchema({
              $id: mainId,
              $schema: dialect,
              $ref: externalId
            }, mainId);

            const before = await validate(mainId, "test-instance");
            expect(before.valid).to.equal(false);

            const bundled = await bundle(mainId, { definitionNamingStrategy: namingStrategy });

            unregisterSchema(mainId);
            unregisterSchema(externalId);

            registerSchema(bundled, mainId);

            const after = await validate(mainId, "test-instance");
            expect(after.valid).to.equal(false);
          });

          it("bundles external true schema and preserves valid outcome", async () => {
            registerSchema(true, externalId, dialect);
            registerSchema({
              $id: mainId,
              $schema: dialect,
              $ref: externalId
            }, mainId);

            const before = await validate(mainId, "test-instance");
            expect(before.valid).to.equal(true);

            const bundled = await bundle(mainId, { definitionNamingStrategy: namingStrategy });

            unregisterSchema(mainId);
            unregisterSchema(externalId);

            registerSchema(bundled, mainId);

            const after = await validate(mainId, "test-instance");
            expect(after.valid).to.equal(true);
          });
        });
      }

      it("bundles root false schema standalone", async () => {
        registerSchema(false, mainId, dialect);

        const before = await validate(mainId, 42);
        expect(before.valid).to.equal(false);

        const bundled = await bundle(mainId);

        unregisterSchema(mainId);
        registerSchema(bundled, mainId);

        const after = await validate(mainId, 42);
        expect(after.valid).to.equal(false);
      });

      it("bundles root true schema standalone", async () => {
        registerSchema(true, mainId, dialect);

        const before = await validate(mainId, 42);
        expect(before.valid).to.equal(true);

        const bundled = await bundle(mainId);

        unregisterSchema(mainId);
        registerSchema(bundled, mainId);

        const after = await validate(mainId, 42);
        expect(after.valid).to.equal(true);
      });
    });
  }

  describe("dialect lacking not keyword", () => {
    const noNotDialect = "https://example.com/no-not-bundle-dialect";

    beforeEach(() => {
      loadDialect(noNotDialect, {
        "https://json-schema.org/v1/vocab/core": true
      }, false, false);
      registerSchema({ $id: noNotDialect }, noNotDialect, "https://json-schema.org/v1");
    });

    afterEach(() => {
      unloadDialect(noNotDialect);
      unregisterSchema(noNotDialect);
    });

    it("throws a descriptive error when bundling external false schema", async () => {
      registerSchema(false, externalId, noNotDialect);
      registerSchema({
        $id: mainId,
        $schema: "https://json-schema.org/v1",
        $ref: externalId
      }, mainId);

      await expect(bundle(mainId)).rejects.toThrow(
        `Dialect '${noNotDialect}' does not have a 'not' keyword registered to convert a 'false' schema.`
      );
    });

    it("throws a descriptive error when bundling root false schema", async () => {
      registerSchema(false, mainId, noNotDialect);

      await expect(bundle(mainId)).rejects.toThrow(
        `Dialect '${noNotDialect}' does not have a 'not' keyword registered to convert a 'false' schema.`
      );
    });

    it("successfully bundles external true schema without not keyword", async () => {
      registerSchema(true, externalId, noNotDialect);
      registerSchema({
        $id: mainId,
        $schema: "https://json-schema.org/v1",
        $ref: externalId
      }, mainId);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const after = await validate(mainId, "any-instance");
      expect(after.valid).to.equal(true);
    });
  });

  describe("cross-dialect bundling", () => {
    it("bundles external false schema with different dialect and preserves invalid outcome", async () => {
      const mainDialect = "https://json-schema.org/draft/2020-12/schema";
      const externalDialect = "http://json-schema.org/draft-07/schema";

      registerSchema(false, externalId, externalDialect);
      registerSchema({
        $id: mainId,
        $schema: mainDialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });

    it("bundles external true schema with different dialect and preserves valid outcome", async () => {
      const mainDialect = "https://json-schema.org/draft/2020-12/schema";
      const externalDialect = "http://json-schema.org/draft-07/schema";

      registerSchema(true, externalId, externalDialect);
      registerSchema({
        $id: mainId,
        $schema: mainDialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(true);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(true);
    });
  });

  describe("transitive bundling", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";
    const middleId = `${testDomain}/middle`;
    const leafId = `${testDomain}/leaf`;

    afterEach(() => {
      unregisterSchema(middleId);
      unregisterSchema(leafId);
    });

    it("bundles transitive external false schema and preserves invalid outcome", async () => {
      registerSchema(false, leafId, dialect);
      registerSchema({
        $id: middleId,
        $schema: dialect,
        $ref: leafId
      }, middleId);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: middleId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(middleId);
      unregisterSchema(leafId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });

    it("bundles transitive external true schema and preserves valid outcome", async () => {
      registerSchema(true, leafId, dialect);
      registerSchema({
        $id: middleId,
        $schema: dialect,
        $ref: leafId
      }, middleId);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: middleId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(true);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(middleId);
      unregisterSchema(leafId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(true);
    });
  });

  describe("multiple external boolean schemas", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";
    const externalFalseId = `${testDomain}/external-false`;
    const externalTrueId = `${testDomain}/external-true`;

    afterEach(() => {
      unregisterSchema(externalFalseId);
      unregisterSchema(externalTrueId);
    });

    it("bundles both external true and external false schemas", async () => {
      registerSchema(false, externalFalseId, dialect);
      registerSchema(true, externalTrueId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        allOf: [
          { $ref: externalTrueId },
          { $ref: externalFalseId }
        ]
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId);

      unregisterSchema(mainId);
      unregisterSchema(externalFalseId);
      unregisterSchema(externalTrueId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });
  });

  describe("custom not keyword dialect bundling", () => {
    it("bundles external false schema with custom not keyword name", async () => {
      const customDialect = "https://example.com/bundle-custom-not-dialect";
      const customVocab = "https://example.com/bundle-custom-not-vocab";

      defineVocabulary(customVocab, {
        "$id": "https://json-schema.org/keyword/id",
        "$schema": "https://json-schema.org/keyword/schema",
        "$defs": "https://json-schema.org/keyword/definitions",
        "disallow": "https://json-schema.org/keyword/not"
      });

      loadDialect(customDialect, {
        [customVocab]: true
      }, false, false);
      registerSchema({ $id: customDialect }, customDialect, "https://json-schema.org/draft/2020-12/schema");

      try {
        registerSchema(false, externalId, customDialect);
        registerSchema({
          $id: mainId,
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $ref: externalId
        }, mainId);

        const bundled = await bundle(mainId);
        const defs = bundled.$defs as Record<string, SchemaObject>;
        expect(defs[externalId]).to.haveOwnProperty("disallow");
        expect(defs[externalId].disallow).to.eql({});
      } finally {
        unloadDialect(customDialect);
        unregisterSchema(customDialect);
      }
    });
  });

  describe("alwaysIncludeDialect option", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";

    it("includes $schema in external false definition and preserves invalid outcome", async () => {
      registerSchema(false, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId, { alwaysIncludeDialect: true });
      const defs = bundled.$defs as Record<string, SchemaObject>;
      expect(defs[externalId]).to.haveOwnProperty("$schema");
      expect(defs[externalId].$schema).to.equal(dialect);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });

    it("includes $schema in external true definition and preserves valid outcome", async () => {
      registerSchema(true, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: externalId
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(true);

      const bundled = await bundle(mainId, { alwaysIncludeDialect: true });
      const defs = bundled.$defs as Record<string, SchemaObject>;
      expect(defs[externalId]).to.haveOwnProperty("$schema");
      expect(defs[externalId].$schema).to.equal(dialect);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(true);
    });
  });

  describe("externalSchemas option", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";

    it("excludes external false schema from bundle", async () => {
      registerSchema(false, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        $ref: externalId
      }, mainId);

      const bundled = await bundle(mainId, { externalSchemas: [externalId] });
      expect(bundled).to.not.haveOwnProperty("$defs");

      unregisterSchema(mainId);
      // Validate with external schema still available
      registerSchema(bundled, mainId);
      const validation = await validate(mainId, 123);
      expect(validation.valid).to.equal(false);
    });
  });

  describe("multiple references to same external boolean schema", () => {
    const dialect = "https://json-schema.org/draft/2020-12/schema";

    it("bundles single definition entry when referenced multiple times", async () => {
      registerSchema(false, externalId, dialect);
      registerSchema({
        $id: mainId,
        $schema: dialect,
        allOf: [
          { $ref: externalId },
          { $ref: externalId }
        ],
        properties: {
          field: { $ref: externalId }
        }
      }, mainId);

      const beforeValidation = await validate(mainId, 123);
      expect(beforeValidation.valid).to.equal(false);

      const bundled = await bundle(mainId);
      const defs = bundled.$defs as Record<string, SchemaObject>;
      expect(Object.keys(defs)).to.have.lengthOf(1);
      expect(defs).to.haveOwnProperty(externalId);

      unregisterSchema(mainId);
      unregisterSchema(externalId);

      registerSchema(bundled, mainId);

      const afterValidation = await validate(mainId, 123);
      expect(afterValidation.valid).to.equal(false);
    });
  });

  describe("file-based bundle with external boolean schema", () => {
    const httpNumberId = "https://bundler.hyperjump.io/number";
    const dialect = "https://json-schema.org/draft/2020-12/schema";

    afterEach(() => {
      unregisterSchema(httpNumberId);
    });

    it("bundles external http false schema into file-based bundle", async () => {
      registerSchema(false, httpNumberId, dialect);

      const bundled = await bundle("./bundle/file-schemas/mixed-schemes.schema.json");
      const defs = bundled.$defs as Record<string, SchemaObject>;
      expect(defs).to.haveOwnProperty(httpNumberId);
      expect(defs[httpNumberId]).to.eql({
        $id: httpNumberId,
        not: {}
      });

      unregisterSchema(httpNumberId);
      registerSchema(bundled, `${testDomain}/file-bundled`);

      // Fails validation because bar references false schema
      const result = await validate(`${testDomain}/file-bundled`, { foo: "hello", bar: 42 });
      expect(result.valid).to.equal(false);
      unregisterSchema(`${testDomain}/file-bundled`);
    });

    it("bundles external http true schema into file-based bundle", async () => {
      registerSchema(true, httpNumberId, dialect);

      const bundled = await bundle("./bundle/file-schemas/mixed-schemes.schema.json");
      const defs = bundled.$defs as Record<string, SchemaObject>;
      expect(defs).to.haveOwnProperty(httpNumberId);
      expect(defs[httpNumberId]).to.eql({
        $id: httpNumberId
      });

      unregisterSchema(httpNumberId);
      registerSchema(bundled, `${testDomain}/file-bundled`);

      // Passes validation because foo is string and bar is true schema
      const result = await validate(`${testDomain}/file-bundled`, { foo: "hello", bar: 42 });
      expect(result.valid).to.equal(true);
      unregisterSchema(`${testDomain}/file-bundled`);
    });
  });
});
