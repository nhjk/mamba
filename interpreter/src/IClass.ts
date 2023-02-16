import { Callable } from "./Callable";
import { IFunction } from "./IFunction";
import { Instance } from "./Instance";

export class IClass implements Callable {
  isCallable: true = true;
  readonly name: string;
  readonly superclass?: IClass;
  readonly methods: Map<string, IFunction>;

  constructor(
    name: string,
    methods: Map<string, IFunction>,
    superclass: IClass | undefined
  ) {
    this.name = name;
    this.methods = methods;
    this.superclass = superclass;
  }

  findMethod(name: string): IFunction | undefined {
    if (this.methods.has(name)) {
      return this.methods.get(name);
    }

    if (this.superclass) {
      return this.superclass.findMethod(name);
    }
  }

  async call(arguments_: any[]) {
    const instance = new Instance(this);
    const initializer = this.findMethod("__init__");
    if (initializer !== undefined) {
      await initializer.langBind(instance).call(arguments_);
    }

    return instance;
  }

  arity(): number {
    const initializer = this.findMethod("__init__");
    if (initializer === undefined) return 0;
    return initializer.arity();
  }

  toString(): string {
    return this.name;
  }
}
