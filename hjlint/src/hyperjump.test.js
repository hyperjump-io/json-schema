import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "./hyperjump.js";

/**
 * @import { Server } from "node:http"
 * @import { AddressInfo } from "node:net"
 */

/** @type (path: string, json: string) => Promise<VFile> */
const lint = async (path, json) => {
  const file = new VFile({ path, value: json });
  await hyperjump.process(file);
  return file;
};

describe("hyperjump", () => {
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

  test("a .json file is a schema if its $schema is a dialect", async () => {
    const file = await lint("/schemas/a.json", `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/minLength"]);
  });

  test("a .json file without a schema only has its syntax checked", async () => {
    const file = await lint("/schemas/a.json", `{ "minLength": -1, }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["trailing-comma"]);
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

describe("hyperjump CLI", () => {
  const cli = fileURLToPath(new URL("./hyperjump-cli.js", import.meta.url));
  const run = promisify(execFile);

  /** @type string */
  let dir;

  /** A directory outside the working directory */
  let outside = "";

  /** @type Server */
  let server;

  const metaSchema = JSON.stringify({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
      "https://json-schema.org/draft/2020-12/vocab/validation": true
    }
  });

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "hyperjump-cli-"));
    await writeFile(join(dir, "a.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    await mkdir(join(dir, "valid"));
    await writeFile(join(dir, "valid", "b.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": 1 }`);
    await writeFile(join(dir, "package.json"), `{ "name": "example" }`);

    const recommended = fileURLToPath(import.meta.resolve("@hyperjump/json-schema/lint/recommended"));
    const rule = fileURLToPath(import.meta.resolve("@hyperjump/json-schema/lint/rules/then-else-without-if"));
    await mkdir(join(dir, "linted"));
    await writeFile(join(dir, "linted", ".hyperjumprc"), JSON.stringify({ plugins: [recommended] }));
    await writeFile(join(dir, "linted", "c.schema.json"), `{ "$schema": "https://json-schema.org/v1", "then": true }`);
    await writeFile(join(dir, "linted", "disabled.schema.json"), `{ "$schema": "https://json-schema.org/v1", "$comment": "jsonschema-lint-disable then-else-without-if", "then": true }`);
    await mkdir(join(dir, "strict"));
    await writeFile(join(dir, "strict", ".hyperjumprc"), JSON.stringify({ plugins: [recommended, [rule, ["error"]]] }));
    await writeFile(join(dir, "strict", "d.schema.json"), `{ "$schema": "https://json-schema.org/v1", "then": true }`);

    await mkdir(join(dir, "meta"));
    await writeFile(join(dir, "meta", "meta.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/meta" }));
    await writeFile(join(dir, "meta", "by-id.schema.json"), `{ "$schema": "https://example.com/meta", "type": "string" }`);
    await writeFile(join(dir, "meta", "by-path.schema.json"), JSON.stringify({
      $schema: pathToFileURL(join(dir, "meta", "meta.schema.json")).href,
      type: "string"
    }));

    outside = await mkdtemp(join(tmpdir(), "hyperjump-cli-outside-"));
    await writeFile(join(outside, "meta.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/outside-meta" }));
    await writeFile(join(outside, "meta-with-id.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/outside-meta-with-id" }));
    await mkdir(join(dir, "outside-ref"));
    await writeFile(join(dir, "outside-ref", "outside-by-id.schema.json"), `{ "$schema": "https://example.com/outside-meta-with-id", "type": "string" }`);
    await writeFile(join(dir, "outside-ref", "outside.schema.json"), JSON.stringify({
      $schema: pathToFileURL(join(outside, "meta.schema.json")).href,
      type: "string"
    }));

    await mkdir(join(dir, "workspace", "vendor"), { recursive: true });
    await writeFile(join(dir, "workspace", "vendor", "vendored.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/vendored" }));
    await writeFile(join(dir, "workspace", "uses-vendored.schema.json"), `{ "$schema": "https://example.com/vendored", "type": "string" }`);

    await mkdir(join(dir, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(dir, "node_modules", "pkg", "meta.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/in-node-modules" }));
    await mkdir(join(dir, "skipped"));
    await writeFile(join(dir, "skipped", "uses-node-modules.schema.json"), `{ "$schema": "https://example.com/in-node-modules", "type": "string" }`);
    await symlink(join(outside, "meta-with-id.schema.json"), join(dir, "skipped", "link.schema.json"));
    await writeFile(join(dir, "skipped", "uses-link.schema.json"), `{ "$schema": "https://example.com/outside-meta-with-id", "type": "string" }`);

    await mkdir(join(dir, "refs"));
    await writeFile(join(dir, "refs", ".hyperjumprc"), JSON.stringify({ plugins: [recommended] }));
    await writeFile(join(dir, "refs", "target.schema.json"), `{ "$schema": "https://json-schema.org/v1", "$id": "https://example.com/target", "$defs": { "foo": true } }`);
    await writeFile(join(dir, "refs", "found.schema.json"), `{ "$schema": "https://json-schema.org/v1", "$ref": "https://example.com/target#/$defs/foo" }`);
    await writeFile(join(dir, "refs", "not-found.schema.json"), `{ "$schema": "https://json-schema.org/v1", "$ref": "https://example.com/target#/$defs/bar" }`);

    await mkdir(join(dir, "instances", "data"), { recursive: true });
    await mkdir(join(dir, "instances", "strict"));
    await writeFile(join(dir, "instances", ".hyperjumprc"), JSON.stringify({ settings: { schemas: { "instances/**/*.json": "https://example.com/person" } } }));
    await writeFile(join(dir, "instances", "person.schema.json"), JSON.stringify({
      $schema: "https://json-schema.org/v1",
      $id: "https://example.com/person",
      type: "object",
      properties: { age: { type: "integer", minimum: 0 } },
      required: ["name"]
    }));
    await writeFile(join(dir, "instances", "data", "valid.json"), `{ "name": "a", "age": 1 }`);
    await writeFile(join(dir, "instances", "data", "invalid.json"), `{ "name": "a", "age": -1 }`);
    await writeFile(join(dir, "instances", "data", "syntax-error.json"), `{ "name": "a", "age": -1, }`);
    await writeFile(join(dir, "instances", "strict", ".hyperjumprc"), JSON.stringify({ settings: { schemas: { "instances/strict/*.json": "instances/strict/strict.schema.json" } } }));
    await writeFile(join(dir, "instances", "strict", "strict.schema.json"), `{ "$schema": "https://json-schema.org/v1", "required": ["id"] }`);
    await writeFile(join(dir, "instances", "strict", "no-id.json"), `{ "name": "a" }`);

    await mkdir(join(dir, "self-described"));
    await writeFile(join(dir, "self-described", "valid.json"), `{ "$schema": "../instances/person.schema.json", "name": "a" }`);
    await writeFile(join(dir, "self-described", "invalid.json"), `{ "$schema": "https://example.com/person", "age": -1 }`);
    await writeFile(join(dir, "self-described", "not-found.json"), `{ "$schema": "https://example.com/not-found" }`);
    await writeFile(join(dir, "self-described", "invalid-schema.json"), `{ "$schema": "../a.schema.json" }`);
    await writeFile(join(dir, "self-described", "no-schema.json"), `{ "name": "a" }`);

    await mkdir(join(dir, "json-schemas", "nested"), { recursive: true });
    await mkdir(join(dir, "json-schemas", "refs"));
    await writeFile(join(dir, "json-schemas", "invalid.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    await writeFile(join(dir, "json-schemas", "target.json"), `{ "$schema": "https://json-schema.org/v1", "$id": "https://example.com/json-target", "$defs": { "foo": true }, "required": ["bar"] }`);
    await writeFile(join(dir, "json-schemas", "nested", "meta.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/json-meta" }));
    await writeFile(join(dir, "json-schemas", "uses-json-meta.json"), `{ "$schema": "https://example.com/json-meta", "minLength": -1 }`);
    await writeFile(join(dir, "json-schemas", "uses-schema-meta.json"), `{ "$schema": "https://example.com/meta", "minLength": -1 }`);
    await writeFile(join(dir, "json-schemas", "refs", ".hyperjumprc"), JSON.stringify({ plugins: [recommended] }));
    await writeFile(join(dir, "json-schemas", "refs", "refs.schema.json"), JSON.stringify({
      $schema: "https://json-schema.org/v1",
      $ref: "https://example.com/json-target#/$defs/foo",
      properties: { foo: { $ref: "../target.json#/$defs/foo" } }
    }));
    await writeFile(join(dir, "json-schemas", "refs", "missing.schema.json"), JSON.stringify({
      $schema: "https://json-schema.org/v1",
      $ref: "../target.json#/$defs/bar"
    }));
    await writeFile(join(dir, "json-schemas", "instance.json"), `{ "$schema": "./target.json", "foo": 1 }`);

    await mkdir(join(dir, "plain"));
    await writeFile(join(dir, "plain", "trailing-comma.json"), `{ "a": 1, }`);
    await writeFile(join(dir, "plain", "broken.json"), `{ "a": `);

    // A plugin that makes one file fatal while it's still being transformed,
    // and finishes the other first
    await mkdir(join(dir, "race"));
    await writeFile(join(dir, "race", "slow-error.mjs"), `export default function () {
  return async (_tree, file) => {
    if (file.stem === "first") {
      file.message("Slow error").fatal = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
}`);
    await writeFile(join(dir, "race", ".hyperjumprc"), JSON.stringify({ plugins: ["./slow-error.mjs"] }));
    await writeFile(join(dir, "race", "first.json"), `{}`);
    await writeFile(join(dir, "race", "second.json"), `{}`);

    await mkdir(join(dir, "bad-schemas-setting"));
    await writeFile(join(dir, "bad-schemas-setting", ".hyperjumprc"), JSON.stringify({ settings: { schemas: ["https://example.com/person"] } }));
    await writeFile(join(dir, "bad-schemas-setting", "a.json"), `{}`);

    // Serves the meta-schema at every path
    server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/schema+json" });
      response.end(metaSchema);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
    const origin = `http://127.0.0.1:${/** @type AddressInfo */ (server.address()).port}`;

    await mkdir(join(dir, "remote"));
    await writeFile(join(dir, "remote", ".hyperjumprc"), JSON.stringify({ settings: { allowRetrieval: [`${origin}/schemas/`] } }));
    await writeFile(join(dir, "remote", "allowed.schema.json"), `{ "$schema": "${origin}/schemas/meta", "type": "string" }`);
    await writeFile(join(dir, "remote", "refused.schema.json"), `{ "$schema": "${origin}/other/meta", "type": "string" }`);

    await mkdir(join(dir, "exact"));
    await writeFile(join(dir, "exact", ".hyperjumprc"), JSON.stringify({ settings: { allowRetrieval: [`${origin}/meta`] } }));
    await writeFile(join(dir, "exact", "allowed.schema.json"), `{ "$schema": "${origin}/meta", "type": "string" }`);
    await writeFile(join(dir, "exact", "refused.schema.json"), `{ "$schema": "${origin}/meta/other", "type": "string" }`);

    await mkdir(join(dir, "file-setting"));
    await writeFile(join(dir, "file-setting", ".hyperjumprc"), JSON.stringify({ settings: { allowRetrieval: [pathToFileURL(outside).href + "/"] } }));
    await writeFile(join(dir, "file-setting", "a.schema.json"), `{ "$schema": "https://json-schema.org/v1" }`);

    await mkdir(join(dir, "relative-setting"));
    await writeFile(join(dir, "relative-setting", ".hyperjumprc"), JSON.stringify({ settings: { allowRetrieval: ["./vendor/"] } }));
    await writeFile(join(dir, "relative-setting", "a.schema.json"), `{ "$schema": "https://json-schema.org/v1" }`);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
    server.close();
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

  test("JSON files without a schema in a folder aren't reported", async () => {
    const { output } = await report([".", "-q"]);
    expect(output).to.contain("a.schema.json");
    expect(output).to.contain("https://json-schema.org/keyword/minLength");
    expect(output).not.to.contain("package.json");
  });

  test("lint rules aren't on without configuration", async () => {
    const { output } = await report(["valid"]);
    expect(output).not.to.contain("then-else-without-if");
  });

  test("a preset in .hyperjumprc turns on lint rules as warnings", async () => {
    const { output, exitCode } = await report(["linted/c.schema.json"]);
    expect(output).to.match(/warning\s+'then' has no effect without 'if'\s+then-else-without-if\s+jsonschema-lint/);
    expect(exitCode).to.equal(0);
  });

  test("a $comment turns off rules from .hyperjumprc", async () => {
    const { output } = await report(["linted/disabled.schema.json"]);
    expect(output).not.to.contain("then-else-without-if");
  });

  test("a reference to another file is found by its identifier", async () => {
    const { output } = await report(["refs/found.schema.json"]);
    expect(output).not.to.contain("reference-without-target");
  });

  test("a reference to another file that doesn't find a schema is an error in the recommended preset", async () => {
    const { output, exitCode } = await report(["refs/not-found.schema.json"]);
    expect(output).to.match(/error\s+The reference doesn't find a schema\. Property 'bar' doesn't exist.*reference-without-target/);
    expect(exitCode).to.equal(1);
  });

  test("a rule in .hyperjumprc can be made an error", async () => {
    const { output, exitCode } = await report(["strict"]);
    expect(output).to.match(/error\s+'then' has no effect without 'if'/);
    expect(exitCode).to.equal(1);
  });

  test("a meta-schema it was given is found by its identifier", async () => {
    const { exitCode } = await report(["meta/by-id.schema.json", "meta/meta.schema.json", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a meta-schema it was given is found by its path", async () => {
    const { exitCode } = await report(["meta/by-path.schema.json", "meta/meta.schema.json", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a meta-schema in the working directory is found by its identifier, even if it wasn't given", async () => {
    const { exitCode } = await report(["meta/by-id.schema.json", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a meta-schema outside the working directory that it wasn't given isn't found by its identifier", async () => {
    const { output, exitCode } = await report(["outside-ref/outside-by-id.schema.json", "-q"]);
    expect(output).to.contain("Unable to retrieve the meta-schema for the 'https://example.com/outside-meta-with-id' dialect");
    expect(exitCode).to.equal(1);
  });

  test("an ignored meta-schema is found by its identifier, and isn't linted", async () => {
    const { output, exitCode } = await report(["workspace", "--ignore-pattern", "vendor/"]);
    expect(output).to.contain("workspace/uses-vendored.schema.json");
    expect(output).not.to.contain("vendor/");
    expect(exitCode).to.equal(0);
  });

  test("schemas in node_modules aren't found", async () => {
    const { output, exitCode } = await report(["skipped/uses-node-modules.schema.json", "-q"]);
    expect(output).to.contain("Unable to retrieve the meta-schema for the 'https://example.com/in-node-modules' dialect");
    expect(exitCode).to.equal(1);
  });

  test("symlinks in the working directory aren't followed", async () => {
    const { output, exitCode } = await report(["skipped/uses-link.schema.json", "-q"]);
    expect(output).to.contain("Unable to retrieve the meta-schema for the 'https://example.com/outside-meta-with-id' dialect");
    expect(exitCode).to.equal(1);
  });

  test("a meta-schema in the working directory is retrieved by its path, even if it wasn't given", async () => {
    const { exitCode } = await report(["meta/by-path.schema.json", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a file outside the working directory isn't retrieved", async () => {
    const { output, exitCode } = await report(["outside-ref/outside.schema.json", "-q"]);
    expect(output).to.contain("Unable to retrieve the meta-schema");
    expect(exitCode).to.equal(1);
  });

  test("a file outside the working directory that it was given is found by its identifier", async () => {
    const { exitCode } = await report(["outside-ref/outside-by-id.schema.json", join(outside, "meta-with-id.schema.json"), "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a file outside the working directory that it was given is found by its path", async () => {
    const { exitCode } = await report(["outside-ref/outside.schema.json", join(outside, "meta.schema.json"), "-q"]);
    expect(exitCode).to.equal(0);
  });

  describe("the allowRetrieval setting", () => {
    test("a URL under one it allows is retrieved", async () => {
      const { exitCode } = await report(["remote/allowed.schema.json", "-q"]);
      expect(exitCode).to.equal(0);
    });

    test("a URL that isn't under one it allows isn't retrieved", async () => {
      const { output, exitCode } = await report(["remote/refused.schema.json", "-q"]);
      expect(output).to.contain("Unable to retrieve the meta-schema");
      expect(exitCode).to.equal(1);
    });

    test("a URL without a trailing slash only allows itself", async () => {
      const { exitCode } = await report(["exact/allowed.schema.json", "exact/refused.schema.json", "-q"]);
      expect(exitCode).to.equal(1);
      const allowed = await report(["exact/allowed.schema.json", "-q"]);
      expect(allowed.exitCode).to.equal(0);
    });

    test("a file can't be allowed", async () => {
      const { output, exitCode } = await report(["file-setting/a.schema.json", "-q"]);
      expect(output).to.contain("isn't an 'http:' or 'https:' URL");
      expect(output).to.contain("invalid-setting");
      expect(exitCode).to.equal(1);
    });

    test("a relative path isn't allowed", async () => {
      const { output, exitCode } = await report(["relative-setting/a.schema.json", "-q"]);
      expect(output).to.contain("isn't an absolute URL");
      expect(exitCode).to.equal(1);
    });
  });

  test("a file that's fatal while another file finishes is still reported", async () => {
    const { output, exitCode } = await report(["race"]);
    expect(output).to.match(/race\/first\.json\n\s+error\s+Slow error/);
    expect(output).to.contain("race/second.json: no issues found");
    expect(exitCode).to.equal(1);
  });

  test("files in a folder it was given are found", async () => {
    const { exitCode } = await report(["meta", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a plain JSON file is validated, not linted", async () => {
    const { output, exitCode } = await report(["self-described/no-schema.json"]);
    expect(output).not.to.contain("missing-dialect");
    expect(exitCode).to.equal(0);
  });

  describe("schemas without .schema.json", () => {
    test("a .json file whose $schema is a dialect is linted", async () => {
      const { output, exitCode } = await report(["json-schemas/invalid.json", "-q"]);
      expect(output).to.match(/error\s+Expected a non-negative integer/);
      expect(exitCode).to.equal(1);
    });

    test("a .json file in a dialect a meta-schema in the working directory defines is linted", async () => {
      const { output, exitCode } = await report(["json-schemas/uses-schema-meta.json", "-q"]);
      expect(output).to.contain("https://json-schema.org/keyword/minLength");
      expect(exitCode).to.equal(1);
    });

    test("a .json meta-schema in the working directory defines a dialect", async () => {
      const { output, exitCode } = await report(["json-schemas/uses-json-meta.json", "-q"]);
      expect(output).to.contain("https://json-schema.org/keyword/minLength");
      expect(exitCode).to.equal(1);
    });

    test("a .json schema in the working directory is found by its identifier and its path", async () => {
      const found = await report(["json-schemas/refs/refs.schema.json"]);
      expect(found.output).not.to.contain("reference-without-target");
      expect(found.exitCode).to.equal(0);

      const missing = await report(["json-schemas/refs/missing.schema.json", "-q"]);
      expect(missing.output).to.contain("reference-without-target");
    });

    test("an instance can name a .json schema in $schema", async () => {
      const { output, exitCode } = await report(["json-schemas/instance.json", "-q"]);
      expect(output).to.contain("https://example.com/json-target#/required");
      expect(exitCode).to.equal(1);
    });

    test("a JSON file without a schema has its syntax checked", async () => {
      const warning = await report(["plain/trailing-comma.json"]);
      expect(warning.output).to.match(/warning\s+Trailing commas are not allowed/);
      expect(warning.exitCode).to.equal(0);

      const error = await report(["plain/broken.json", "-q"]);
      expect(error.output).to.contain("error");
      expect(error.exitCode).to.equal(1);
    });
  });

  describe("validating instances", () => {
    test("an instance that matches a pattern in the 'schemas' setting is validated against its schema", async () => {
      const { output, exitCode } = await report(["instances/data/invalid.json", "-q"]);
      expect(output).to.match(/1:23-1:25\s+error\s+Fails the constraint at 'https:\/\/example\.com\/person#\/properties\/age\/minimum'\s+https:\/\/json-schema\.org\/keyword\/minimum\s+json-schema/);
      expect(exitCode).to.equal(1);
    });

    test("a valid instance passes", async () => {
      const { output, exitCode } = await report(["instances/data/valid.json", "-q"]);
      expect(output).to.equal("");
      expect(exitCode).to.equal(0);
    });

    test("an instance with a syntax error is validated as far as it could be parsed", async () => {
      const { output } = await report(["instances/data/syntax-error.json"]);
      expect(output).to.contain("trailing-comma");
      expect(output).to.contain("https://json-schema.org/keyword/minimum");
    });

    test("the last pattern that matches wins, so a folder's settings change the schema for its files", async () => {
      const { output } = await report(["instances/strict/no-id.json", "-q"]);
      expect(output).to.contain("strict.schema.json#/required");
      expect(output).not.to.contain("https://example.com/person");
    });

    test("schemas are linted, not validated, even if they match a pattern", async () => {
      const { exitCode } = await report(["instances/person.schema.json", "-q"]);
      expect(exitCode).to.equal(0);
    });

    test("every instance in a folder is validated", async () => {
      const { output, exitCode } = await report(["instances", "-q"]);
      expect(output).to.contain("instances/data/invalid.json");
      expect(output).to.contain("instances/data/syntax-error.json");
      expect(output).to.contain("instances/strict/no-id.json");
      expect(output).not.to.match(/^instances\/data\/valid\.json$/m);
      expect(exitCode).to.equal(1);
    });

    test("an instance without a pattern is validated against its $schema, relative to the instance", async () => {
      const valid = await report(["self-described/valid.json", "-q"]);
      expect(valid.exitCode).to.equal(0);

      const invalid = await report(["self-described/invalid.json", "-q"]);
      expect(invalid.output).to.contain("https://json-schema.org/keyword/required");
      expect(invalid.output).to.contain("https://json-schema.org/keyword/minimum");
      expect(invalid.exitCode).to.equal(1);
    });

    test("a schema that can't be found is reported at $schema", async () => {
      const { output, exitCode } = await report(["self-described/not-found.json", "-q"]);
      expect(output).to.match(/1:14-1:45\s+error\s+Unable to use the schema 'https:\/\/example\.com\/not-found'.*invalid-schema\s+hyperjump/);
      expect(output).not.to.contain("[cause]");
      expect(exitCode).to.equal(1);
    });

    test("an invalid schema is reported with its problem", async () => {
      const { output, exitCode } = await report(["self-described/invalid-schema.json", "-q"]);
      expect(output).to.contain("Expected a non-negative integer");
      expect(output).to.contain("invalid-schema");
      expect(exitCode).to.equal(1);
    });

    test("a schema can be given with --setting", async () => {
      const { output, exitCode } = await report(["self-described/no-schema.json", "-q", "--setting", "schemas:{\"self-described/*.json\":\"instances/strict/strict.schema.json\"}"]);
      expect(output).to.contain("strict.schema.json#/required");
      expect(exitCode).to.equal(1);
    });

    test("an instance from stdin is validated if it's given a path", async () => {
      const { output, stdout, exitCode } = await report(["--file-path", "instances/data/stdin.json"], `{ "age": -1 }`);
      expect(output).to.contain("https://json-schema.org/keyword/required");
      expect(stdout).to.equal("");
      expect(exitCode).to.equal(1);
    });

    test("an invalid 'schemas' setting is an error", async () => {
      const { output, exitCode } = await report(["bad-schemas-setting/a.json", "-q"]);
      expect(output).to.contain("The 'schemas' setting must be an object");
      expect(output).to.contain("invalid-setting");
      expect(exitCode).to.equal(1);
    });
  });
});
