import "./index.js";
import { runTestSuite } from "../lib/test-utils.js";


runTestSuite(2019, "https://json-schema.org/draft/2019-09/schema", new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|2019|id.json|$id with file URI still resolves pointers - *nix",
  "|2019|id.json|$id with file URI still resolves pointers - windows"
]));
