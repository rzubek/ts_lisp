import { parse } from "./parser";
import { Closure, Cons, consToArray, envGet, print, Symbol, Environment, envMake, isBoolean, isNil, isNumber, isString, isSymbol, length, Type, Val, isCons, InterpreterError, cdr, car, ConsOrNil, first, second, envFind, third, rest, makeClosure, asBoolean, asCons, envAdd, isClosure, asClosure, asSymbol, NIL, makeCons } from "./values";


export function evaluate(input: string, env: Environment | null): Val[] {
    env = env ?? envMake()
    let parsed: Val[] = parse(input)

    return parsed.map(val => evaluateVal(val, env))
}

export function evaluateVal(input: Val, env: Environment): Val {

    // primitives evaluate to themselves
    if (isNil(input) || isBoolean(input) || isNumber(input) || isString(input)) { return input }

    // symbols are looked up in the chain of environments
    if (isSymbol(input)) { return _evaluateSymbol(input, env) }

    // lists get evaluated as functions or other special forms
    if (isCons(input)) { return _evaluateCons(input, env); }

    throw new InterpreterError("Unable to evaluate input: " + input.toString())
}

function _evaluateSymbol(input: Symbol, env: Environment): Val {
    let result = envGet(env, input.value)
    if (result != null) { return result }
    throw new InterpreterError("Unknown symbol: " + input.toString())
}

function _evaluateCons(input: Cons, env: Environment): Val {
    let result = _tryEvaluateSpecialForm(input, env) ??
        _tryEvaluateFunctionCall(input, env)

    if (result != null) { return result }
    throw new InterpreterError(`Don't know how to evaluate cons: ${input.toString()}`)
}




function _tryEvaluateSpecialForm(input: Cons, env: Environment): Val | null {

    let firstelt = car(input)
    if (!isSymbol(firstelt)) { return null }

    let args = cdr(input)

    // todo
    switch (firstelt.value) {
        // (quote foo) => foo literal
        case "quote": {
            _verifyArgCount(args, 1)
            return first(args) // it's the literal - don't eval it
        }

        // (begin body ...) evals all elements in body ... and returns the last one
        case "begin": {
            return _evaluateBlock(args, env)
        }

        // (set! foo 1) updates foo in whichever environment it lives
        // or defines it in current top-level environent
        case "set!": {
            _verifyArgCount(args, 2)  // (set! name value)
            let valname = first(args)
            _verifyPredicate(isSymbol(valname), "Unexpected lvalue in set!, expected symbol, got: ", valname)

            let name = (valname as Symbol).value
            let value = evaluateVal(second(args), env)
            let container = envFind(env, name) ?? env
            container.entries.set(name, value)
            return value
        }

        // (if pred then else) evals pred and then either evals then or else
        // also note that (if pred then) == (if pred then ())
        case "if": {
            _verifyArgCount(args, 2, 3)  // (if pred then [else])
            let { value, pass } = _test(first(args), env)
            return pass ?
                evaluateVal(second(args), env) :
                evaluateVal(third(args), env)
        }

        // (if* pred else) evals pred and returns it if true, otherwise evals else
        case "if*": {
            _verifyArgCount(args, 2)  // (if pred else)
            let { value, pass } = _test(first(args), env)
            return pass ? value : evaluateVal(second(args), env)
        }

        // (while x body ...) repeats (begin body ...) while x evals to true
        // case "while": ...

        // (lambda (args...) body...) creates a new env with args... and 
        // then evals (begin body ...) inside that env
        case "lambda": {
            _verifyArgCount(args, 2, Number.MAX_SAFE_INTEGER)  // (lambda fnargs ...)
            let fnargs = first(args)
            let fnbody = rest(args)
            _verifyPredicate(fnargs != null && (isCons(fnargs) || isNil(fnargs)), "Lambda arguments should be a list, got: ", fnargs)

            let clargs = isCons(fnargs) ? asCons(fnargs) : NIL
            return makeClosure(fnbody, env, clargs)
        }

        // (defmacro ...) compiles and installs the given macro body
        // case "defmacro": ...

        default:
            return null
    }

    function _verifyArgCount(list: ConsOrNil, min: number, max?: number): void {
        max = max ?? min // default case is that max == min
        let count = length(list)
        if (count < min || count > max) {
            throw new InterpreterError(`Invalid argument count, expected [${min}, ${max}] got ${count} in ${list}`)
        }
    }

    function _verifyPredicate(pred: boolean, key: string, value: Val) {
        if (!pred) {
            throw new InterpreterError(key + value.toString())
        }
    }

    function _test(item: Val, env: Environment): { value: Val, pass: boolean } {
        let value = evaluateVal(item, env);
        return { value: value, pass: (isBoolean(value) ? asBoolean(value).value : !isNil(value)) }
    }
}


function _tryEvaluateFunctionCall(cons: Cons, env: Environment): Val {
    let fnref = first(cons)

    // evaluate the functor. if it's not a valid function, bail
    let fn = evaluateVal(fnref, env)
    if (!isClosure(fn)) {
        throw new InterpreterError("First element is not a valid function in: " + cons.toString())
    }

    // now we eval every argument and fill an env
    let closure = asClosure(fn)
    var newenv = _extendEnv(closure, cdr(cons), env)

    // finally we actually execute the body of the closure
    return _evaluateBlock(closure.body, newenv)
}

function _extendEnv(closure: Closure, params: ConsOrNil, parent: Environment): Environment {
    var env = envMake(parent)
    var argnames = isCons(closure.args) ? consToArray(asCons(closure.args)) : []
    var argvals = (params != null) ? consToArray(params) : []
    if (argnames.length != argvals.length) {
        throw new InterpreterError(`Expected ${argnames.length} args, got ${argvals.length}, in function call (... ${params?.toString()})`)
    }

    for (let i = 0; i < argnames.length; i++) {
        let val = evaluateVal(argvals[i], parent)
        if (!isSymbol(argnames[i])) {
            throw new InterpreterError(`Expected function argument symbol, got: ${print(argnames[i])}`)
        }
        let name = asSymbol(argnames[i]).value
        envAdd(env, name, val)
    }

    return env
}

function _evaluateBlock(block: ConsOrNil, env: Environment): Val {
    let result: Val = NIL
    while (isCons(block)) {
        result = evaluateVal(first(block), env)
        block = rest(block)
    }
    return result
}

function _mapEval(input: ConsOrNil, env: Environment): ConsOrNil {
    if (isNil(input)) { return NIL }

    let elt = evaluateVal(first(input), env)
    let tail = _mapEval(input.cdr, env)
    return makeCons(elt, tail)
}
