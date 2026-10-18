import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../test-suite.js";
import { addDraft202012, draft202012Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema();
addDraft202012(jsonSchema);

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite 2020-12 annotations",
  version: 2020,
  dialect: draft202012Dialect,
  jsonSchema: jsonSchema
});
