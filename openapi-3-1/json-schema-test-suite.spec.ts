import "./index.js";
import { runTestSuite } from "../lib/test-utils.js";


runTestSuite(2020, "https://spec.openapis.org/oas/3.1/dialect/base", new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|2020|id.json|$id with file URI still resolves pointers - *nix",
  "|2020|id.json|$id with file URI still resolves pointers - windows"
]));
