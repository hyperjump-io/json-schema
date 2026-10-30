import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { draft06Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema({ dialects: [draft06Dialect] });

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
