import { parse } from "./parser";
import { Cons, listLength, Val } from "./values";

export class Environment {
    entries: Map<string, Val>
    parent?: Environment

    constructor(entries?: Map<string, Val>, parent?: Environment) {
        this.entries = entries ?? new Map<string, Val>()
        this.parent = parent
    }

    public get(name: string): Val | null {
        return this.entries.get(name) ?? this.parent?.get(name);
    }
}

export class InterpreterError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "InterpreterError"
    }
}

export function evaluate(input: string, env?: Environment): Val[] {
    env = env ?? new Environment()
    let parsed: Val[] = parse(input)

    return parsed.map(val => evaluateVal(val, env))
}

export function evaluateVal(input: Val, env: Environment): Val {

    // primitives evaluate to themselves
    if (input.isPrimitive()) { return input }
    if (input.isNil()) { return input }

    // symbols are looked up in the chain of environments
    if (input.isSymbol()) { return _evaluateSymbol(input, env) }

    // lists get evaluated as functions or other special forms
    if (input.isCons()) { return _evaluateCons(input.asCons(), env); }

    throw new InterpreterError("Unable to evaluate input: " + input.toString())
}

function _evaluateSymbol(input: Val, env: Environment): Val {
    let result = env.get(input.asSymbol())
    if (result != null) {
        return result
    }
    throw new InterpreterError("Unknown symbol: " + input.toString())
}

function _evaluateCons(input: Cons, env: Environment): Val {
    let first = input.first
    let result = _tryEvaluateSpecialForm(first, input, env) ?? _tryEvaluateFunctionCall(first, input, env)

    if (result != null) {
        return result
    }

    throw new InterpreterError(`Don't know how to evaluate cons: ${input.toString()}`)
}




function _tryEvaluateSpecialForm(first: Val, input: Cons, env: Environment): Val {

    if (!first.isSymbol()) { return null }

    let args = input.tailOrNull()

    // todo
    switch (first.asSymbol()) {
        // (quote foo) => foo literal
        case "quote": {
            _verifyArgCount(args, 1)
            return args.first // it's the literal - don't eval it
        }

        // (begin body ...) evals all elements in body ... and returns the last one
        case "begin": {
            return _evaluateBlock(args, env)
        }

        // (set! foo 1) updates foo in whichever environment it lives
        // or defines it in current top-level environent
        // case "set!": ...

        // (if pred then else) evals pred and then either evals then or else
        // also note that (if pred then) == (if pred then ())
        case "if": {
            _verifyArgCount(args, 2, 3)  // (if pred then [else])
            let { value, pass } = _test(args.first, env)
            return pass ?
                evaluateVal(args.secondOrNil(), env) :
                evaluateVal(args.thirdOrNil(), env)
        }

        // (if* pred else) evals pred and returns it if true, otherwise evals else
        case "if*": {
            _verifyArgCount(args, 2)  // (if pred else)
            let { value, pass } = _test(args.first, env)
            return pass ? value : evaluateVal(args.secondOrNil(), env)
        }

        // (while x body ...) repeats (begin body ...) while x evals to true
        // case "while": ...

        // (lambda (args...) body...) creates a new env with args... and 
        // then evals (begin body ...) inside that env
        // case "lambda": ...

        // (defmacro ...) compiles and installs the given macro body
        // case "defmacro": ...

        default:
            return null
    }

    function _verifyArgCount(list: Cons, min: number, max?: number): void {
        max = max ?? min // default case is that max == min
        let count = listLength(list)
        if (count < min || count > max) {
            throw new InterpreterError(`Invalid argument count, expected [${min}, ${max}] got ${count} in ${list}`)
        }
    }

    function _test(item: Val, env: Environment): { value: Val, pass: boolean } {
        let value = evaluateVal(item, env);
        return { value: value, pass: (value.isBool() ? value.asBool() : !value.isNil()) }
    }

    function _evaluateBlock(block: Cons, env: Environment): Val {
        let result = Val.NIL
        while (block != null) {
            result = evaluateVal(block.first, env)
            block = block.tailOrNull()
        } 
        return result
    }
}

function _tryEvaluateFunctionCall(first: Val, cons: Cons, env: Environment): Val {
    // todo
    return null
}
