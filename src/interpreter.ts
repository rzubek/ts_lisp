import { parse } from "./parser";
import { Closure, Cons, consToArray, listLength, Type, Val } from "./values";

export class Environment {
    entries: Map<string, Val>
    parent?: Environment

    constructor(parent?: Environment) {
        this.entries = new Map<string, Val>()
        this.parent = parent
    }

    public add(name: string, value: Val): Environment {
        this.entries.set(name, value)
        return this
    }

    public findEnvOrNull(name: string): Environment {
        return this.entries.has(name) ? this : this.parent?.findEnvOrNull(name)
    }

    public getOrNull(name: string): Val {
        return this.entries.get(name) ?? this.parent?.getOrNull(name);
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
    let result = env.getOrNull(input.asSymbol())
    if (result != null) {
        return result
    }
    throw new InterpreterError("Unknown symbol: " + input.toString())
}

function _evaluateCons(input: Cons, env: Environment): Val {
    let result = _tryEvaluateSpecialForm(input, env) ?? _tryEvaluateFunctionCall(input, env)

    if (result != null) {
        return result
    }

    throw new InterpreterError(`Don't know how to evaluate cons: ${input.toString()}`)
}




function _tryEvaluateSpecialForm(input: Cons, env: Environment): Val {

    let first = input.first
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
        case "set!": {
            _verifyArgCount(args, 2)  // (set! name value)
            _verifyPredicate(args.first.isSymbol(), "Unexpected lvalue in set!, expected symbol, got: ", args.first)
            let name = args.first.asSymbol()
            let value = evaluateVal(args.secondOrNil(), env)
            let container = env.findEnvOrNull(name) ?? env
            container.entries.set(name, value)
            return value
        }

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
        case "lambda": {
            _verifyArgCount(args, 2, Number.MAX_SAFE_INTEGER)  // (lambda fnargs ...)
            let fnargs = args.first
            _verifyPredicate(fnargs != null && (fnargs.isCons() || fnargs.isNil()), "Lambda arguments should be a list, got: ", args.first)
            let fnbody = args.tailOrNull()
            _verifyPredicate(fnbody != null, "Lambda must have a body! Expected expressions, got: ", Val.NIL)
            
            return Val.makeClosure(fnbody, env, fnargs)
        }

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

    function _verifyPredicate(pred: boolean, key: string, value: Val) {
        if (! pred) {
            throw new InterpreterError(key + value.toString())
        }
    }

    function _test(item: Val, env: Environment): { value: Val, pass: boolean } {
        let value = evaluateVal(item, env);
        return { value: value, pass: (value.isBool() ? value.asBool() : !value.isNil()) }
    }
}


function _tryEvaluateFunctionCall(cons: Cons, env: Environment): Val {
    let first = cons.first 

    // evaluate the functor. if it's not a valid function, bail
    let fn = evaluateVal(first, env)
    if (! fn.isClosure()){
        throw new InterpreterError("First element is not a valid function in: " + cons.toString())
    }

    let closure = fn.asClosure()
    

    // now we eval every argument and fill an env
    var newenv = _extendEnv(closure, cons.tailOrNull(), env)

    // finally we actually execute the body of the closure
    return _evaluateBlock(closure.body, newenv)
}

function _extendEnv (closure: Closure, params: Cons, parent: Environment) :Environment {
    var env = new Environment(parent)
    var argnames = (closure.args?.isCons() ?? false) ? consToArray(closure.args.asCons()) : []
    var argvals = (params != null) ? consToArray(params) : []
    if (argnames.length != argvals.length) {
        throw new InterpreterError(`Expected ${argnames.length} args, got ${argvals.length}, in function call (... ${params?.toString()})`)
    }

    for (let i = 0; i < argnames.length; i++) {
        let val = evaluateVal(argvals[i], parent)
        env.add(argnames[i].asSymbol(), val)
    }

    return env
}

function _evaluateBlock(block: Cons, env: Environment): Val {
    let result = Val.NIL
    while (block != null) {
        result = evaluateVal(block.first, env)
        block = block.tailOrNull()
    } 
    return result
}

function _mapEval (input: Cons, env: Environment) :Cons {
    let first = evaluateVal(input.first, env)
    let tail = input.tailOrNull()
    let rest = tail == null ? Val.NIL : new Val(Type.Cons, _mapEval(tail, env))
    return new Cons(first, rest)
}