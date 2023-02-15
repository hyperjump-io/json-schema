/* eslint-disable @typescript-eslint/no-misused-promises */
import { expect } from "chai";
import { MockAgent, setGlobalDispatcher } from "undici";
import { Given, Then } from "./mocha-gherkin.spec.js";
import "../stable/index.js";
import * as Schema from "./schema.js";


const testDomain = "http://test.jsc.hyperjump.io";
const defaultDialectId = "https://json-schema.org/validation";
const customDialectId = `${testDomain}/dialect/dialect-identification/custom`;

describe("Media Types", () => {
  let mockAgent: MockAgent;

  before(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);

    Schema.add({
      $id: customDialectId,
      $vocabulary: {}
    });
  });

  after(async () => {
    await mockAgent.close();
  });

  Given("a schema with Content-Type: application/octet-stream", () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/no-content-type" })
        .reply(200, JSON.stringify({}), { headers: { "Content-Type": "application/octet-stream" } });
    });

    Then("it should throw an error when retrieving the schema", async () => {
      try {
        await Schema.get(`${testDomain}/no-content-type`);
        expect.fail("Expected exception");
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).to.include("is not a schema");
        }
      }
    });
  });

  Given("a schema with Content-Type: application/json", () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/json" })
        .reply(200, JSON.stringify({}), { headers: { "Content-Type": "application/json" } });
    });

    Then("it should throw an error when retrieving the schema", async () => {
      try {
        await Schema.get(`${testDomain}/json`);
        expect.fail("Expected exception");
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).to.include("is not a schema");
        }
      }
    });
  });

  Given("a schema without $schema", () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema-json" })
        .reply(200, JSON.stringify({ type: "string" }), {
          headers: { "Content-Type": "application/schema+json" }
        });
    });

    Then("the fetched schema should have the default dialect", async () => {
      const schema = await Schema.get(`${testDomain}/schema-json`);
      expect(schema.dialectId).to.equal(defaultDialectId);
    });
  });

  Given("a schema with a known $schema", () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema-json-known" })
        .reply(200, JSON.stringify({ $schema: customDialectId }), {
          headers: { "Content-Type": "application/schema+json" }
        });
    });

    Then("the fetched schema should have the default dialect", async () => {
      const schema = await Schema.get(`${testDomain}/schema-json-known`);
      expect(schema.dialectId).to.equal(customDialectId);
    });
  });

  Given(`a schema without $schema and media type paramter; schema="${customDialectId}"`, () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema-json-schema" })
        .reply(200, JSON.stringify({}), {
          headers: { "Content-Type": `application/schema+json; schema="${customDialectId}"` }
        });
    });

    Then("the fetched schema should have the given dialect", async () => {
      const schema = await Schema.get(`${testDomain}/schema-json-schema`);
      expect(schema.dialectId).to.equal(customDialectId);
    });
  });

  Given(`a schema without $schema and media type paramter; schema="${customDialectId}"`, () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema-json-schema-custom" })
        .reply(200, JSON.stringify({}), {
          headers: { "Content-Type": `application/schema+json; schema="${customDialectId}"` }
        });
    });

    Then("the fetched schema should have the given dialect", async () => {
      const schema = await Schema.get(`${testDomain}/schema-json-schema-custom`);
      expect(schema.dialectId).to.equal(customDialectId);
    });
  });

  Given("a schema with $schema and media type parameter", () => {
    beforeEach(() => {
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema-json-schema" })
        .reply(200, JSON.stringify({ $schema: customDialectId }), {
          headers: { "Content-Type": `application/schema+json; schema="${testDomain}/dialect/dialect-identification/custom"` }
        });
    });

    Then("the fetched schema should have the $schema dialect", async () => {
      const schema = await Schema.get(`${testDomain}/schema-json-schema`);
      expect(schema.dialectId).to.equal(customDialectId);
    });
  });
});
