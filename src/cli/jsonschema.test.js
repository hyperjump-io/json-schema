import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { VFile } from "vfile";
import { jsonschema } from "./jsonschema.js";

/**
 * @import { Server } from "node:http"
 * @import { AddressInfo } from "node:net"
 */

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
    dir = await mkdtemp(join(tmpdir(), "jsonschema-cli-"));
    await writeFile(join(dir, "a.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": -1 }`);
    await mkdir(join(dir, "valid"));
    await writeFile(join(dir, "valid", "b.schema.json"), `{ "$schema": "https://json-schema.org/v1", "minLength": 1 }`);
    await writeFile(join(dir, "package.json"), `{ "name": "example" }`);

    const recommended = fileURLToPath(new URL("../lint/recommended.js", import.meta.url));
    const rule = fileURLToPath(new URL("../lint/rules/then-else-without-if.js", import.meta.url));
    await mkdir(join(dir, "linted"));
    await writeFile(join(dir, "linted", ".jsonschemarc"), JSON.stringify({ plugins: [recommended] }));
    await writeFile(join(dir, "linted", "c.schema.json"), `{ "$schema": "https://json-schema.org/v1", "then": true }`);
    await writeFile(join(dir, "linted", "disabled.schema.json"), `{ "$schema": "https://json-schema.org/v1", "$comment": "jsonschema-lint-disable then-else-without-if", "then": true }`);
    await mkdir(join(dir, "strict"));
    await writeFile(join(dir, "strict", ".jsonschemarc"), JSON.stringify({ plugins: [recommended, [rule, ["error"]]] }));
    await writeFile(join(dir, "strict", "d.schema.json"), `{ "$schema": "https://json-schema.org/v1", "then": true }`);

    await mkdir(join(dir, "meta"));
    await writeFile(join(dir, "meta", "meta.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/meta" }));
    await writeFile(join(dir, "meta", "by-id.schema.json"), `{ "$schema": "https://example.com/meta", "type": "string" }`);
    await writeFile(join(dir, "meta", "by-path.schema.json"), JSON.stringify({
      $schema: pathToFileURL(join(dir, "meta", "meta.schema.json")).href,
      type: "string"
    }));

    outside = await mkdtemp(join(tmpdir(), "jsonschema-cli-outside-"));
    await writeFile(join(outside, "meta.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/outside-meta" }));
    await writeFile(join(outside, "meta-with-id.schema.json"), JSON.stringify({ ...JSON.parse(metaSchema), $id: "https://example.com/outside-meta-with-id" }));
    await mkdir(join(dir, "outside-ref"));
    await writeFile(join(dir, "outside-ref", "outside-by-id.schema.json"), `{ "$schema": "https://example.com/outside-meta-with-id", "type": "string" }`);
    await writeFile(join(dir, "outside-ref", "outside.schema.json"), JSON.stringify({
      $schema: pathToFileURL(join(outside, "meta.schema.json")).href,
      type: "string"
    }));

    // Serves the meta-schema at every path
    server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/schema+json" });
      response.end(metaSchema);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
    const origin = `http://127.0.0.1:${/** @type AddressInfo */ (server.address()).port}`;

    await mkdir(join(dir, "remote"));
    await writeFile(join(dir, "remote", ".jsonschemarc"), JSON.stringify({ settings: { allowRetrieval: [`${origin}/schemas/`] } }));
    await writeFile(join(dir, "remote", "allowed.schema.json"), `{ "$schema": "${origin}/schemas/meta", "type": "string" }`);
    await writeFile(join(dir, "remote", "refused.schema.json"), `{ "$schema": "${origin}/other/meta", "type": "string" }`);

    await mkdir(join(dir, "exact"));
    await writeFile(join(dir, "exact", ".jsonschemarc"), JSON.stringify({ settings: { allowRetrieval: [`${origin}/meta`] } }));
    await writeFile(join(dir, "exact", "allowed.schema.json"), `{ "$schema": "${origin}/meta", "type": "string" }`);
    await writeFile(join(dir, "exact", "refused.schema.json"), `{ "$schema": "${origin}/meta/other", "type": "string" }`);

    await mkdir(join(dir, "file-setting"));
    await writeFile(join(dir, "file-setting", ".jsonschemarc"), JSON.stringify({ settings: { allowRetrieval: [pathToFileURL(outside).href + "/"] } }));
    await writeFile(join(dir, "file-setting", "a.schema.json"), `{ "$schema": "https://json-schema.org/v1" }`);

    await mkdir(join(dir, "relative-setting"));
    await writeFile(join(dir, "relative-setting", ".jsonschemarc"), JSON.stringify({ settings: { allowRetrieval: ["./vendor/"] } }));
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

  test("only .schema.json files are linted in a folder", async () => {
    const { output } = await report([".", "-q"]);
    expect(output).to.contain("a.schema.json");
    expect(output).to.contain("https://json-schema.org/keyword/minLength");
    expect(output).not.to.contain("package.json");
  });

  test("lint rules aren't on without configuration", async () => {
    const { output } = await report(["valid"]);
    expect(output).not.to.contain("then-else-without-if");
  });

  test("a preset in .jsonschemarc turns on lint rules as warnings", async () => {
    const { output, exitCode } = await report(["linted/c.schema.json"]);
    expect(output).to.match(/warning\s+'then' has no effect without 'if'\s+then-else-without-if\s+jsonschema-lint/);
    expect(exitCode).to.equal(0);
  });

  test("a $comment turns off rules from .jsonschemarc", async () => {
    const { output } = await report(["linted/disabled.schema.json"]);
    expect(output).not.to.contain("then-else-without-if");
  });

  test("a rule in .jsonschemarc can be made an error", async () => {
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

  test("a meta-schema it wasn't given isn't found by its identifier", async () => {
    const { output, exitCode } = await report(["meta/by-id.schema.json", "-q"]);
    expect(output).to.contain("Unable to retrieve the meta-schema for the 'https://example.com/meta' dialect");
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

  test("files in a folder it was given are found", async () => {
    const { exitCode } = await report(["meta", "-q"]);
    expect(exitCode).to.equal(0);
  });

  test("a plain JSON file can be included with an ignore pattern", async () => {
    const { output } = await report([".", "-q", "--ignore-pattern", "!package.json"]);
    expect(output).to.contain("package.json");
    expect(output).to.contain("missing-dialect");
  });
});
