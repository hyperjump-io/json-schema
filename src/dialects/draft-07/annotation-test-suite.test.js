import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft07Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema({ dialects: [draft07Dialect] });

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite draft-07 annotations",
  version: 7,
  dialect: draft07Dialect,
  jsonSchema: jsonSchema,
  skip: new Set([
    // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
    // merged yet.
    "|unknown.json|`unknownKeyword` is an annotation"
  ])
});
