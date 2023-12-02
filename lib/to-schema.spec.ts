import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { getSchema, toSchema } from "./experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-04/index.js";

import type { Browser } from "@hyperjump/browser";
import type { SchemaDocument, ToSchemaOptions } from "./experimental.js";


describe("JSON Schema - toString", () => {
  const testDomain = "https://json-schema.hyperjump.io";
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
  });

  describe("dialect and self-identification", () => {
    const contextDialectId = "https://json-schema.org/validation";
    let schema: Browser<SchemaDocument>;

    beforeEach(async () => {
      const schemaJson = `{}`;

      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema" })
        .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

      schema = await getSchema(`${testDomain}/schema`);
    });

    test("default options", async () => {
      expect(toSchema(schema)).to.eql({
        $schema: contextDialectId
      });
    });

    test("contextDialectId: stable", async () => {
      const options = { contextDialectId: contextDialectId };
      expect(toSchema(schema, options)).to.eql({});
    });

    test("contextDialectId: 2020-12", async () => {
      const options = { contextDialectId: "https://json-schema.org/draft/2020-12/schema" };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId
      });
    });

    test("contextDialectId: stable, includeDialect: auto", async () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "auto"
      };
      expect(toSchema(schema, options)).to.eql({});
    });

    test("contextDialectId: 2020-12, includeDialect: auto", async () => {
      const options: ToSchemaOptions = {
        contextDialectId: "https://json-schema.org/draft/2020-12/schema",
        includeDialect: "auto"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId
      });
    });

    test("contextDialectId: stable, includeDialect: always", async () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "always"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId
      });
    });

    test("contextDialectId: stable, includeDialect: never", async () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "never"
      };
      expect(toSchema(schema, options)).to.eql({});
    });

    test("selfIdentify: true", async () => {
      const options: ToSchemaOptions = {
        selfIdentify: true
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("selfIdentify: false", async () => {
      const options: ToSchemaOptions = {
        selfIdentify: false
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId
      });
    });

    test("selfIdentify: true, contextUri: testDomain", async () => {
      const options: ToSchemaOptions = {
        selfIdentify: true,
        contextUri: testDomain
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: "/schema"
      });
    });

    test("selfIdentify: true, contextUri: urn", async () => {
      const options: ToSchemaOptions = {
        selfIdentify: true,
        contextUri: "urn:example:example"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("selfIdentify: true, contextUri: example.com", async () => {
      const options: ToSchemaOptions = {
        selfIdentify: true,
        contextUri: "https://example.com"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });
  });

  test("legacy self-identification", async () => {
    const contextDialectId = "http://json-schema.org/draft-04/schema#";
    const schemaJson = `{}`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    const options: ToSchemaOptions = {
      selfIdentify: true
    };
    expect(toSchema(schema, options)).to.eql({
      $schema: contextDialectId,
      id: `${testDomain}/schema`
    });
  });

  test("identifier with a query", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{}`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema?foo=bar&baz" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema?foo=bar&baz`);
    const options: ToSchemaOptions = {
      selfIdentify: true
    };
    expect(toSchema(schema, options)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema?foo=bar&baz`
    });
  });

  test("anchors", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{
      "$anchor": "root",

      "type": "object",
      "properties": {
        "foo": { "$anchor": "foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $anchor: "root",

      type: "object",
      properties: {
        foo: { $anchor: "foo" }
      }
    });
  });

  test("legacy anchors", async () => {
    const contextDialectId = "http://json-schema.org/draft-07/schema#";
    const schemaJson = `{
      "$id": "#root",

      "type": "object",
      "properties": {
        "foo": { "$id": "#foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: "#root",

      type: "object",
      properties: {
        foo: { $id: "#foo" }
      }
    });
  });

  test("dynamic anchors", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{
      "$dynamicAnchor": "root",

      "type": "object",
      "properties": {
        "foo": { "$dynamicAnchor": "foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    });
  });

  test("legacy dynamic anchors", async () => {
    const contextDialectId = "https://json-schema.org/draft/2020-12/schema";
    const schemaJson = `{
      "$dynamicAnchor": "root",

      "type": "object",
      "properties": {
        "foo": { "$dynamicAnchor": "foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    });
  });

  test("recursive anchors", async () => {
    const contextDialectId = "https://json-schema.org/draft/2019-09/schema";
    const schemaJson = `{
      "$recursiveAnchor": true
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $recursiveAnchor: true
    });
  });

  test("references", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{
      "$ref": "#/$defs/foo",
      "$defs": {
        "foo": {}
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $ref: "#/$defs/foo",
      $defs: {
        foo: {}
      }
    });
  });

  test("legacy references", async () => {
    const contextDialectId = "http://json-schema.org/draft-07/schema#";
    const schemaJson = `{
      "allOf": [{ "$ref": "#/$defs/foo" }],
      "$defs": {
        "foo": {}
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      allOf: [{ $ref: "#/$defs/foo" }],
      $defs: {
        foo: {}
      }
    });
  });

  test("include embedded schemas", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{
      "$ref": "foo",
      "$defs": {
        "foo": { "$id": "foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $ref: "foo",
      $defs: {
        foo: { $id: "foo" }
      }
    });
  });

  test("exclude embedded schemas", async () => {
    const contextDialectId = "https://json-schema.org/validation";
    const schemaJson = `{
      "$ref": "foo",
      "$defs": {
        "foo": { "$id": "foo" }
      }
    }`;

    mockAgent.get(testDomain)
      .intercept({ method: "GET", path: "/schema" })
      .reply(200, schemaJson, { headers: { "content-type": `application/schema+json; schema="${contextDialectId}"` } });

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema, { includeEmbedded: false })).to.eql({
      $schema: contextDialectId,
      $ref: "foo"
    });
  });
});
