import { test, expect, describe } from "vitest";
import { getDialectIds, loadDialect } from "./keywords.js";
import "../draft-2020-12";
import "../draft-2019-09";
import "../draft-04";
import "../draft-06";
import "../draft-07";
import "../openapi-3-0";
import "../openapi-3-1";
import "../stable";


describe("getDialectIds function", () => {
  test("should return only imported schema in the array if no custom dialects are loaded", () => {
    const dialectIds = getDialectIds();
    expect(dialectIds).toEqual([
      "https://json-schema.org/draft/2020-12/schema",
      "https://json-schema.org/draft/2019-09/schema",
      "http://json-schema.org/draft-04/schema",
      "http://json-schema.org/draft-06/schema",
      "http://json-schema.org/draft-07/schema",
      "https://spec.openapis.org/oas/3.0/dialect",
      "https://spec.openapis.org/oas/3.0/schema",
      "https://spec.openapis.org/oas/3.1/dialect/base",
      "https://spec.openapis.org/oas/3.1/schema-base",
      "https://spec.openapis.org/oas/3.1/schema-base/latest",
      "https://spec.openapis.org/oas/3.1/schema-draft-2020-12",
      "https://spec.openapis.org/oas/3.1/schema-draft-2019-09",
      "https://spec.openapis.org/oas/3.1/schema-draft-07",
      "https://spec.openapis.org/oas/3.1/schema-draft-06",
      "https://spec.openapis.org/oas/3.1/schema-draft-04",
      "https://json-schema.org/validation"
    ]);
  });

  test("returns an array of dialect identifiers that are either imported in the file or loaded as custom dialects", () => {
    //Load some dialects before each test
    loadDialect("http://example.com/dialect1", {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
      "https://json-schema.org/draft/2020-12/vocab/applicator": true
    });
    loadDialect("http://example.com/dialect2", {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
      "https://json-schema.org/draft/2020-12/vocab/applicator": true
    });
    const dialectIds = getDialectIds();
    expect(dialectIds).toEqual([
      "https://json-schema.org/draft/2020-12/schema",
      "https://json-schema.org/draft/2019-09/schema",
      "http://json-schema.org/draft-04/schema",
      "http://json-schema.org/draft-06/schema",
      "http://json-schema.org/draft-07/schema",
      "https://spec.openapis.org/oas/3.0/dialect",
      "https://spec.openapis.org/oas/3.0/schema",
      "https://spec.openapis.org/oas/3.1/dialect/base",
      "https://spec.openapis.org/oas/3.1/schema-base",
      "https://spec.openapis.org/oas/3.1/schema-base/latest",
      "https://spec.openapis.org/oas/3.1/schema-draft-2020-12",
      "https://spec.openapis.org/oas/3.1/schema-draft-2019-09",
      "https://spec.openapis.org/oas/3.1/schema-draft-07",
      "https://spec.openapis.org/oas/3.1/schema-draft-06",
      "https://spec.openapis.org/oas/3.1/schema-draft-04",
      "https://json-schema.org/validation",
      "http://example.com/dialect1",
      "http://example.com/dialect2"
    ]);
  });
});
