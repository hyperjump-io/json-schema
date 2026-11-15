import { toId } from "../identifiers.js";
import { describe, test, expect } from "vitest";
import { jsonSchemaConfig } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "./v1/index.js";
import { draft04Dialect, draft04DialectUri } from "./draft-04/index.js";
import { draft06Dialect, draft06DialectUri } from "./draft-06/index.js";
import { draft07Dialect, draft07DialectUri } from "./draft-07/index.js";
import { draft201909Dialect, draft201909DialectUri } from "./draft-2019-09/index.js";
import { draft202012Dialect, draft202012DialectUri } from "./draft-2020-12/index.js";
import { definitionsOf } from "../definition-of.js";

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
  test("the media types have no dialects unless they're in the options", () => {
    const jsonSchema = jsonSchemaConfig();

    for (const [, , dialectUri] of dialects) {
      expect(toId(dialectUri) in definitionsOf(jsonSchema).dialects, dialectUri).to.equal(false);
    }
  });

  test("every dialect can be in one config", () => {
    const jsonSchema = jsonSchemaConfig({ dialects: dialects.map(([, dialect]) => dialect) });

    for (const [, , dialectUri] of dialects) {
      expect(toId(dialectUri) in definitionsOf(jsonSchema).dialects, dialectUri).to.equal(true);
    }
  });

  describe.each(dialects)("%s", (_name, dialect, dialectUri) => {
    test("brings every keyword and format it uses", () => {
      const jsonSchema = jsonSchemaConfig({ dialects: [dialect] });

      const added = definitionsOf(jsonSchema).dialects[toId(dialectUri)];
      for (const uri of Object.values(added.keywords)) {
        expect(uri in definitionsOf(jsonSchema).keywords, uri).to.equal(true);
      }
      for (const uri of Object.values(added.formats ?? {})) {
        expect(uri in definitionsOf(jsonSchema).formats, uri).to.equal(!fullOnly.has(uri));
      }
    });

    test("a keyword in the config replaces the dialect's", () => {
      const type = { uri: "https://json-schema.org/keyword/type", shape: /** @type const */ ("data") };
      const jsonSchema = jsonSchemaConfig({ dialects: [dialect], keywords: [type] });

      expect(definitionsOf(jsonSchema).keywords[type.uri]).to.equal(type);
    });

    test("it can't be in the config twice", () => {
      expect(() => jsonSchemaConfig({ dialects: [dialect, dialect] })).to.throw("more than once");
    });
  });
});
