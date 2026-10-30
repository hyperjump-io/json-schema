import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft202012Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema({ dialects: [draft202012Dialect] });

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite 2020-12 annotations",
  version: 2020,
  dialect: draft202012Dialect,
  jsonSchema: jsonSchema
});
