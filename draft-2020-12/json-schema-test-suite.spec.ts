import "./index.js";
import { runTestSuite } from "../lib/test-utils.js";


runTestSuite(2020, "https://json-schema.org/draft/2020-12/schema", new Set<string>([
  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|2020|id.json|$id with file URI still resolves pointers - *nix",
  "|2020|id.json|$id with file URI still resolves pointers - windows"
]), { tags: new Set(["format-annotation"]) });
