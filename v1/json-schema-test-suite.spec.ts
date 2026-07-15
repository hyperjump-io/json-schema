import "./index.js";
import "../formats/index.js";
import { runTestSuite } from "../lib/test-utils.js";


runTestSuite(9999, "https://json-schema.org/v1", new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|9999|id.json|$id with file URI still resolves pointers - *nix",
  "|9999|id.json|$id with file URI still resolves pointers - windows"
]));

runTestSuite(9999, "https://json-schema.org/v1", new Set<string>(), "./v1/extension-tests");
