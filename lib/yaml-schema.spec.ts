import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import contentTypeParser from "content-type";
import { addMediaTypePlugin, value } from "@hyperjump/browser";
import { toAbsoluteIri } from "@hyperjump/uri";
import { When, Then } from "./gherkin.js";
import YAML from "yaml";
import "../stable/index.js";
import { getSchema, buildSchemaDocument } from "./experimental.js";

import type { Browser } from "@hyperjump/browser";
import type { SchemaObject } from "./index.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDomain = "http://test.jsc.hyperjump.io";

addMediaTypePlugin("application/schema+yaml", {
  parse: async (response) => {
    const contentType = contentTypeParser.parse(response.headers.get("content-type") ?? "");
    const contextDialectId = contentType.parameters.schema ?? contentType.parameters.profile; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

    const json = YAML.parse(await response.text()) as SchemaObject | boolean;

    return buildSchemaDocument(json, response.url, contextDialectId ? toAbsoluteIri(contextDialectId) : contextDialectId);
  },
  fileMatcher: async (path) => path.endsWith(".schema.yml")
});

describe("Schema.get with YAML", () => {
  let mockAgent: MockAgent;

  beforeAll(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterAll(async () => {
    await mockAgent.close();
  });

  When("fetching a YAML schema from the file system", () => {
    let schema: Browser;

    beforeEach(async () => {
      schema = await getSchema(`./lib/string.schema.yml`);
    });

    Then("it should parse the YAML and load the schema", () => {
      expect(value(schema)).to.eql({ type: "string" });
    });
  });

  When("fetching a YAML schema from the web", () => {
    let schema: Browser;

    beforeEach(async () => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/string" })
        .reply(200, fs.readFileSync(`${__dirname}/string.schema.yml`, "utf8"), {
          headers: { "Content-Type": "application/schema+yaml" }
        });
      schema = await getSchema(`${testDomain}/string`);
    });

    Then("it should parse the YAML and load the schema", () => {
      expect(value(schema)).to.eql({ type: "string" });
    });
  });
});
