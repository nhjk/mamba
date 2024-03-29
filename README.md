# Mamba

Mamba is a Python interpreter written in TypeScript made after reading [Crafting Interpreters](https://craftinginterpreters.com/) by Robert Nystrom. It supports a subset of Python including common primitive operations, lists, dicts, classes, inheritance, and async/await.

Mamba also has seamless interop with JavaScript through an easy to use FFI. The browser based [playground app](https://nhjk.github.io/mamba/#hello) is an example of this. Using the interpreter you can easily write a canvas based browser game like [Tetris](https://nhjk.github.io/mamba/#tetris). Minor downsides include being ~300x slower than regular Python.

![screenshot](screenshot.png)
