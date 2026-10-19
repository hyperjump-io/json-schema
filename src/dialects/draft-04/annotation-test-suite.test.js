import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { addDraft04, draft04Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema();
addDraft04(jsonSchema);

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite draft-04 annotations",
  version: 4,
  dialect: draft04Dialect,
  jsonSchema: jsonSchema,
  skip: new Set([
    // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
    // merged yet.
    "|unknown.json|`unknownKeyword` is an annotation"
  ])
});
