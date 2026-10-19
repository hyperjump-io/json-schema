import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
    await mkdir(join(dir, "valid"));
    await writeFile(join(dir, "valid", "b.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": 1 }`);
    await writeFile(join(dir, "package.json"), `{ "name": "example" }`);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** @type (args: string[], stdin?: string) => Promise<{ output: string; stdout: string; exitCode: number }> */
  const report = async (args, stdin) => {
    const child = run(process.execPath, [cli, ...args, "--no-color"], { cwd: dir });
    child.child.stdin?.end(stdin ?? "");
    try {
      const { stdout, stderr } = await child;
      return { output: stderr, stdout, exitCode: 0 };
    } catch (error) {
      const { stdout, stderr, code } = /** @type {{ stdout: string; stderr: string; code: number }} */ (error);
      return { output: stderr, stdout, exitCode: code };
    }
  };

  test("a schema problem is an error, which fails the command", async () => {
    const { output, exitCode } = await report(["a.schema.json", "-q"]);
    expect(output).to.match(/error\s+Expected a non-negative integer/);
    expect(exitCode).to.equal(1);
  });

  test("the schema isn't written to stdout", async () => {
    const { stdout } = await report(["valid/b.schema.json"]);
    expect(stdout).to.equal("");
  });

  test("the schema is written to stdout if it's asked for", async () => {
    const { stdout } = await report(["valid/b.schema.json", "--stdout"]);
    expect(JSON.parse(stdout)).to.eql({ $schema: "https://json-schema.org/v1", minLength: 1 });
  });

  test("a schema from stdin", async () => {
    const valid = await report([], `{ "$schema": "https://json-schema.org/v1", "minLength": 1 }`);
    expect(valid.exitCode).to.equal(0);
    expect(valid.stdout).to.equal("");

    const invalid = await report([], `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    expect(invalid.output).to.contain("Expected a non-negative integer");
    expect(invalid.exitCode).to.equal(1);
  });

  test("valid schemas pass", async () => {
    const { exitCode } = await report(["valid", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("only .schema.json files are linted in a folder", async () => {
    const { output } = await report([".", "-q"]);
    expect(output).to.contain("a.schema.json");
    expect(output).to.contain("https://json-schema.org/keyword/minLength");
    expect(output).not.to.contain("package.json");
  });

  test("a plain JSON file can be included with an ignore pattern", async () => {
    const { output } = await report([".", "-q", "--ignore-pattern", "!package.json"]);
    expect(output).to.contain("package.json");
    expect(output).to.contain("missing-dialect");
  });
});
