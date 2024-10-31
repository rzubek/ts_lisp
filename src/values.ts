/** Represents all value types supported by Val */
export enum Types {
    Nil,
    Boolean,
    String,
    Symbol,
    Number,
    Cons
}

/** Represent a regular cons cell with "first" and "rest" references. */
export class Cons {
    constructor(public first: Val, public rest: Val) { }

    public car(): Val { return this.first }
    public cdr(): Val { return this.rest }

    public secondOrNil() { return this.tailOrNull()?.first ?? Val.NIL }
    public thirdOrNil() { return this.tailOrNull()?.secondOrNil() ?? Val.NIL }

    public hasListTail(): boolean { return this.rest != null && this.rest.isCons() }
    public tailOrNull(): Cons { return this.hasListTail() ? this.rest.asCons() : null }

    public length(): number { return listLength(this) }
}

/** Type helper that lists raw JS types of all values accepted by the Val constructor */
export type Values = Cons | boolean | string | number | null

/** 
 * This class represents possible parsed values, such as atoms (strings, numbers,
 * etc.) as well as lists of values. Nil is a special value that signifies
 * an empty list.
 */
export class Val {
    static readonly NIL = new Val(Types.Nil, null)

    constructor(public type: Types, public value: Values) { }

    public toString(): string { return printVal(this.type, this.value) }

    public isPrimitive(): boolean { return this.isBool() || this.isString() || this.isNumber() }

    public isNil(): boolean { return this.type == Types.Nil }
    public isBool(): boolean { return this.type == Types.Boolean }
    public isNumber(): boolean { return this.type == Types.Number }
    public isString(): boolean { return this.type == Types.String }
    public isSymbol(): boolean { return this.type == Types.Symbol }
    public isCons(): boolean { return this.type == Types.Cons }

    public asBool(): boolean { return this.value as boolean }
    public asNumber(): number { return this.value as number }
    public asString(): string { return this.value as string }
    public asSymbol(): string { return this.value as string }
    public asCons(): Cons { return this.value as Cons }

    static makeNil(): Val { return this.NIL }
    static makeBool(value: boolean): Val { return new Val(Types.Boolean, value) }
    static makeNumber(value: number): Val { return new Val(Types.Number, value) }
    static makeString(value: string): Val { return new Val(Types.String, value) }
    static makeSymbol(value: string): Val { return new Val(Types.Symbol, value) }
    static makeConsRaw(value: Cons): Val { return new Val(Types.Cons, value) }
    static makeCons(first: Val, rest: Val): Val { return new Val(Types.Cons, new Cons(first, rest)) }
}

/** 
 * This class represents things like extra whitespace or comments - items produced by 
 * the parser, but not actually returned as parts of the parsed expression tree
 */
export class NotVal { }



//
//
// internal helper functions

/** Helper function, returns a string representation of the value. */
function printVal(type: Types, value: Values): string {
    switch (type) {
        case Types.Nil: return "()"
        case Types.Number: return (value as number).toString()
        case Types.String: return "\"" + (value as string) + "\""
        case Types.Symbol: return (value as string)
        case Types.Cons: return arrayToString(consToArray(value as Cons))
        case Types.Boolean: return (value as boolean) ? "#t" : "#f"
        default:
            throw new Error(`Error printing value, unknown val type: ${type}, value: ${value}`)
    }
}

function arrayToString(vals: Val[]): string {
    return "(" + vals.join(" ") + ")"
}



//
//
// exported helper functions

export function makeTwoElementList(first: Val, second: Val): Val {
    return Val.makeCons(first, Val.makeCons(second, Val.NIL))
}

export function arrayToCons(vals: Array<Val>): Val {
    let result = Val.NIL
    for (let i = vals.length - 1; i >= 0; i--) {
        result = Val.makeCons(vals[i], result)
    }
    return result
}

export function consToArray(cons: Cons): Array<Val> {
    let len = cons.length()
    let results = new Array<Val>(len)
    let current = cons;
    for (let i = 0; i < len; i++) {
        results[i] = current.first;
        current = current.rest.asCons()
    }
    return results;
}

export function listLength(cons: Cons): number {
    let length = 0
    while (cons != null) {
        length++
        cons = cons.tailOrNull()
    }
    return length
}

export function nth(val: Val, n: number): Val {
    if (val == null || !val.isCons()) { return Val.NIL }
    let result = val.asCons()
    while (n > 0) {
        n--
        result = result.tailOrNull()
    }

    return result?.first ?? Val.NIL
}