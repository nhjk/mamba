// generated by src/tool/GenerateAst.ts

import { Token } from "./Token";

export abstract class Expr {
  abstract accept<R>(visitor: ExprVisitor<R>): Promise<R>;
}

export interface ExprVisitor<R> {
  visitAssign: (expr: Assign) => R;
  visitBinary: (expr: Binary) => R;
  visitAwait: (expr: Await) => R;
  visitTernary: (expr: Ternary) => R;
  visitGrouping: (expr: Grouping) => R;
  visitList: (expr: List) => R;
  visitDict: (expr: Dict) => R;
  visitIndex: (expr: Index) => R;
  visitCall: (expr: Call) => R;
  visitGet: (expr: Get) => R;
  visitLiteral: (expr: Literal) => R;
  visitLogical: (expr: Logical) => R;
  visitSetExpr: (expr: SetExpr) => R;
  visitSuper: (expr: Super) => R;
  visitUnary: (expr: Unary) => R;
  visitVariable: (expr: Variable) => R;
}

export class Assign extends Expr {
  constructor(
    readonly name: Token,
    readonly value: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitAssign(this);
  }
}

export class Binary extends Expr {
  constructor(
    readonly left: Expr,
    readonly operator: Token,
    readonly right: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitBinary(this);
  }
}

export class Await extends Expr {
  constructor(
    readonly value: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitAwait(this);
  }
}

export class Ternary extends Expr {
  constructor(
    readonly left: Expr,
    readonly leftOp: Token,
    readonly middle: Expr,
    readonly rightOp: Token,
    readonly right: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitTernary(this);
  }
}

export class Grouping extends Expr {
  constructor(
    readonly expression: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitGrouping(this);
  }
}

export class List extends Expr {
  constructor(
    readonly elements: Expr[],
    readonly bracket: Token,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitList(this);
  }
}

export class Dict extends Expr {
  constructor(
    readonly entries: [Expr,Expr][],
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitDict(this);
  }
}

export class Index extends Expr {
  constructor(
    readonly indexible: Expr,
    readonly bracket: Token,
    readonly index: Expr,
    readonly isAssign: boolean,
    readonly value?: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitIndex(this);
  }
}

export class Call extends Expr {
  constructor(
    readonly callee: Expr,
    readonly paren: Token,
    readonly arguments_: Expr[],
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitCall(this);
  }
}

export class Get extends Expr {
  constructor(
    readonly object: Expr,
    readonly name: Token,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitGet(this);
  }
}

export class Literal extends Expr {
  constructor(
    readonly value: any,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitLiteral(this);
  }
}

export class Logical extends Expr {
  constructor(
    readonly left: Expr,
    readonly operator: Token,
    readonly right: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitLogical(this);
  }
}

export class SetExpr extends Expr {
  constructor(
    readonly object: Expr,
    readonly name: Token,
    readonly value: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitSetExpr(this);
  }
}

export class Super extends Expr {
  constructor(
    readonly keyword: Token,
    readonly method: Token,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitSuper(this);
  }
}

export class Unary extends Expr {
  constructor(
    readonly operator: Token,
    readonly right: Expr,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitUnary(this);
  }
}

export class Variable extends Expr {
  constructor(
    readonly name: Token,
  ) {
    super();
  }

  async accept<R>(visitor: ExprVisitor<R>): Promise<R> {
    return visitor.visitVariable(this);
  }
}
