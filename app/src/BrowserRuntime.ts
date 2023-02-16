import { IError } from "./interpreter/IError";
import { Runner } from "./interpreter/Runner";

export type onErrorType = (error: IError | undefined) => void;

export class BrowserRuntime extends Runner {
  onError: onErrorType;

  constructor(onError: onErrorType) {
    super();
    this.onError = onError;
  }
}
