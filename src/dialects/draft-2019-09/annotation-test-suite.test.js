import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { addDraft201909, draft201909Dialect } from "./index.js";

const jsonSchema = testSuiteJsonSchema();
addDraft201909(jsonSchema);

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite 2019-09 annotations",
  version: 2019,
  dialect: draft201909Dialect,
  jsonSchema: jsonSchema,
  skip: new Set([
    // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
    // merged yet.
    "|unknown.json|`unknownKeyword` is an annotation"
  ])
});
