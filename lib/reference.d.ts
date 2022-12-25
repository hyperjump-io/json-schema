export const cons: (href: string, value: unknown) => Ref;
export const isReference: (ref: unknown) => ref is Ref;
export const href: (ref: Ref) => string;
export const value: <A>(ref: Ref) => A;

declare const $__value: unique symbol;
declare const $__href: unique symbol;
export type Ref = {
  [$__href]: string;
  [$__value]: unknown;
};
