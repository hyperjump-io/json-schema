import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { get as browserGet, RetrievalError } from "@hyperjump/browser";
import { MockAgent, setGlobalDispatcher } from "undici";
import { registerSchema, unregisterSchema } from "./index.js";
import { getSchema } from "./experimental.js";
import "../v1/index.js";


describe("Schema registry browser lookup", () => {
  const domain = "https://cache.hyperjump.io";
  const rootUri = `${domain}/root`;
  const targetUri = `${domain}/target`;
  const dialect = "https://json-schema.org/v1";
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    registerSchema({ $schema: dialect }, rootUri);
  });

  afterEach(async () => {
    unregisterSchema(rootUri);
    unregisterSchema(targetUri);
    await mockAgent.close();
  });

  const mockSchema = (type: string) => {
    mockAgent.get(domain)
      .intercept({ method: "GET", path: "/target" })
      .reply(200, { $schema: dialect, type }, { headers: { "content-type": "application/schema+json" } });
  };

  it("doesn't find unregistered schemas in existing browsers", async () => {
    registerSchema({ $schema: dialect, type: "string" }, targetUri);
    const browser = await getSchema(rootUri);
    expect((await getSchema(targetUri, browser)).document.root).to.eql({ type: "string" });
    unregisterSchema(targetUri);

    await expect(getSchema(targetUri, browser)).rejects.to.be.instanceof(RetrievalError);
  });

  it("finds replaced schemas in existing browsers", async () => {
    registerSchema({ $schema: dialect, type: "string" }, targetUri);
    const browser = await getSchema(rootUri);
    expect((await getSchema(targetUri, browser)).document.root).to.eql({ type: "string" });
    unregisterSchema(targetUri);
    registerSchema({ $schema: dialect, type: "number" }, targetUri);

    expect((await getSchema(targetUri, browser)).document.root).to.eql({ type: "number" });
  });

  it("finds schemas registered after a browser was created", async () => {
    const browser = await getSchema(rootUri);
    registerSchema({ $schema: dialect, type: "string" }, targetUri);

    expect((await browserGet(targetUri, { ...browser })).document.root).to.eql({ type: "string" });
  });

  it("keeps fetched documents local to each independent browser", async () => {
    const first = await getSchema(rootUri);
    const second = await getSchema(rootUri);
    mockSchema("string");
    expect((await getSchema(targetUri, first)).document.root).to.eql({ type: "string" });
    mockSchema("number");
    expect((await getSchema(targetUri, second)).document.root).to.eql({ type: "number" });
    expect((await getSchema(targetUri, first)).document.root).to.eql({ type: "string" });
    mockAgent.assertNoPendingInterceptors();
  });

  it("preserves fetched documents when the same URI is subsequently registered", async () => {
    mockSchema("string");
    const browser = await getSchema(targetUri);
    registerSchema({ $schema: dialect, type: "number" }, targetUri);

    expect((await getSchema(targetUri, browser)).document.root).to.eql({ type: "string" });
    expect((await getSchema(targetUri)).document.root).to.eql({ type: "number" });
    mockAgent.assertNoPendingInterceptors();
  });

  it("prefers fetched documents over registered schemas in a browser created outside getSchema", async () => {
    mockSchema("string");
    const browser = await browserGet(targetUri);
    registerSchema({ $schema: dialect, type: "number" }, targetUri);

    expect((await getSchema(rootUri, browser)).document.root).to.eql({});
    expect((await getSchema(targetUri, browser)).document.root).to.eql({ type: "string" });
    mockAgent.assertNoPendingInterceptors();
  });

  it("finds schemas registered after a browser created outside getSchema was first used", async () => {
    mockSchema("string");
    const browser = await browserGet(targetUri);
    await getSchema(rootUri, browser);
    const laterUri = `${domain}/later`;
    registerSchema({ $schema: dialect, type: "number" }, laterUri);

    try {
      expect((await getSchema(laterUri, browser)).document.root).to.eql({ type: "number" });
    } finally {
      unregisterSchema(laterUri);
    }
  });

  it("follows relative references and anchors to registered schemas", async () => {
    unregisterSchema(rootUri);
    registerSchema({ $schema: dialect, $ref: "target#value" }, rootUri);
    registerSchema({
      $schema: dialect,
      $defs: { value: { $anchor: "value", type: "string" } }
    }, targetUri);
    const browser = await getSchema(rootUri);

    const referenced = await browserGet("#/$ref", { ...browser });
    expect(referenced.document.baseUri).to.equal(targetUri);
    expect(referenced.cursor).to.equal("/$defs/value");
  });
});
