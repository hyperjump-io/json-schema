import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema } from "../v1/index.js";
import { compile, deserialize, getSchema, interpret, serialize } from "./experimental.js";
import * as Instance from "./instance.js";


describe("Compiled Schema Serialization", () => {
  const schemaUri = "schema:compiled-serialization";
  const dialectUri = "https://json-schema.org/v1";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("round-trips RegExp keyword values", async () => {
    registerSchema({ pattern: "^a+$" }, schemaUri, dialectUri);
    const schema = await getSchema(schemaUri);
    const compiled = await compile(schema);

    const restored = deserialize(serialize(compiled));

    expect(interpret(restored, Instance.fromJs("aaa"))).to.eql({ valid: true });
    expect(interpret(restored, Instance.fromJs("bbb"))).to.eql({ valid: false });
  });

  test("restores built-in evaluation plugins", async () => {
    registerSchema({ unevaluatedProperties: false }, schemaUri, dialectUri);
    const schema = await getSchema(schemaUri);
    const compiled = await compile(schema);

    const restored = deserialize(serialize(compiled));

    expect(interpret(restored, Instance.fromJs({ extra: 1 }))).to.eql({ valid: false });
  });

  test("throws if plugin id cannot be resolved", () => {
    const pluginUri = "https://example.com/plugins/missing";
    const serialized = JSON.stringify({
      schemaUri: "schema:missing#",
      ast: {
        "metaData": {},
        "plugins": [pluginUri],
        "schema:missing#": true
      }
    });

    expect(() => {
      deserialize(serialized);
    }).to.throw(`Plugin with id '${pluginUri}' is not found`);
  });
});
