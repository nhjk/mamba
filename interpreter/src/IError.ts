import { Token } from "./Token";

export class IError extends Error {
  readonly token: Token | number;

  constructor(token: Token | number, message: string) {
    super(message);
    this.token = token;
  }
}

export class IRuntimeError extends IError {
  readonly token: Token;

  constructor(token: Token, message: string) {
    super(token, message);
    this.token = token;
  }
}

export class ITypeError extends IRuntimeError {}
