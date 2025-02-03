import { test, expect, describe } from "vitest";
import { getAllSchemas } from "./experimental.js";
import { registerSchema } from "./schema.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-04/index.js";
import "../draft-06/index.js";
import "../draft-07/index.js";
import "../openapi-3-0/index.js";
import "../openapi-3-1/index.js";
import "../stable/index.js";

describe("getAllSchemas function", () => {
  test("should return all registered schema URIs", () => {
    const schemaUris = getAllSchemas();
    expect(schemaUris).toEqual([
      "https://json-schema.org/draft/2020-12/schema",
      "https://json-schema.org/draft/2020-12/meta/core",
      "https://json-schema.org/draft/2020-12/meta/applicator",
      "https://json-schema.org/draft/2020-12/meta/validation",
      "https://json-schema.org/draft/2020-12/meta/meta-data",
      "https://json-schema.org/draft/2020-12/meta/format-annotation",
      "https://json-schema.org/draft/2020-12/meta/format-assertion",
      "https://json-schema.org/draft/2020-12/meta/content",
      "https://json-schema.org/draft/2020-12/meta/unevaluated",
      "https://json-schema.org/draft/2019-09/schema",
      "https://json-schema.org/draft/2019-09/meta/core",
      "https://json-schema.org/draft/2019-09/meta/applicator",
      "https://json-schema.org/draft/2019-09/meta/validation",
      "https://json-schema.org/draft/2019-09/meta/meta-data",
      "https://json-schema.org/draft/2019-09/meta/format",
      "https://json-schema.org/draft/2019-09/meta/content",
      "http://json-schema.org/draft-04/schema",
      "http://json-schema.org/draft-06/schema",
      "http://json-schema.org/draft-07/schema",
      "https://spec.openapis.org/oas/3.0/dialect",
      "https://spec.openapis.org/oas/3.0/schema",
      "https://spec.openapis.org/oas/3.0/schema/latest",
      "https://spec.openapis.org/oas/3.1/meta/base",
      "https://spec.openapis.org/oas/3.1/dialect/base",
      "https://spec.openapis.org/oas/3.1/schema",
      "https://spec.openapis.org/oas/3.1/schema/latest",
      "https://spec.openapis.org/oas/3.1/schema-base",
      "https://spec.openapis.org/oas/3.1/schema-base/latest",
      "https://spec.openapis.org/oas/3.1/schema-draft-2020-12",
      "https://spec.openapis.org/oas/3.1/schema-draft-2019-09",
      "https://spec.openapis.org/oas/3.1/schema-draft-07",
      "https://spec.openapis.org/oas/3.1/schema-draft-06",
      "https://spec.openapis.org/oas/3.1/schema-draft-04",
      "https://json-schema.org/validation",
      "https://json-schema.org/meta/core",
      "https://json-schema.org/meta/applicator",
      "https://json-schema.org/meta/validation",
      "https://json-schema.org/meta/meta-data",
      "https://json-schema.org/meta/format-annotation",
      "https://json-schema.org/meta/format-assertion",
      "https://json-schema.org/meta/content",
      "https://json-schema.org/meta/unevaluated",
    ]);
  });

  test("should return all schemas along with custom registered schemas", () => {
    registerSchema({
      "$id": "http://example.com/custom-schema",
      "$schema": "https://json-schema.org/draft/2020-12/schema"
    });

    const schemaUris = getAllSchemas();
    expect(schemaUris).toEqual([
        "https://json-schema.org/draft/2020-12/schema",
        "https://json-schema.org/draft/2020-12/meta/core",
        "https://json-schema.org/draft/2020-12/meta/applicator",
        "https://json-schema.org/draft/2020-12/meta/validation",
        "https://json-schema.org/draft/2020-12/meta/meta-data",
        "https://json-schema.org/draft/2020-12/meta/format-annotation",
        "https://json-schema.org/draft/2020-12/meta/format-assertion",
        "https://json-schema.org/draft/2020-12/meta/content",
        "https://json-schema.org/draft/2020-12/meta/unevaluated",
        "https://json-schema.org/draft/2019-09/schema",
        "https://json-schema.org/draft/2019-09/meta/core",
        "https://json-schema.org/draft/2019-09/meta/applicator",
        "https://json-schema.org/draft/2019-09/meta/validation",
        "https://json-schema.org/draft/2019-09/meta/meta-data",
        "https://json-schema.org/draft/2019-09/meta/format",
        "https://json-schema.org/draft/2019-09/meta/content",
        "http://json-schema.org/draft-04/schema",
        "http://json-schema.org/draft-06/schema",
        "http://json-schema.org/draft-07/schema",
        "https://spec.openapis.org/oas/3.0/dialect",
        "https://spec.openapis.org/oas/3.0/schema",
        "https://spec.openapis.org/oas/3.0/schema/latest",
        "https://spec.openapis.org/oas/3.1/meta/base",
        "https://spec.openapis.org/oas/3.1/dialect/base",
        "https://spec.openapis.org/oas/3.1/schema",
        "https://spec.openapis.org/oas/3.1/schema/latest",
        "https://spec.openapis.org/oas/3.1/schema-base",
        "https://spec.openapis.org/oas/3.1/schema-base/latest",
        "https://spec.openapis.org/oas/3.1/schema-draft-2020-12",
        "https://spec.openapis.org/oas/3.1/schema-draft-2019-09",
        "https://spec.openapis.org/oas/3.1/schema-draft-07",
        "https://spec.openapis.org/oas/3.1/schema-draft-06",
        "https://spec.openapis.org/oas/3.1/schema-draft-04",
        "https://json-schema.org/validation",
        "https://json-schema.org/meta/core",
        "https://json-schema.org/meta/applicator",
        "https://json-schema.org/meta/validation",
        "https://json-schema.org/meta/meta-data",
        "https://json-schema.org/meta/format-annotation",
        "https://json-schema.org/meta/format-assertion",
        "https://json-schema.org/meta/content",
        "https://json-schema.org/meta/unevaluated",
        "http://example.com/custom-schema"
      ]);
  });
});
