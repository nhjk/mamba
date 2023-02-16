import { Callable, isCallable } from "./Callable";
import { Environment } from "./Environment";
import {
  Assign,
  Await,
  Binary,
  Call,
  Dict,
  Expr,
  ExprVisitor,
  Get,
  Grouping,
  Index,
  List,
  Literal,
  Logical,
  SetExpr,
  Super,
  Ternary,
  Unary,
  Variable,
} from "./Expr";
import { IClass } from "./IClass";
import { IDict } from "./IDict";
import { IRuntimeError, ITypeError } from "./IError";
import { IFunction } from "./IFunction";
import { IPromise } from "./IPromise";
import { isIndexable } from "./Indexable";
import { Instance } from "./Instance";
import { Return } from "./Return";
import { Runner } from "./Runner";
import {
  BlockStmt,
  ClassStmt,
  ExpressionStmt,
  FunctionStmt,
  IfStmt,
  ReturnStmt,
  Stmt,
  StmtVisitor,
  WhileStmt,
} from "./Stmt";
import { Token } from "./Token";
import { TokenType } from "./TokenType";
import { LangList, ObjectFFI } from "./ffi";

export class Interpreter implements ExprVisitor<any>, StmtVisitor<void> {
  private readonly globals = new Environment();
  private environment: Environment = this.globals;
  private readonly locals: Map<Expr, number> = new Map();

  private readonly runtime: Runner;
  private stopFlag = false;
  // promise resolver for resuming the interpreter
  private resumeResolver = () => {
    return undefined as any;
  };
  private lastCallParen: Token = new Token(TokenType.EOF, "", undefined, -1);

  constructor(runtime: Runner) {
    this.runtime = runtime;

    this.ffi(
      "sleep",
      new (class implements Callable {
        isCallable: true = true;
        call(arguments_: any[]) {
          return new IPromise(
            new Promise((resolve) => setTimeout(resolve, arguments_[0]))
          );
        }

        arity(): number {
          return 1;
        }
      })()
    );

    this.ffi(
      "str",
      new (class implements Callable {
        isCallable: true = true;
        call(arguments_: any[]) {
          return String(arguments_[0]);
        }

        arity(): number {
          return 1;
        }
      })()
    );

    const interpreter = this;
    this.ffi(
      "len",
      new (class implements Callable {
        isCallable: true = true;
        call(arguments_: any[]) {
          if (isIndexable(arguments_[0])) {
            return arguments_[0].indexLength();
          } else {
            throw new ITypeError(
              interpreter.lastCallParen,
              "TypeError: object has no len()."
            );
          }
        }

        arity(): number {
          return 1;
        }
      })()
    );

    this.ffi(
      "random",
      new ObjectFFI({
        randrange: (start: any, stop: any) => {
          start = Math.ceil(start);
          stop = Math.floor(stop);
          return Math.floor(Math.random() * (stop - start + 1)) + start;
        },
      })
    );

    this.ffi(
      "math",
      new ObjectFFI({
        ceil: (n: any) => Math.ceil(n),
        floor: (n: any) => Math.floor(n),
      })
    );
  }

  async interpret(statements: Stmt[]) {
    for (const statement of statements) {
      try {
        await this.execute(statement);
      } catch (error) {
        if (error instanceof IRuntimeError) {
          this.runtime.runtimeError(error);
          break;
        }
        throw error;
      }
    }
  }

  stop() {
    this.stopFlag = true;
  }

  resume() {
    this.stopFlag = false;
    this.resumeResolver();
  }

  ffi(name: string, value: Callable | Instance) {
    this.environment.define(name, value);
  }

  async visitExpressionStmt(stmt: ExpressionStmt): Promise<void> {
    await this.evaluate(stmt.expression);
  }

  async visitFunctionStmt(stmt: FunctionStmt): Promise<void> {
    const function_ = new IFunction(
      this,
      stmt,
      this.environment,
      false,
      false,
      stmt.async_
    );
    this.environment.define(stmt.name.lexeme, function_);
  }

  async visitIfStmt(stmt: IfStmt): Promise<void> {
    for (const [condition, body] of stmt.branches) {
      if (this.isTruthy(await this.evaluate(condition))) {
        await this.execute(body);
        return;
      }
    }
    if (stmt.elseBranch) await this.execute(stmt.elseBranch);
  }

  async visitWhileStmt(stmt: WhileStmt): Promise<void> {
    while (this.isTruthy(await this.evaluate(stmt.condition))) {
      await this.execute(stmt.body);
    }
  }

  async visitReturnStmt(stmt: ReturnStmt): Promise<any> {
    let value = undefined;
    if (stmt.value) value = await this.evaluate(stmt.value);

    throw new Return(value);
  }

  async visitAssign(expr: Assign): Promise<any> {
    const value = await this.evaluate(expr.value);

    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.environment.define(expr.name.lexeme, value);
    }

    return value;
  }

  async visitAwait(expr: Await) {
    let value = await this.evaluate(expr.value);
    while (value instanceof IPromise) {
      value = await value.promise;
    }
    return value;
  }

  async visitBinary(expr: Binary): Promise<any> {
    const left = await this.evaluate(expr.left);
    const right = await this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return left - right;
      case TokenType.PLUS:
        if (
          (typeof left === "number" && typeof right === "number") ||
          (typeof left === "string" && typeof right === "string")
        ) {
          return (left as any) + right;
        }
        throw new IRuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        if (right === 0) throw new IRuntimeError(expr.operator, "Divide by 0.");
        return left / right;
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return left * right;
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return left > right;
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left >= right;
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return left < right;
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return left <= right;
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
    }

    throw new Error("unexpected binary expression");
  }

  async visitIndex(expr: Index): Promise<any> {
    const indexable = await this.evaluate(expr.indexible);
    const key = await this.evaluate(expr.index);
    let value = undefined;
    if (expr.isAssign) {
      if (!expr.value) throw new Error("Index assign value must be defined.");
      value = await this.evaluate(expr.value);
    }

    if (!isIndexable(indexable))
      throw new IRuntimeError(expr.bracket, "Can only index lists and dicts.");

    if (expr.isAssign) indexable.indexSet(expr.bracket, key, value);
    return indexable.indexGet(expr.bracket, key);
  }

  async visitCall(expr: Call): Promise<any> {
    const callee = await this.evaluate(expr.callee);
    const arguments_ = [];
    for (const arg_ of expr.arguments_) {
      arguments_.push(await this.evaluate(arg_));
    }

    if (!isCallable(callee)) {
      throw new IRuntimeError(
        expr.paren,
        "Can only call functions and classes."
      );
    }

    const arity = callee.arity();
    if (arity !== "variadic" && arguments_.length !== arity) {
      throw new IRuntimeError(
        expr.paren,
        `Expected ${arity} arguments but got ${arguments_.length}.`
      );
    }

    this.lastCallParen = expr.paren;
    return callee.call(arguments_);
  }

  async visitGet(expr: Get): Promise<any> {
    const object = await this.evaluate(expr.object);
    if (object instanceof Instance) {
      return object.get(expr.name);
    }

    throw new IRuntimeError(expr.name, "Only instances have properties.");
  }

  async visitTernary(expr: Ternary): Promise<any> {
    if (this.isTruthy(await this.evaluate(expr.left))) {
      return this.evaluate(expr.middle);
    } else {
      return this.evaluate(expr.right);
    }
  }

  visitGrouping(expr: Grouping): any {
    return this.evaluate(expr.expression);
  }

  async visitDict(expr: Dict): Promise<IDict> {
    const map = new Map();
    for (const entry of expr.entries) {
      const key = await this.evaluate(entry[0]);
      const value = this.evaluate(entry[1]);
      map.set(key, value);
    }
    return new IDict(map);
  }

  async visitList(expr: List): Promise<LangList> {
    const list = [];
    for (const element of expr.elements) {
      const value = await this.evaluate(element);
      list.push(value);
    }
    return new LangList(list);
  }

  async visitUnary(expr: Unary): Promise<any> {
    const right = await this.evaluate(expr.right);
    if (expr.operator.type === TokenType.MINUS) {
      this.checkNumberOperand(expr.operator, right);
      return -right;
    } else if (expr.operator.type === TokenType.NOT) {
      return !this.isTruthy(right);
    }
  }

  visitVariable(expr: Variable) {
    return this.lookupVariable(expr.name, expr);
  }

  private lookupVariable(name: Token, expr: Expr) {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  visitLiteral(expr: Literal): any {
    return expr.value;
  }

  async visitLogical(expr: Logical): Promise<any> {
    const left = await this.evaluate(expr.left);

    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) return left;
    } else {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  async visitSetExpr(expr: SetExpr): Promise<any> {
    const object = await this.evaluate(expr.object);

    if (!(object instanceof Instance)) {
      throw new IRuntimeError(expr.name, "");
    }

    const value = await this.evaluate(expr.value);
    object.set(expr.name.lexeme, value);
    return value;
  }

  visitSuper(expr: Super) {
    const distance = this.locals.get(expr);
    if (!distance) throw new TypeError("Expect distance defined.");

    const superclass = this.environment.getAt(distance, "super");
    if (!(superclass instanceof IClass))
      throw new TypeError("Expect LangClass.");
    const object = this.environment.getAt(distance - 1, "self");
    if (!(object instanceof Instance))
      throw new TypeError("Expect LangInstance.");

    const method = superclass.findMethod(expr.method.lexeme);
    if (!method) {
      throw new IRuntimeError(
        expr.method,
        `Undefined property ${expr.method.lexeme}.`
      );
    }

    return method?.langBind(object);
  }

  async evaluate(expr: Expr): Promise<any> {
    if (this.stopFlag) {
      return new Promise((res) => {
        this.resumeResolver = () => {
          res(this.evaluate(expr));
        };
      });
    }
    return expr.accept(this);
  }

  async execute(stmt: Stmt): Promise<void> {
    await stmt.accept(this);
  }

  resolve(expr: Expr, depth: number): void {
    this.locals.set(expr, depth);
  }

  async visitBlockStmt(stmt: BlockStmt) {
    await this.executeBlock(stmt.statements, this.environment);
  }

  async visitClassStmt(stmt: ClassStmt): Promise<void> {
    let superclass;
    if (stmt.superclass) {
      superclass = await this.evaluate(stmt.superclass);
      if (!(superclass instanceof IClass)) {
        throw new IRuntimeError(
          stmt.superclass.name,
          "Superclass must be a class."
        );
      }
    }

    this.environment.define(stmt.name.lexeme, undefined);

    if (stmt.superclass) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const methods: Map<string, IFunction> = new Map();
    for (const method of stmt.methods) {
      const func = new IFunction(
        this,
        method,
        this.environment,
        method.name.lexeme === "__init__",
        true,
        method.async_
      );
      methods.set(method.name.lexeme, func);
    }

    const klass = new IClass(stmt.name.lexeme, methods, superclass);

    if (superclass) {
      if (!this.environment.enclosing)
        throw new Error("Missing enclosing environment.");
      this.environment = this.environment.enclosing;
    }
    this.environment.assign(stmt.name, klass);
  }

  async executeBlock(stmts: Stmt[], environment: Environment): Promise<void> {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const stmt of stmts) {
        await this.execute(stmt);
      }
    } finally {
      this.environment = previous;
    }
  }

  private isTruthy(obj: any): boolean {
    if (obj === undefined || obj === false || obj === 0) return false;
    return true;
  }

  private isEqual(a: any, b: any) {
    if (a === undefined && b === undefined) return true;
    if (a === undefined) return false;
    if (isNaN(a) && isNaN(b)) return true; // Java object.equal(NaN, NaN) == true
    return a === b;
  }

  private checkNumberOperand(operator: Token, operand: any): void {
    if (typeof operand === "number") return;
    throw new IRuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(operator: Token, left: any, right: any): void {
    if (typeof left === "number" && typeof right === "number") return;
    throw new IRuntimeError(operator, "Operands must be numbers.");
  }

  private stringify(obj: any): any {
    if (obj === undefined) return "nil";

    if (typeof obj === "number") {
      let text = obj.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }

    return obj.toString();
  }
}
