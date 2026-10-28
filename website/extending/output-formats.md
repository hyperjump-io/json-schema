# Custom output formats

An output format decides what validation returns when you ask for it with
the `output` option. Add one with `addOutputFormat`. It's useful for
errors in the shape your application or API already uses, or with your own
messages.

The easiest way to make one is to build on `BASIC`, which already finds
every error. This one turns them into messages:

```typescript
import { jsonSyntaxErrorMessage } from "@hyperjump/browser/json";

const messages = {
  "https://json-schema.org/keyword/minimum": "is too small",
  "https://json-schema.org/keyword/required": "is missing a property",
  "https://json-schema.org/keyword/type": "is the wrong type"
};

const describe = (error) => {
  if (error.source === "json") {
    return jsonSyntaxErrorMessage(error);
  }

  const where = error.instanceLocation || "The value";
  return `${where} ${messages[error.ruleId] ?? "is invalid"}`;
};

jsonSchema.addOutputFormat("MESSAGES", () => {
  const basic = jsonSchema.getOutputFormat("BASIC")();
  return {
    plugin: basic.plugin,
    output: (valid, syntaxErrors) => {
      const { errors } = basic.output(valid, syntaxErrors);
      return { valid, messages: errors.map(describe) };
    }
  };
});

validator.validate({ age: -1 }, { output: "MESSAGES" });
```

```json
{
  "valid": false,
  "messages": ["/age is too small", "The value is missing a property"]
}
```

## How it works

The definition is a function that's called for each validation that uses
the format. It returns:

- `plugin`: an [evaluation plugin](plugins.md) that collects what the format
  needs while the value is evaluated.
- `output(valid, syntaxErrors)`: the result. `syntaxErrors` are from parsing
  JSON text, and empty otherwise.

A location in a schema that's in a file would say where your files are,
so `BASIC` and `DETAILED` give it relative to the working directory. If
your format reports locations from a plugin of its own, do the same with
`relativeFileUri`:

```typescript
import { relativeFileUri } from "@hyperjump/json-schema";

relativeFileUri(keyword.absoluteKeywordLocation);
// "schemas/person.schema.json#/properties/age/minimum"
```

A URI that isn't a `file:` URI is returned as it is.

A value is evaluated the fast way first, without the plugin. The plugin only
runs if the value is invalid, so `output(true, [])` can be called without
the plugin having seen anything.

## Types

In TypeScript, declare the format's result so `validate` returns the right
type:

```typescript
declare module "@hyperjump/json-schema" {
  interface OutputFormats {
    MESSAGES: { valid: boolean; messages: string[] };
  }
}
```

`BASIC` and `DETAILED` can be replaced with `addOutputFormat` too. `FLAG`
can't.
