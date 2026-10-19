import { describe, test, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "./v1/index.js";
import { addDraft04, draft04DialectUri } from "./draft-04/index.js";
import { addDraft06, draft06DialectUri } from "./draft-06/index.js";
import { addDraft07, draft07DialectUri } from "./draft-07/index.js";
import { addDraft201909, draft201909DialectUri } from "./draft-2019-09/index.js";
import { addDraft202012, draft202012DialectUri } from "./draft-2020-12/index.js";

/** @type [string, (jsonSchema: JsonSchema) => void, string][] */
const presets = [
  ["v1", addV1, v1DialectUri],
  ["draft-04", addDraft04, draft04DialectUri],
  ["draft-06", addDraft06, draft06DialectUri],
  ["draft-07", addDraft07, draft07DialectUri],
  ["draft-2019-09", addDraft201909, draft201909DialectUri],
  ["draft-2020-12", addDraft202012, draft202012DialectUri]
];

/** Formats that need large tables of Unicode data, which only the full formats add */
const fullOnly = new Set([
  "https://json-schema.org/format/hostname",
  "https://json-schema.org/format/idn-hostname",
  "https://json-schema.org/format/idn-email"
]);

describe("presets", () => {
  test("a JsonSchema has no dialects until a preset is added", () => {
    const jsonSchema = new JsonSchema();

    for (const [, , dialectUri] of presets) {
      expect(jsonSchema.hasDialect(dialectUri), dialectUri).to.equal(false);
    }
  });

  describe.each(presets)("%s", (_name, addPreset, dialectUri) => {
    test("adds every keyword and format its dialect uses, on its own", () => {
      const jsonSchema = new JsonSchema();
      addPreset(jsonSchema);

      const dialect = jsonSchema.getDialect(dialectUri);
      for (const uri of Object.values(dialect.keywords)) {
        expect(jsonSchema.hasKeyword(uri), uri).to.equal(true);
      }
      for (const uri of Object.values(dialect.formats ?? {})) {
        expect(jsonSchema.hasFormat(uri), uri).to.equal(!fullOnly.has(uri));
      }
    });

    test("a keyword that was replaced stays replaced", () => {
      const jsonSchema = new JsonSchema();
      const type = { uri: "https://json-schema.org/keyword/type", shape: /** @type const */ ("data") };
      jsonSchema.addKeyword(type);
      addPreset(jsonSchema);

      expect(jsonSchema.getKeyword(type.uri)).to.equal(type);
    });

    test("adding it twice throws without changing anything", () => {
      const jsonSchema = new JsonSchema();
      addPreset(jsonSchema);
      const type = { uri: "https://json-schema.org/keyword/type", shape: /** @type const */ ("data") };
      jsonSchema.addKeyword(type);

      expect(() => addPreset(jsonSchema)).to.throw();
      expect(jsonSchema.getKeyword(type.uri)).to.equal(type);
    });
  });
});
