import { IClass } from "./IClass";
import { IRuntimeError } from "./IError";
import { Token } from "./Token";

export class Instance {
  private iclass: IClass;
  private readonly fields: Map<string, any> = new Map();

  constructor(klass: IClass) {
    this.iclass = klass;
  }

  get(name: Token): any {
    if (this.fields.has(name.lexeme)) {
      return this.fields.get(name.lexeme);
    }

    const method = this.iclass.findMethod(name.lexeme);
    if (method !== undefined) return method.langBind(this);

    throw new IRuntimeError(name, `Undefined property '${name.lexeme}'.`);
  }

  set(name: string, value: any) {
    this.fields.set(name, value);
  }

  toString() {
    return `${this.iclass.name} instance`;
  }
}
