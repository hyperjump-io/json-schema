import { describeAnnotationTestSuite, testSuiteJsonSchema } from "../../../test/test-suite.js";
import { v1Dialect } from "./index.js";

describeAnnotationTestSuite({
  description: "JSON-Schema-Test-Suite v1 annotations",
  // v1 is in the spec but not released, so the suite calls it 9999
  version: 9999,
  dialect: v1Dialect,
  jsonSchema: testSuiteJsonSchema(),
  skip: new Set([
    // It has a 2020-12 $schema. It's fixed in the suite, but the fix isn't
    // merged yet.
    "|unknown.json|`unknownKeyword` is an annotation"
  ])
});
