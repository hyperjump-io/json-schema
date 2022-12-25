export const subscribe: <A>(message: string, fn: SubscribeFn<A>) => string;
export const unsubscribe: (message: string, token: string) => void;
export const publish: <A>(message: string, data: A) => void;
export const publishAsync: <A>(message: string, data: A) => Promise<void>;

export type SubscribeFn<A> = (message: string, data: A) => void;
