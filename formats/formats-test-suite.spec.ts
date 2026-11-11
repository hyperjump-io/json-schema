import { runTestSuite } from "../lib/test-utils.js";
import { setShouldValidateFormat } from "../lib/index.js";
import "./index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";


setShouldValidateFormat(true);

const options = {
  include: "format-*.json",
  tags: new Set(["format-assertion"])
};

runTestSuite(2020, "https://json-schema.org/draft/2020-12/schema", new Set(), options);
runTestSuite(2019, "https://json-schema.org/draft/2019-09/schema", new Set(), options);
runTestSuite(7, "http://json-schema.org/draft-07/schema", new Set(), options);
runTestSuite(6, "http://json-schema.org/draft-06/schema", new Set(), options);
runTestSuite(4, "http://json-schema.org/draft-04/schema", new Set(), options);
