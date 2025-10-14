import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { getSchema } from "./experimental.js";
import "../v1/index.js";


describe("Schema Media Type Plugin", () => {
  const testDomain = "https://test.hyperjump.io";
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
  });

  it("declare dialect with schema media-type parameter", async () => {
    const dialect = "https://json-schema.org/v1";

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, "{}", { headers: { "content-type": `application/schema+json; schema="${dialect}"` } });

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dialectId).to.equal(dialect);
    expect(browser.document.root).to.not.haveOwnProperty("$schema");
  });

  it("declare dialect with profile media-type parameter", async () => {
    const dialect = "https://json-schema.org/v1";

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, "{}", { headers: { "content-type": `application/schema+json; profile="${dialect}"` } });

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dialectId).to.equal(dialect);
    expect(browser.document.root).to.not.haveOwnProperty("$schema");
  });

  it("$schema overrides media type parameter", async () => {
    const dialect = "https://json-schema.org/v1";
    const schema = `{ "$schema": "${dialect}" }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schema, { headers: { "content-type": `application/schema+json; schema="https://json-schema.org/draft/2020-12/schema"` } });

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dialectId).to.equal(dialect);
    expect(browser.document.root).to.not.haveOwnProperty("$schema");
  });

  it("schema identified by retieval URI", async () => {
    const schema = `{ "$schema": "https://json-schema.org/v1" }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schema, { headers: { "content-type": "application/schema+json" } });

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.uri).to.equal(`${testDomain}/schema`);
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("self-identifying schema", async () => {
    const schema = `{
      "$schema": "https://json-schema.org/v1",
      "$id": "https://example.com/schema"
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schema, { headers: { "content-type": "application/schema+json" } });

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.uri).to.equal(`${testDomain}/schema`);
    expect(browser.document.baseUri).to.equal(`https://example.com/schema`);
  });

  it("self-identifying schema with pointer fragment", async () => {
    const schema = `{
      "$schema": "https://json-schema.org/v1",
      "$id": "https://example.com/schema",
      "$defs": {
        "foo": {}
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schema, { headers: { "content-type": "application/schema+json" } });

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/$defs/foo`);
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`https://example.com/schema`);
  });

  it("not a schema document", async () => {
    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/not-a-schema" })
      .reply(200, "{}", { headers: { "content-type": "application/reference+json" } });

    try {
      await getSchema(`${testDomain}/not-a-schema`);
      expect.fail();
    } catch (error: unknown) {
      expect((error as Error).message).to.have.string("is not a schema");
    }
  });
});
