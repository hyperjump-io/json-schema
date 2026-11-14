import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MockAgent, setGlobalDispatcher } from "undici";
import { RetrievalError } from "@hyperjump/browser";
import { validate } from "../draft-2020-12/index.js";
import { buildSchemaDocument } from "./experimental.js";
import "../draft-07/index.js";


describe("Identifying a schema with a 'file:' URI", () => {
  const dialect = "https://json-schema.org/draft/2020-12/schema";
  const fileId = "file:///path/to/local.schema.json";

  describe("from a schema that isn't from the filesystem", () => {
    it("root $id", () => {
      expect(() => {
        buildSchemaDocument({ $schema: dialect, $id: fileId }, "https://example.com/schema");
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });

    it("root $id without a retrieval URI", () => {
      expect(() => {
        buildSchemaDocument({ $schema: dialect, $id: fileId });
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });

    it("embedded $id", () => {
      expect(() => {
        buildSchemaDocument({
          $schema: dialect,
          $defs: { foo: { $id: fileId } }
        }, "https://example.com/schema");
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });

    it("embedded legacy id", () => {
      expect(() => {
        buildSchemaDocument({
          $schema: "http://json-schema.org/draft-07/schema#",
          definitions: { foo: { $id: fileId } }
        }, "https://example.com/schema");
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });

    it("scheme in a different case", () => {
      expect(() => {
        buildSchemaDocument({ $schema: dialect, $id: "FILE:///path/to/local.schema.json" }, "https://example.com/schema");
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });

    it("embedded in an embedded schema that isn't a file", () => {
      expect(() => {
        buildSchemaDocument({
          $schema: dialect,
          $defs: {
            foo: {
              $id: "https://example.com/foo",
              $defs: { bar: { $id: fileId } }
            }
          }
        }, "file:///path/to/schema.schema.json");
      }).to.throw(Error, "can't be identified with a 'file:' URI");
    });
  });

  describe("from a schema from the filesystem", () => {
    it("root $id", () => {
      const document = buildSchemaDocument({ $schema: dialect, $id: fileId }, "file:///path/to/schema.schema.json");
      expect(document.baseUri).to.equal(fileId);
    });

    it("embedded $id", () => {
      const document = buildSchemaDocument({
        $schema: dialect,
        $defs: { foo: { $id: fileId } }
      }, "file:///path/to/schema.schema.json");
      expect(document.embedded).to.haveOwnProperty(fileId);
    });
  });

  describe("retrieved from the web", () => {
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

    it("can't reference a local file through an embedded 'file:' $id", async () => {
      const schema = {
        $schema: dialect,
        $ref: "#/$defs/foo",
        $defs: {
          foo: {
            $id: "file:///path/to/foo.schema.json",
            $ref: "local.schema.json"
          }
        }
      };
      mockAgent.get(testDomain)
        .intercept({ method: "GET", path: "/schema" })
        .reply(200, JSON.stringify(schema), { headers: { "content-type": "application/schema+json" } });

      await expect(validate(`${testDomain}/schema`, 42)).rejects.toThrow(RetrievalError);
    });
  });
});
