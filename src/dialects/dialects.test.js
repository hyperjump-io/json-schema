import { describe, test, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "./v1/index.js";
import { draft04Dialect, draft04DialectUri } from "./draft-04/index.js";
import { draft06Dialect, draft06DialectUri } from "./draft-06/index.js";
import { draft07Dialect, draft07DialectUri } from "./draft-07/index.js";
import { draft201909Dialect, draft201909DialectUri } from "./draft-2019-09/index.js";
import { draft202012Dialect, draft202012DialectUri } from "./draft-2020-12/index.js";

/**
 * @import { DialectConfig } from "../dialect.d.ts"
 */

/** @type [string, DialectConfig, string][] */
const dialects = [
  ["v1", v1Dialect, v1DialectUri],
  ["draft-04", draft04Dialect, draft04DialectUri],
  ["draft-06", draft06Dialect, draft06DialectUri],
  ["draft-07", draft07Dialect, draft07DialectUri],
  ["draft-2019-09", draft201909Dialect, draft201909DialectUri],
  ["draft-2020-12", draft202012Dialect, draft202012DialectUri]
];

/** Formats that need large tables of Unicode data, which only the full formats add */
const fullOnly = new Set([
  "https://json-schema.org/format/hostname",
  "https://json-schema.org/format/idn-hostname",
  "https://json-schema.org/format/idn-email"
]);

describe("dialects", () => {
  test("a JsonSchema has no dialects unless they're in its config", () => {
    const jsonSchema = new JsonSchema();

    for (const [, , dialectUri] of dialects) {
      expect(jsonSchema.hasDialect(dialectUri), dialectUri).to.equal(false);
    }
  });

  test("every dialect can be in one config", () => {
    const jsonSchema = new JsonSchema({ dialects: dialects.map(([, dialect]) => dialect) });

    for (const [, , dialectUri] of dialects) {
      expect(jsonSchema.hasDialect(dialectUri), dialectUri).to.equal(true);
    }
  });

  describe.each(dialects)("%s", (_name, dialect, dialectUri) => {
    test("brings every keyword and format it uses", () => {
      const jsonSchema = new JsonSchema({ dialects: [dialect] });

      const added = jsonSchema.getDialect(dialectUri);
      for (const uri of Object.values(added.keywords)) {
        expect(jsonSchema.hasKeyword(uri), uri).to.equal(true);
      }
      for (const uri of Object.values(added.formats ?? {})) {
        expect(jsonSchema.hasFormat(uri), uri).to.equal(!fullOnly.has(uri));
      }
    });

    test("a keyword in the config replaces the dialect's", () => {
      const type = { uri: "https://json-schema.org/keyword/type", shape: /** @type const */ ("data") };
      const jsonSchema = new JsonSchema({ dialects: [dialect], keywords: [type] });

      expect(jsonSchema.getKeyword(type.uri)).to.equal(type);
    });

    test("it can't be in the config twice", () => {
      expect(() => new JsonSchema({ dialects: [dialect, dialect] })).to.throw("more than once");
    });
  });
});
