import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { VFile } from "vfile";
import { jsonschema } from "./jsonschema.js";

/** @type (path: string, json: string) => Promise<VFile> */
const lint = async (path, json) => {
  const file = new VFile({ path, value: json });
  await jsonschema.process(file);
  return file;
};

describe("jsonschema", () => {
  test("a valid schema has no messages", async () => {
    const file = await lint("/schemas/a.schema.json", `{ "$schema": "https://json-schema.org/v1", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("every preset's dialect is available", async () => {
    for (const dialectUri of [
      "http://json-schema.org/draft-04/schema#",
      "http://json-schema.org/draft-06/schema#",
      "http://json-schema.org/draft-07/schema#",
      "https://json-schema.org/draft/2019-09/schema",
      "https://json-schema.org/draft/2020-12/schema"
    ]) {
      const file = await lint("/schemas/a.schema.json", `{ "$schema": "${dialectUri}", "type": "string" }`);
      expect(file.messages, dialectUri).to.eql([]);
    }
  });

  test("an invalid keyword value is reported", async () => {
    const file = await lint("/schemas/a.schema.json", `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/minLength"]);
  });

  test("a resolver problem is reported", async () => {
    const file = await lint("/schemas/a.schema.json", `{ "type": "string" }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["missing-dialect"]);
  });

  test("a syntax error doesn't stop the rest of the schema from being checked", async () => {
    const file = await lint("/schemas/a.schema.json", `{ "$schema": "https://json-schema.org/v1", "minLength": -1, }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql([
      "trailing-comma",
      "https://json-schema.org/keyword/minLength"
    ]);
  });
});

describe("jsonschema CLI", () => {
  const cli = fileURLToPath(new URL("./jsonschema-cli.js", import.meta.url));
  const run = promisify(execFile);

  /** @type string */
  let dir;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "jsonschema-cli-"));
    await writeFile(join(dir, "a.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    await writeFile(join(dir, "package.json"), `{ "name": "example" }`);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** @type (args: string[]) => Promise<string> */
  const report = async (args) => {
    const { stderr } = await run(process.execPath, [cli, ...args, "--no-color"], { cwd: dir });
    return stderr;
  };

  test("only .schema.json files are linted in a folder", async () => {
    const output = await report([".", "-q"]);
    expect(output).to.contain("a.schema.json");
    expect(output).to.contain("https://json-schema.org/keyword/minLength");
    expect(output).not.to.contain("package.json");
  });

  test("a plain JSON file can be included with an ignore pattern", async () => {
    const output = await report([".", "-q", "--ignore-pattern", "!package.json"]);
    expect(output).to.contain("package.json");
    expect(output).to.contain("missing-dialect");
  });
});
