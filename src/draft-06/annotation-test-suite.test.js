import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../test-suite.js";
import { addDraft06, draft06Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema();
addDraft06(jsonSchema);

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite draft-06 annotations",
  version: 6,
  dialect: draft06Dialect,
  jsonSchema: jsonSchema,
  skip: new Set([
    // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
    // merged yet.
    "|unknown.json|`unknownKeyword` is an annotation"
  ])
});
