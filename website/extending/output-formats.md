# Custom output formats

An output format decides what validation returns. You choose one with the
`output` option. A format is a value like the built-in `BASIC`, and yours is
used the same way. A custom format is useful when you want errors in the
shape your application or API already uses, or with your own messages.

The easiest way to make one is to build on `BASIC`, which already finds
every error. This one turns the errors into messages:

```typescript
import { jsonSyntaxErrorMessage } from "@hyperjump/browser/json";
import { BASIC } from "@hyperjump/json-schema";
import type { OutputError, OutputFormat } from "@hyperjump/json-schema";

const messages: Record<string, string> = {
  "https://json-schema.org/keyword/minimum": "is too small",
  "https://json-schema.org/keyword/required": "is missing a property",
  "https://json-schema.org/keyword/type": "is the wrong type"
};

const describe = (error: OutputError) => {
  if (error.source === "json") {
    return jsonSyntaxErrorMessage(error);
  }

  const where = error.instanceLocation || "The value";
  return `${where} ${messages[error.ruleId] ?? "is invalid"}`;
};

type Messages = { valid: boolean; messages: string[] };

const MESSAGES: OutputFormat<Messages> = () => {
  const basic = BASIC();
  return {
    plugin: basic.plugin,
    output: (valid, syntaxErrors) => {
      const { errors } = basic.output(valid, syntaxErrors);
      return { valid, messages: errors.map(describe) };
    }
  };
};

const result = await validate(jsonSchema, "https://example.com/person",
  { age: -1 }, { output: MESSAGES });
```

A format is an `OutputFormat<R>`, where `R` is its result type. Validation
returns an `R`, so `result` is a `Messages`:

```json
{
  "valid": false,
  "messages": ["/age is too small", "The value is missing a property"]
}
```

## How it works

A format is a function. It's called for each validation that uses it, and
it returns:

- `plugin`: an [evaluation plugin](plugins.md) that collects what the format
  needs while the value is evaluated.
- `output(valid, syntaxErrors)`: the result. `syntaxErrors` are from parsing
  JSON text. Otherwise the list is empty.

A location in a schema file would reveal where your files are. That's why
`BASIC` and `DETAILED` show it relative to the working directory. If your
format reports locations from its own plugin, do the same with
`relativeFileUri`:

```typescript
import { relativeFileUri } from "@hyperjump/json-schema";

relativeFileUri(keyword.absoluteKeywordLocation);
// "schemas/person.schema.json#/properties/age/minimum"
```

A URI that isn't a `file:` URI is returned as is.

A value is evaluated the fast way first, without the plugin. The plugin only
runs if the value is invalid. That means `output(true, [])` can be called
before the plugin has seen anything.
