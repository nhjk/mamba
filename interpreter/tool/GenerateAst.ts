import * as fs from "fs/promises";
import { join } from "path";

async function defineAst(outputDir: string, baseName: string, types: string[]) {
  const path = join(outputDir, baseName + ".ts");
  console.log("path", path);

  await fs.writeFile(path, "// generated by src/tool/GenerateAst.ts\n\n");

  // hack
  await fs.appendFile(path, `import { Token } from "./Token";\n\n`);
  if (baseName === "Stmt")
    await fs.appendFile(path, `import { Expr, Variable } from "./Expr";\n\n`);

  await fs.appendFile(
    path,
    `export abstract class ${baseName} {
  abstract accept<R>(visitor: ${baseName}Visitor<R>): Promise<R>;
}\n\n`
  );
  await defineVisitor(path, baseName, types);
  for (const type of types) {
    const className = type.split(":")[0].trim();
    const fields = type.split(":")[1].trim();
    await defineType(path, baseName, className, fields);
  }
}

async function defineType(
  path: string,
  baseName: string,
  className: string,
  fieldList: string
) {
  await fs.appendFile(
    path,
    `export class ${className} extends ${baseName} {\n`
  );
  await fs.appendFile(path, "  constructor(\n");
  for (const field of fieldList.split(", ")) {
    const [type, name, ..._] = field.split(" ");
    await fs.appendFile(path, `    readonly ${name}: ${type},\n`);
  }
  await fs.appendFile(path, "  ) {\n");
  await fs.appendFile(path, "    super();\n");
  await fs.appendFile(path, "  }\n");
  await fs.appendFile(
    path,
    `
  async accept<R>(visitor: ${baseName}Visitor<R>): Promise<R> {
    return visitor.visit${className}(this);
  }\n`
  );
  await fs.appendFile(path, "}\n\n");
}

async function defineVisitor(path: string, baseName: string, types: string[]) {
  await fs.appendFile(path, `export interface ${baseName}Visitor<R> {\n`);
  for (const type of types) {
    const typeName = type.split(":")[0].trim();
    await fs.appendFile(
      path,
      `  visit${typeName}: (${baseName.toLowerCase()}: ${typeName}) => R;\n`
    );
  }
  await fs.appendFile(path, "}\n\n");
}

async function main(args: string[]) {
  // TODO for some reason I need to delete the generated files
  // everytime I regenerate
  if (args.length != 1) {
    console.log("Usage: generate_ast <output directory>");
    process.exit(64);
  }
  const outputDir = args[0];
  console.log("output directory", outputDir);

  await defineAst(outputDir, "Expr", [
    "Assign   : Token name, Expr value",
    "Binary   : Expr left, Token operator, Expr right",
    "Await    : Expr value",
    "Ternary  : Expr left, Token leftOp, Expr middle, Token rightOp, Expr right",
    "Grouping : Expr expression",
    "List     : Expr[] elements, Token bracket",
    "Dict     : [Expr,Expr][] entries",
    "Index    : Expr indexible, Token bracket, Expr index, boolean isAssign, Expr value?",
    "Call     : Expr callee, Token paren, Expr[] arguments_",
    "Get      : Expr object, Token name",
    "Literal  : any value",
    "Logical  : Expr left, Token operator, Expr right",
    "SetExpr  : Expr object, Token name, Expr value",
    "Super    : Token keyword, Token method",
    "Unary    : Token operator, Expr right",
    "Variable : Token name",
  ]);

  await defineAst(outputDir, "Stmt", [
    "BlockStmt      : Stmt[] statements",
    "ClassStmt      : Token name, FunctionStmt[] methods, Variable superclass?",
    "ExpressionStmt : Expr expression",
    "FunctionStmt   : Token name, Token[] params, Stmt[] body, boolean async_",
    "IfStmt         : [Expr,Stmt][] branches, Stmt elseBranch?",
    "ReturnStmt     : Token keyword, Expr value?",
    "WhileStmt      : Expr condition, Stmt body",
  ]);
}

main(process.argv.slice(2));
