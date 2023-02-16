export interface Callable {
  isCallable: true;
  call(arguments_: any[]): any;
  arity(): number | "variadic";
}

export function isCallable(a: any): a is Callable {
  return a && a.isCallable;
}
