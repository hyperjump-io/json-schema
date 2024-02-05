import { append as pointerAppend, get as pointerGet } from "@hyperjump/json-pointer";
import { jsonTypeOf, toAbsoluteUri } from "./common.js";
import { Reference } from "@hyperjump/browser/jref";


export class JsInstance {
  constructor(instance, id = "") {
    this.id = id ? toAbsoluteUri(id) : "";
    this.pointer = "";
    this.instance = instance;
    this._value = instance;
  }

  uri() {
    return `${this.id || ""}#${encodeURI(this.pointer)}`;
  }

  value() {
    return this._value instanceof Reference ? this._value.toJSON() : this._value;
  }

  has(key) {
    return key in this.value();
  }

  typeOf() {
    return jsonTypeOf(this.value());
  }

  get(url) {
    if (!url.startsWith("#")) {
      throw Error(`No JSON document found at '${toAbsoluteUri(url)}'`);
    }

    const instance = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    instance.pointer = decodeURI(url.substr(1));
    instance._value = pointerGet(instance.pointer, this.instance);

    return instance;
  }

  step(key) {
    const instance = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    instance.pointer = pointerAppend(key, this.pointer);
    instance._value = this.value()[key];

    return instance;
  }

  * iter() {
    for (let index = 0; index < this.value().length; index++) {
      yield this.step(index);
    }
  }

  * keys() {
    for (const key in this.value()) {
      const instance = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
      instance.pointer = undefined;
      instance._value = key;

      yield instance;
    }
  }

  * values() {
    for (const key in this.value()) {
      yield this.step(key);
    }
  }

  * entries() {
    for (const key in this.value()) {
      const keyInstance = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
      keyInstance.pointer = undefined;
      keyInstance._value = key;

      yield [keyInstance, this.step(key)];
    }
  }

  length() {
    return this.value().length;
  }
}
