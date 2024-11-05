export class InterpreterError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "InterpreterError"
    }
}

/** Represents all value types supported by Val */
export enum Type {
    Nil,
    Boolean,
    String,
    Symbol,
    Number,
    Cons,
    Closure,
    Primop
}

/** Represents the NIL object */
export interface Nil { type: Type.Nil }

/** Boxed boolean type */
export interface Boolean { type: Type.Boolean, value: boolean }

/** Boxed number type */
export interface Number { type: Type.Number, value: number }

/** Boxed string type */
export interface String { type: Type.String, value: string }

/** Boxed symbol type */
export interface Symbol { type: Type.Symbol, value: string }

/** Represents a regular cons cell with "car" and "cdr" references */
export interface Cons { type: Type.Cons, car: Val, cdr: Cons | Nil }

/** 
 * Represents a closure, which contains links to the function body (code), 
 * the environment that defines what variables have already been bound
 * at the time when the function was defined, and a list of unbound function arguments.
 * 
 * Body is never null because every function must return something,
 * But args may be null if this is a nullary function
*/
export interface Closure { type: Type.Closure, body: ConsOrNil, env: Environment, args: Cons | Nil }

/** 
 * Represents a primitive operation, which is a combo of a function reference
 * to a TS/JS function, and a list of argument types, plus finally 
 * a varargs flag in case the function allows for more arguments than the named ones.
 */
export interface Primop { type: Type.Primop, name: string, argtypes: string[], fn: (...args: any[]) => any }

/** Type helper that lists raw JS types of all values accepted by the Val constructor */
export type Val = Nil | Boolean | Number | String | Symbol | Cons | Closure | Primop

/** 
 * This class represents the function's execution environment. Entries represent
 * symbols bound to values, and the parent link can be used to link to
 * a parent environment forming a chain.
 */
export interface Environment {
    entries: Map<string, Val>
    parent: Environment | null
}

/** 
 * This class represents things like extra whitespace or comments - items produced by 
 * the parser, but not actually returned as parts of the parsed expression tree
 */
export class NotVal { }
export const NOT_A_VAL = new NotVal()

export type ValOrNot = Val | NotVal


export const NIL: Nil = { type: Type.Nil }

export function makeNil(): Nil { return NIL }
export function makeBoolean(v: boolean): Boolean { return { type: Type.Boolean, value: v } }
export function makeNumber(v: number): Number { return { type: Type.Number, value: v } }
export function makeString(v: string): String { return { type: Type.String, value: v } }
export function makeSymbol(v: string): Symbol { return { type: Type.Symbol, value: v } }
export function makeCons(car: Val, cdr: Cons | Nil): Cons { return { type: Type.Cons, car: car, cdr: cdr } }
export function makeClosure(body: ConsOrNil, env: Environment, args: Cons | Nil): Closure {
    return { type: Type.Closure, body: body, env: env, args: args }
}
export function makePrimop(name: string, argtypes: string[], fn: (...args: any[]) => any): Primop {
    return { type: Type.Primop, name: name, argtypes: argtypes, fn: fn }
}

export function isNil(val: Val): val is Nil { return val.type == Type.Nil }
export function isBoolean(val: Val): val is Boolean { return val.type == Type.Boolean }
export function isNumber(val: Val): val is Number { return val.type == Type.Number }
export function isString(val: Val): val is String { return val.type == Type.String }
export function isSymbol(val: Val): val is Symbol { return val.type == Type.Symbol }
export function isCons(val: Val): val is Cons { return val.type == Type.Cons }
export function isClosure(val: Val): val is Closure { return val.type == Type.Closure }
export function isPrimop(val: Val): val is Primop { return val.type == Type.Primop }

export function asNil(val: Val): Nil { _checkType(val, Type.Nil); return (val as Nil) }
export function asBoolean(val: Val): Boolean { _checkType(val, Type.Boolean); return (val as Boolean) }
export function asNumber(val: Val): Number { _checkType(val, Type.Number); return (val as Number) }
export function asString(val: Val): String { _checkType(val, Type.String); return (val as String) }
export function asSymbol(val: Val): Symbol { _checkType(val, Type.Symbol); return (val as Symbol) }
export function asCons(val: Val): Cons { _checkType(val, Type.Cons); return (val as Cons) }
export function asClosure(val: Val): Closure { _checkType(val, Type.Closure); return (val as Closure) }
export function asPrimop(val: Val): Primop { _checkType(val, Type.Primop); return (val as Primop) }

function _checkType(val: Val, type: Type): void {
    if (val.type != type) { throw new InterpreterError(`Invalid typecast, expected ${type}, got ${val.type}`) }
}

export function valToPrimval(val: Val): any {
    if (isNil(val)) { return null }
    if (isBoolean(val)) { return val.value }
    if (isNumber(val)) { return val.value }
    if (isString(val)) { return val.value }
    if (isSymbol(val)) { return val.value }
    if (isCons(val)) { return consToArray(val) }
    throw new InterpreterError(`Invalid attempt to convert ${print(val)} to a primitive value`)
}

export function primvalToVal (prim: any): Val {
    if (prim == null) { return NIL }
    
    let type = typeof prim
    if (type === "string") { return makeString(prim)}
    if (type === "number") { return makeNumber(prim) }
    if (type === "boolean") { return makeBoolean(prim) }
    if (Array.isArray(prim)) { return arrayToCons(prim.map(elt => primvalToVal(elt)))}
    throw new InterpreterError(`Invalid attempt to convert primitive value ${prim} into a value`)

}

// Cons helpers

export type ConsOrNil = Cons | Nil
export function car(val: ConsOrNil): Val { return val.type == Type.Cons ? val.car : NIL }
export function cdr(val: ConsOrNil): ConsOrNil { return val.type == Type.Cons ? val.cdr : NIL }
export function cadr(val: ConsOrNil): Val { return car(cdr(val)) }
export function cddr(val: ConsOrNil): ConsOrNil { return cdr(cdr(val)) }
export function caddr(val: ConsOrNil): Val { return car(cddr(val)) }
export function cdddr(val: ConsOrNil): ConsOrNil { return cdr(cddr(val)) }
export function cadddr(val: ConsOrNil): Val { return car(cdddr(val)) }
export function cddddr(val: ConsOrNil): ConsOrNil { return cdr(cdddr(val)) }

export function first(val: ConsOrNil): Val { return car(val) }
export function rest(val: ConsOrNil): ConsOrNil { return cdr(val) }
export function second(val: ConsOrNil): Val { return cadr(val) }
export function third(val: ConsOrNil): Val { return caddr(val) }
export function fourth(val: ConsOrNil): Val { return cadddr(val) }

// Pretty print

/** Helper function, returns a string representation of the value. */
export function print(val: Val): string {
    switch (val.type) {
        case Type.Nil: return "()"
        case Type.Boolean: return val.value ? "#t" : "#f"
        case Type.Number: return val.value.toString()
        case Type.String: return `\"${val.value}\"`
        case Type.Symbol: return val.value
        case Type.Cons: return printArray(consToArray(val))
        case Type.Closure: {
            let args = val.args.type == Type.Nil ? "()" : print(val.args)
            return `[Closure (lambda ${args} ...)]`
        }
        case Type.Primop: return `[Primop: ${val.name} ${val.argtypes}]`
        default:
            const invalid: never = val
            throw new Error(`Error printing value ${invalid}`)
    }
}

function printArray(vals: Val[]): string {
    return "(" + vals.map((val: Val) => print(val)).join(" ") + ")"
}


//
//
// environment accessors

export function envMake(parent?: Environment): Environment {
    return { entries: new Map<string, Val>(), parent: parent ?? PRIMOP_ENV }
}

export function envAdd(env: Environment, name: string, value: Val): Environment {
    env.entries.set(name, value)
    return env
}

export function envFind(env: Environment | null, name: string): Environment | null {
    if (env == null) { return null }
    return env.entries.has(name) ? env : envFind(env.parent, name)
}

export function envGet(env: Environment | null, name: string): Val | null {
    if (env == null) { return null }
    let result = env.entries.get(name)
    if (result != undefined) { return result }
    return envGet(env.parent, name)
}



//
//
// exported helper functions

export function makeTwoElementList(first: Val, second: Val): Cons {
    return makeCons(first, makeCons(second, NIL))
}

export function arrayToCons(vals: Array<Val>): Val {
    let result: Val = NIL
    for (let i = vals.length - 1; i >= 0; i--) {
        result = makeCons(vals[i], result)
    }
    return result
}

export function consToArray(cons: ConsOrNil): Array<Val> {
    let len = length(cons)
    let results = new Array<Val>(len)
    let i = 0
    while (!isNil(cons)) {
        results[i] = cons.car
        cons = cons.cdr
        i++
    }
    return results;
}

export function length(cons: ConsOrNil): number {
    let length = 0
    while (!isNil(cons)) {
        cons = cons.cdr
        length++
    }
    return length
}

export function nth(cons: ConsOrNil, n: number): Val {
    while (n > 0) {
        if (isCons(cons)) {
            cons = cons.cdr
        }
        n--
    }

    return isCons(cons) ? cons.car : NIL
}

// TODO move this to primops

export let PRIMOPS: Array<Primop> = [
    makePrimop("not", ["boolean"], (a: boolean) => !a),

    makePrimop("+", ["number", "number"], (a: number, b: number) => a + b),
    makePrimop("-", ["number", "number"], (a: number, b: number) => a - b),
    makePrimop("*", ["number", "number"], (a: number, b: number) => a * b),
    makePrimop("/", ["number", "number"], (a: number, b: number) => a / b),

    makePrimop("==", ["number", "number"], (a: number, b: number) => a == b),
    makePrimop("!=", ["number", "number"], (a: number, b: number) => a != b),
    makePrimop(">", ["number", "number"], (a: number, b: number) => a > b),
    makePrimop("<", ["number", "number"], (a: number, b: number) => a < b),
    makePrimop(">=", ["number", "number"], (a: number, b: number) => a >= b),
    makePrimop("<=", ["number", "number"], (a: number, b: number) => a <= b),
]

export function installPrimops(env: Environment): void {
    for (let primop of PRIMOPS) {
        env.entries.set(primop.name, primop)
    }
}

export let PRIMOP_ENV: Environment = { entries: new Map<string, Val>(), parent: null }
installPrimops(PRIMOP_ENV)
