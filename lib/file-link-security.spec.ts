import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { expect } from "chai";
import { MockAgent, setGlobalDispatcher } from "undici";
import { Given, When, Then } from "./mocha-gherkin.spec.js";
import "../stable/index.js";
import * as Schema from "./schema.js";
import type { SchemaDocument } from "./schema.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDomain = "http://test.jsc.hyperjump.io";

describe("Schema.get with files", () => {
  let mockAgent: MockAgent;

  before(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  after(async () => {
    await mockAgent.close();
  });

  Given("a schema loaded from a file as the context schema", () => {
    let context: SchemaDocument;

    beforeEach(async () => {
      context = await Schema.get(`file://${__dirname}/no-id.schema.json`);
    });

    When("getting a schema using a relative URL", () => {
      let schema: SchemaDocument;

      beforeEach(async () => {
        schema = await Schema.get("./file-id.schema.json", context);
      });

      Then("it should resolve the relative URL against the context schema's URL and fetch the correct schema", () => {
        expect(Schema.uri(schema)).to.equal("file:///path/to/schema/file-id.schema.json#");
      });
    });

    When("getting a schema using an absolute URL with a 'file' scheme", () => {
      let schema: SchemaDocument;

      beforeEach(async () => {
        schema = await Schema.get(`file://${__dirname}/file-id.schema.json`, context);
      });

      Then("it should fetch the file", () => {
        expect(Schema.uri(schema)).to.equal("file:///path/to/schema/file-id.schema.json#");
      });
    });

    When("getting a schema using an absolute URL with an 'http' scheme", () => {
      let schema: SchemaDocument;

      beforeEach(async () => {
        Schema.add({ "$id": `${testDomain}/foo` });
        schema = await Schema.get(`${testDomain}/foo`, context);
      });

      Then("it should fetch the file", () => {
        expect(Schema.uri(schema)).to.equal(`${testDomain}/foo#`);
      });
    });
  });

  Given("a schema with an 'http' identifier loaded from a file as the context schema", () => {
    let context: SchemaDocument;

    beforeEach(async () => {
      context = await Schema.get(`file://${__dirname}/http-id.schema.json`);
    });

    When("getting a schema using a relative URL", () => {
      let schema: SchemaDocument;

      beforeEach(async () => {
        Schema.add({ "$id": `${testDomain}/foo` });
        schema = await Schema.get("./foo", context);
      });

      Then("it should resolve the relative URL against the context schema's URL and fetch the correct schema", () => {
        expect(Schema.uri(schema)).to.equal(`${testDomain}/foo#`);
      });
    });

    When("getting a schema using an absolute URL with an 'http' scheme", () => {
      let schema: SchemaDocument;

      beforeEach(async () => {
        Schema.add({ "$id": `${testDomain}/foo` });
        schema = await Schema.get(`${testDomain}/foo`, context);
      });

      Then("it should fetch the schema", () => {
        expect(Schema.uri(schema)).to.equal(`${testDomain}/foo#`);
      });
    });

    When("getting a schema using an absolute URL with a 'file' scheme", () => {
      Then("it should throw an error", () => {
        Schema.get(`file://${__dirname}/no-id.schema.json`, context)
          .then(() => expect.fail())
          .catch((error) => expect(error).to.be.an("error"));
      });
    });
  });

  Given("a schema with a 'file' identifier", () => {
    const schemaFilePath = `${__dirname}/file-id.schema.json`;

    When("the schema is retrieved from http", () => {
      beforeEach(() => {
        mockAgent.get(testDomain)
          .intercept({ method: "GET", path: "/file-id" })
          .reply(200, fs.readFileSync(schemaFilePath, "utf8"));
      });

      Then("it should throw an error", () => {
        Schema.get(`${testDomain}/file-id`)
          .then(() => expect.fail())
          .catch((error) => expect(error).to.be.an("error"));
      });
    });
  });
});
