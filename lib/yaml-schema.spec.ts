import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { MockAgent, setGlobalDispatcher } from "undici";
import { When, Then } from "./mocha-gherkin.spec.js";
import * as JsonSchema from "./index.js";
import "../stable/index.js";
import * as Schema from "./schema.js";
import type { SchemaDocument, SchemaObject } from "./schema.js";
import Yaml from "yaml";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDomain = "http://test.jsc.hyperjump.io";

JsonSchema.addMediaTypePlugin("application/schema+yaml", {
  parse: async (response) => [Yaml.parse(await response.text()) as SchemaObject, undefined],
  matcher: (path) => path.endsWith(".schema.yaml")
});

describe("Schema.get with YAML", () => {
  let mockAgent: MockAgent;

  before(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  after(async () => {
    await mockAgent.close();
  });

  When("fetching a YAML schema from the file system", () => {
    let schema: SchemaDocument;

    beforeEach(async () => {
      schema = await Schema.get(`file://${__dirname}/string.schema.yaml`);
    });

    Then("it should parse the YAML and load the schema", () => {
      expect(Schema.value(schema)).to.eql({ type: "string" });
    });
  });

  When("fetching a YAML schema from the web", () => {
    let schema: SchemaDocument;

    beforeEach(async () => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/string" })
        .reply(200, fs.readFileSync(`${__dirname}/string.schema.yaml`, "utf8"), {
          headers: { "Content-Type": "application/schema+yaml" }
        });
      schema = await Schema.get(`${testDomain}/string`);
    });

    Then("it should parse the YAML and load the schema", () => {
      expect(Schema.value(schema)).to.eql({ type: "string" });
    });
  });
});
