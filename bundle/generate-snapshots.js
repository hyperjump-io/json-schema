import { writeFile, mkdir, rm } from "node:fs/promises";
import { isCompatible, md5, loadSchemas, testSuite, unloadSchemas } from "./test-utils.js";
import { validate } from "../lib/index.js";
import { VERBOSE } from "../lib/experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";


const suite = testSuite("./bundle/tests");

const snapshotGenerator = async (version, dialect) => {
  for (const testCase of suite) {
    if (!isCompatible(testCase.compatibility, version)) {
      continue;
    }

    const mainSchemaUri = "https://bundler.hyperjump.io/main";

    let testIndex = 0;
    for (const test of testCase.tests) {
      loadSchemas(testCase, mainSchemaUri, dialect);
      const expectedOutput = await validate(mainSchemaUri, test.instance, VERBOSE);
      unloadSchemas(testCase, mainSchemaUri);

      const testId = md5(`${version}|${dialect}|${testCase.description}|${testIndex}`);
      await writeFile(`./bundle/snapshots/${testId}`, JSON.stringify(expectedOutput, null, "  "));
      testIndex++;
    }
  }
};

(async function () {
  await rm("./bundle/snapshots", { recursive: true });
  await mkdir("./bundle/snapshots");
  await snapshotGenerator(9999, "https://json-schema.org/validation");
  await snapshotGenerator(2020, "https://json-schema.org/draft/2020-12/schema");
  await snapshotGenerator(2019, "https://json-schema.org/draft/2019-09/schema");
  await snapshotGenerator(7, "http://json-schema.org/draft-07/schema");
  await snapshotGenerator(6, "http://json-schema.org/draft-06/schema");
  await snapshotGenerator(4, "http://json-schema.org/draft-04/schema");
}());
