export type Reference = {
  cons: (href: string, value: unknown) => Ref;
  isReference: (ref: unknown) => ref is Ref;
  href: (ref: Ref) => string;
  value: <A>(ref: Ref) => A;
};

declare const $__value: unique symbol;
declare const $__href: unique symbol;
export type Ref = {
  [$__href]: string;
  [$__value]: unknown;
};

declare const reference: Reference;
export default reference;
