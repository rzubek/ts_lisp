export enum Types {
    Nil,
    Boolean,
    String,
    Symbol,
    Number,
    Cons
}

export class Cons {
    car: Val;
    cdr: Val;

    constructor(car: Val, cdr: Val) {
        this.car = car
        this.cdr = cdr
    }

    public length(): number {
        if (this.cdr.type == Types.Cons) {
            let tail = this.cdr.value as Cons;
            return 1 + tail.length()
        } else {
            return 1
        }
    }
}

export type Values = Cons | boolean | string | number | null

/** 
 * This class represents possible parsed values, such as atoms (strings, numbers,
 * etc.) as well as lists of values. Nil is a special value that signifies
 * an empty list.
 */
export class Val {
    static readonly NIL = new Val(Types.Nil, null)

    type: Types
    value: Values

    constructor(type: Types, value: Values) {
        this.type = type
        this.value = value
    }

    public isNil(): boolean { return this.type == Types.Nil }

    public toString(): string { return printVal(this.type, this.value) }

    static makeNil() :Val { return this.NIL }
    static makeBool(value: boolean) :Val { return new Val(Types.Boolean, value) }
    static makeNumber(value: number): Val { return new Val(Types.Number, value) }
    static makeString(value: string) :Val { return new Val(Types.String, value) }
    static makeSymbol(value: string) :Val { return new Val(Types.Symbol, value) }
    static makeConsRaw(value: Cons) :Val { return new Val(Types.Cons, value) }
    static makeCons(car: Val, cdr: Val) :Val { return new Val(Types.Cons, new Cons(car, cdr)) }
}

/** 
 * This class represents things like extra whitespace or comments - items produced by 
 * the parser, but not actually returned as parts of the parsed expression tree
 */
export class NotVal { }

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
// helper functions

export function makeTwoElementList(first: Val, second: Val): Val{
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
        results[i] = current.car;
        current = current.cdr.value as Cons;
    }
    return results;
}

