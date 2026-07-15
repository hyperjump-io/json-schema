import "./index.js";
import { runTestSuite } from "../lib/test-utils.js";


// Tests are only skipped if I have good reason to decide not to fix them. This
// is usually because there has been some tradeoff I've made to not support
// something that doesn't come up in real schemas in favor of something that has
// value.
runTestSuite(6, "http://json-schema.org/draft-06/schema", new Set<string>([
  // Skip tests for pointers that cross schema resource boundaries. There might
  // be a way to solve this, but because this functionality has been removed
  // from the spec and there is no good reason to do this, it will probably not
  // ever be fixed.
  "|6|id-legacy.json|base URI change - change folder in subschema",

  // $ref ignores all sibling keywords, but strictly ignoring all keywords can
  // create paradoxical schemas if you ignore $schema. Therefore, $schema needs
  // to be treated as an exception to the rule. I made the choice to ake an
  // exception for all schema processing keywords including $id and $anchor as
  // well for consistency. Since this isn't a real problem that comes up with
  // real schemas, I'm not concerned about the deviation.
  "|6|id-legacy.json|$ref prevents a sibling $id from changing the base uri",

  // Self-identifying with a `file:` URI is not allowed for security reasons.
  "|6|id-legacy.json|$id with file URI still resolves pointers - *nix",
  "|6|id-legacy.json|$id with file URI still resolves pointers - windows"
]));
