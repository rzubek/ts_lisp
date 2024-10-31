import { parse } from "./parser";
import { Cons, Val } from "./values";

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
    let realenv = env ?? new Environment()
    let parsed: Val[] = parse(input)

    return parsed.map(val => evaluateVal(val, realenv))
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
    let fn = input.first
    let result = _tryEvaluateSpecialForm(fn, input, env) ?? 
                 _tryEvaluatePrimitive(fn, input, env) ?? 
                 _tryEvaluateFunctionCall(fn, input, env)

    if (result != null) {
        return result
    }

    throw new InterpreterError("Don't know how to evaluate cons: " + input.toString())
}

function _tryEvaluateSpecialForm(fn: Val, rest: Cons, env: Environment) :Val {
    function test (item: Val) {
        let value = evaluateVal(item, env);
        return value.isBool() && value.asBool()
    }

    // todo
    switch (fn.asSymbol()){
        //case "if": {
        //    let test = 
        //}
        default:
            return null
    }
}

function _tryEvaluatePrimitive(fn: Val, rest: Cons, env: Environment) :Val {
    // todo
    return null
}

function _tryEvaluateFunctionCall(fn: Val, rest: Cons, env: Environment) :Val {
    // todo
    return null
}
