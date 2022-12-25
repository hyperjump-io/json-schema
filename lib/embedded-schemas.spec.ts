import { expect } from "chai";
import { Given, When, Then } from "./mocha-gherkin.spec.js";
import "../stable/index.js";
import * as Schema from "./schema.js";
import type { SchemaDocument } from "./schema.js";


const testDomain = "http://test.jsc.hyperjump.io";

describe("Embedded schemas", () => {
  Given("an embedded schema with an absolute URI", () => {
    beforeEach(() => {
      Schema.add({
        "$id": `${testDomain}/root`,
        "definitions": {
          "foo": {
            "$id": `${testDomain}/absolute-id`,
            "type": "string"
          }
        }
      });
    });

    When("retreiving the embedded schema using the embedded URI", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${testDomain}/absolute-id`);
      });

      Then("it's URI should the embedded URI", () => {
        expect(Schema.uri(subject)).to.equal(`${testDomain}/absolute-id#`);
      });
    });

    When("retreiving the embedded schema from the root schema", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${testDomain}/root#/definitions/foo`);
      });

      Then("it's URI should the embedded URI", () => {
        expect(Schema.uri(subject)).to.equal(`${testDomain}/absolute-id#`);
      });

      Then("it's dialectId should be inherited from the embedded URI", () => {
        expect(subject.dialectId).to.equal("https://json-schema.org/validation");
      });
    });

    When("retreiving a fragment of the embedded schema from the root schema", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${testDomain}/root#/definitions/foo/type`);
      });

      Then("the embedded document should not be accessible", () => {
        expect(Schema.value(subject)).to.equal(undefined);
      });
    });
  });

  Given("an embedded schema with a relative URI", () => {
    beforeEach(() => {
      Schema.add({
        "$id": `${testDomain}/root`,
        "definitions": {
          "foo": {
            "$id": "relative-id",
            "type": "string"
          }
        }
      });
    });

    When("retreiving the embedded schema using the embedded URI", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${testDomain}/relative-id`);
      });

      Then("it's URI should the embedded id resolved against the embedded URI", () => {
        expect(Schema.uri(subject)).to.equal(`${testDomain}/relative-id#`);
      });
    });
  });

  Given("an embedded schema with a different dialectId than the parent schema", () => {
    const embeddedDialectId = `${testDomain}/dialect/embedded-schemas/embedded1`;

    beforeEach(() => {
      Schema.add({
        "$id": embeddedDialectId,
        "$vocabulary": {
          "https://json-schema.org/vocab/core": true,
          "https://json-schema.org/vocab/validation": true
        }
      });
      Schema.add({
        "$id": `${testDomain}/root`,
        "definitions": {
          "foo": {
            "$id": `${testDomain}/switching-schema-version`,
            "$schema": embeddedDialectId,
            "type": "string"
          }
        }
      });
    });

    When("retreiving the embedded schema using the embedded URI", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${testDomain}/switching-schema-version`);
      });

      Then("its dialectId should change to the embedded schema", () => {
        expect(subject.dialectId).to.equal(embeddedDialectId);
      });
    });
  });

  Given("an embedded schema with an anchor that should only be understood by the parent", () => {
    const embeddedDialectId = `${testDomain}/dialect/embedded-schemas/embedded3`;

    beforeEach(() => {
      Schema.add({
        "$id": `${testDomain}/root`,
        "definitions": {
          "foo": {
            "id": `${testDomain}/wrong-anchor-token`,
            "$schema": embeddedDialectId,
            "$anchor": "foo",
            "type": "string"
          }
        }
      });
    });

    When("retreiving the embedded schema using the embedded anchor", () => {
      Then("foo", () => {
        Schema.get(`${testDomain}/wrong-anchor-token#foo`)
          .then(() => expect.fail())
          .catch((error) => expect(error).to.be.an("error"));
      });
    });
  });
});
