import { Callable } from "./Callable";
import { IError, IRuntimeError } from "./IError";
import { Instance } from "./Instance";
import { Interpreter } from "./Interpreter";
import { Parser } from "./Parser";
import { Resolver } from "./Resolver";
import { Scanner } from "./Scanner";
import { Stmt } from "./Stmt";
import { Token } from "./Token";

export class Runner {
  protected readonly interpreter = new Interpreter(this);
  protected hadError = false;
  protected hadRuntimeError = false;

  async run(source: string) {
    const scanner = new Scanner(this, source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(this, tokens);
    const statements = parser.parse();

    if (this.hadError) return;

    const resolver = new Resolver(this, this.interpreter);
    resolver.resolve(statements as Stmt[]);

    if (this.hadError) return;

    // can cast because if any were undefined hadError should be set
    await this.interpreter.interpret(statements as Stmt[]);
  }

  stop() {
    this.interpreter.stop();
  }

  resume() {
    this.interpreter.resume();
  }

  ffi(name: string, value: Callable | Instance) {
    this.interpreter.ffi(name, value);
  }

  error(x: number | Token, message: string) {
    this.hadError = true;
    this.onError(new IError(x, message));
  }

  runtimeError(error: IRuntimeError) {
    this.hadRuntimeError = true;
    this.onError(error);
  }

  onError(error: IError) {
    console.log(error.token, error.message);
  }
}
