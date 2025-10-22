import { describe, it, expect, afterEach } from "vitest";
import { Agent, setGlobalDispatcher } from "undici";
import { RetrievalError } from "@hyperjump/browser";
import { registerSchema, unregisterSchema } from "./index.js";
import { getSchema, hasDialect } from "./experimental.js";
import "../stable/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-04/index.js";


setGlobalDispatcher(new Agent({ connect: { timeout: 100 } }));

describe("Schema Parsing", () => {
  const testDomain = "https://test.hyperjump.io";

  afterEach(() => {
    unregisterSchema(`${testDomain}/schema`);
    unregisterSchema(`${testDomain}/relative-schema`);
    unregisterSchema(`https://example.com/schema`);
  });

  it("boolean schema without context dialect", () => {
    expect(() => {
      registerSchema(true, `${testDomain}/schema`);
    }).to.throw(Error, "Unable to determine a dialect for the schema");
  });

  it("schema without context dialect", () => {
    expect(() => {
      registerSchema({}, `${testDomain}/schema`);
    }).to.throw(Error, "Unable to determine a dialect for the schema");
  });

  it("schema with unknown dialect", () => {
    expect(() => {
      registerSchema({
        $schema: `${testDomain}/unknown-dialect`
      }, `${testDomain}/schema`);
    }).to.throw(Error, "Encountered unknown dialect");
  });

  it("declare dialect with $schema", async () => {
    const dialect = "https://json-schema.org/validation";
    registerSchema({ $schema: dialect }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dialectId).to.equal(dialect);
    expect(browser.document.root).to.not.haveOwnProperty("$schema");
  });

  it("schema with no identifier", () => {
    expect(() => {
      registerSchema({ $schema: "https://json-schema.org/validation" });
    }).to.throw(Error, "Unable to determine an identifier for the schema");
  });

  it("self-identifying schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $id: "https://example.com/schema"
    });

    const browser = await getSchema("https://example.com/schema");
    expect(browser.uri).to.equal("https://example.com/schema");
    expect(browser.document.baseUri).to.equal(`https://example.com/schema`);
  });

  it("relative self-identifying schema without retrieval URI", () => {
    expect(() => {
      registerSchema({
        $schema: "https://json-schema.org/validation",
        $id: "/schema"
      });
    }).to.throw(Error, "Invalid absolute-IRI");
  });

  it("relative self-identifying schema with retrieval URI", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $id: "/relative-schema"
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.uri).to.equal(`${testDomain}/schema`);
    expect(browser.document.baseUri).to.equal(`${testDomain}/relative-schema`);
  });

  it("self-identifying schema with file scheme", () => {
    expect(() => {
      registerSchema({
        $schema: "https://json-schema.org/validation",
        $id: "file:///path/to/schema.schema.json"
      });
    }).to.throw(Error, "Registering a schema with a 'file:' URI scheme is not allowed");
  });

  it("schema with pointer fragment", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: {}
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/$defs/foo`);
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("self-identifying schema with pointer fragment", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $id: "https://example.com/schema",
      $defs: {
        foo: {}
      }
    });

    const browser = await getSchema("https://example.com/schema#/$defs/foo");
    expect(browser.uri).to.equal("https://example.com/schema#/$defs/foo");
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`https://example.com/schema`);
  });

  it("schema with anchor fragment", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: { $anchor: "foo" }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#foo`);
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("schema with legacy anchor fragment", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-07/schema#",
      $defs: {
        foo: { $id: "#foo" }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#foo`);
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("schema with legacy anchor fragment in the root", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "#foo"
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#foo`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("self-identifying schema with anchor fragment", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $id: "https://example.com/schema",
      $defs: {
        foo: { $anchor: "foo" }
      }
    });

    const browser = await getSchema("https://example.com/schema#foo");
    expect(browser.uri).to.equal("https://example.com/schema#foo");
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.baseUri).to.equal(`https://example.com/schema`);
  });

  it("internal reference", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: { $ref: "#/$defs/bar" },
        bar: {}
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/$defs/bar`);
    expect(browser.cursor).to.equal("/$defs/bar");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("legacy internal reference", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: {
        foo: { $ref: "#/definitions/bar" },
        bar: {}
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/definitions/foo`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/definitions/bar`);
    expect(browser.cursor).to.equal("/definitions/bar");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("non-reference $ref", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        $ref: {}
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/$defs/$ref`);
    expect(browser.cursor).to.equal("/$defs/$ref");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("non-reference legacy $ref", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: {
        $ref: {}
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/definitions/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/schema#/definitions/$ref`);
    expect(browser.cursor).to.equal("/definitions/$ref");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("embedded schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: {
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
  });

  it("legacy embedded schema", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: {
        foo: {
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/definitions/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
  });

  it("reference embedded schema by pointer", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $ref: "#/$defs/foo",
      $defs: {
        foo: {
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
  });

  it("reference embedded schema by id", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $ref: "/embedded",
      $defs: {
        foo: {
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
  });

  it("reference main schema from embedded schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $ref: "/embedded#/$ref",
      $defs: {
        foo: {
          $id: "/embedded",
          $ref: "/schema"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/schema`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/schema`);
  });

  it("reference embedded schema from embedded schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $ref: "/foo#/$ref",
      $defs: {
        foo: {
          $id: "/foo",
          $ref: "/bar"
        },
        bar: {
          $id: "/bar"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$ref`);
    expect(browser.uri).to.equal(`${testDomain}/bar`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/bar`);
  });

  it("embedded schema with non-dialect changing $schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: {
          $schema: "https://json-schema.org/validation",
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
    expect(browser.document.dialectId).to.equal("https://json-schema.org/validation");
  });

  it("embedded schema with dialect changing $schema both using $id", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
    expect(browser.document.dialectId).to.equal("https://json-schema.org/draft/2020-12/schema");
  });

  it("embedded schema with dialect changing $schema from $id to id", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $defs: {
        foo: {
          $schema: "http://json-schema.org/draft-04/schema#",
          id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/$defs/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
    expect(browser.document.dialectId).to.equal("http://json-schema.org/draft-04/schema");
  });

  it("embedded schema with dialect changing $schema from id to $id", async () => {
    registerSchema({
      $schema: "http://json-schema.org/draft-04/schema#",
      definitions: {
        foo: {
          $schema: "https://json-schema.org/validation",
          $id: "/embedded"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#/definitions/foo`);
    expect(browser.uri).to.equal(`${testDomain}/embedded`);
    expect(browser.cursor).to.equal("");
    expect(browser.document.baseUri).to.equal(`${testDomain}/embedded`);
    expect(browser.document.dialectId).to.equal("https://json-schema.org/validation");
  });

  it("dynamic anchors", async () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $dynamicAnchor: "foo",
      $defs: {
        foo: {
          $dynamicAnchor: "bar"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dynamicAnchors).to.eql({
      foo: `${testDomain}/schema#`,
      bar: `${testDomain}/schema#/$defs/foo`
    });
  });

  it("legacy dynamic anchors", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $dynamicAnchor: "foo",
      $defs: {
        foo: {
          $dynamicAnchor: "bar"
        }
      }
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema#bar`);
    expect(browser.cursor).to.equal("/$defs/foo");
    expect(browser.document.dynamicAnchors).to.eql({
      foo: `${testDomain}/schema#`,
      bar: `${testDomain}/schema#/$defs/foo`
    });
  });

  it("recursive anchors", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2019-09/schema",
      $recursiveAnchor: true
    }, `${testDomain}/schema`);

    const browser = await getSchema(`${testDomain}/schema`);
    expect(browser.document.dynamicAnchors).to.eql({ "": `${testDomain}/schema#` });
  });

  it("registering a dialect schema", () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $vocabulary: {
        "https://json-schema.org/vocab/core": true
      }
    }, `${testDomain}/schema`);

    expect(hasDialect(`${testDomain}/schema`)).to.equal(true);
  });

  it("unregistering a dialect schema", () => {
    registerSchema({
      $schema: "https://json-schema.org/validation",
      $vocabulary: {
        "https://json-schema.org/vocab/core": true
      }
    }, `${testDomain}/schema`);
    unregisterSchema(`${testDomain}/schema`);

    expect(hasDialect(`${testDomain}/schema`)).to.equal(false);
  });

  it("duplicate registered schema", () => {
    const schema = {
      $schema: "https://json-schema.org/validation"
    };

    registerSchema(schema, `${testDomain}/schema`);

    expect(() => {
      registerSchema(schema, `${testDomain}/schema`);
    }).to.throw(Error, "schema has already been registered");
  });

  it("remove registered schema", async () => {
    const schema = {
      $schema: "https://json-schema.org/validation"
    };

    registerSchema(schema, `${testDomain}/schema`);
    unregisterSchema(`${testDomain}/schema`);

    try {
      await getSchema(`${testDomain}/schema`);
      expect.fail();
    } catch (error: unknown) {
      expect(error).to.be.instanceof(RetrievalError);
    }
  });

  it("register removed schema", async () => {
    const schema = {
      $schema: "https://json-schema.org/validation"
    };

    registerSchema(schema, `${testDomain}/schema`);
    unregisterSchema(`${testDomain}/schema`);
    registerSchema(schema, `${testDomain}/schema`);
    const browser = await getSchema(`${testDomain}/schema`);

    expect(browser.uri).to.eql(`${testDomain}/schema`);
    expect(browser.document.baseUri).to.eql(`${testDomain}/schema`);
  });
});
