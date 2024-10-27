declare function require(name: string);

var parser = require('./grammar-files/grammar.js')

enum Types {
    Null,
    Boolean,
    String,
    Symbol,
    Number,
    Cons
}

class Cons {
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

type Values = Cons | boolean | string | number | null

class Val {
    type: Types
    value: Values

    constructor(type: Types, value: Values) {
        this.type = type
        this.value = value
    }

    public isNil(): boolean { return this.type == Types.Null }

    public toString(): string {
        return valToString(this.type, this.value)
    }
}

const NULL = new Val(Types.Null, null)

class NotVal { }

function valToString(type: Types, value: Values): string {
    switch (type) {
        case Types.Null: return "()"
        case Types.Number: return (value as number).toString()
        case Types.String: return "\"" + (value as string) + "\""
        case Types.Symbol: return (value as string)
        case Types.Cons: return arrayToString(consToArray(value as Cons))
        case Types.Boolean: return (value as boolean) ? "#t" : "#f"
        default: 
            throw new Error(`Unknown val type: ${type}`)
    }
}

function makeTwoElementCons(first: Val, second: Val): Val{
    return new Val(Types.Cons, new Cons(first,
        new Val(Types.Cons, new Cons(second, NULL))
    ))
}

function arrayToCons(vals: Array<Val>): Val {
    if (vals.length == 0) { return NULL }

    let result: Val = NULL
    for (let i = vals.length - 1; i >= 0; i--) {
        let elt = vals[i]
        result = new Val(Types.Cons, new Cons(elt, result))
    }
    return result
}

function consToArray(cons: Cons): Array<Val> {
    let len = cons.length()
    let results = new Array<Val>(len)
    let current = cons;
    for (let i = 0; i < len; i++) {
        results[i] = current.car;
        current = current.cdr.value as Cons;
    }
    return results;
}

function arrayToString(vals: Val[]): string {
    return "(" + vals.join(" ") + ")"
}

const actions = {
    //
    // note: most of these return a Val 

    make_quoted(_input: string, _start: number, _end: number, [_quote, body]: any) {
        return makeTwoElementCons( new Val(Types.Symbol, "quote"), body)
    },

    make_symbol(_input: string, _start: number, _end: number, [first, rest]: any) {
        return new Val(Types.Symbol, first.text + rest.text)
    },

    make_string(_input: string, _start: number, _end: number, [_, string]: any) {
        return new Val(Types.String, string.text)
    },

    make_list(_input: string, _start: number, _end: number, [_, elts]: any) {
        var filtered: Array<Val> = elts.elements.filter((e: any) => (e instanceof Val))
        return arrayToCons(filtered)
    },

    make_listelt(_input: string, _start: number, _end: number, [_, elt]: any) {
        return elt  // internal, just returns a raw item???
    },

    make_int(input: string, start: number, end: number, _: any) {
        return new Val(Types.Number, parseInt(input.substring(start, end), 10))
    },

    make_float(input: string, start: number, end: number, _: any) {
        return new Val(Types.Number, parseFloat(input.substring(start, end)))
    },

    make_bool(_input: string, _start: number, _end: number, [_, elt]: any) {
        return new Val(Types.Boolean, (elt.text == "t" || elt.text == "T"))
    },

    make_nil(_input: string, _start: number, _end: number, _: any) {
        return NULL
    },

    make_space(_input: string, _start: number, _end: number, _: any) {
        return NotVal  // return the NotVal that we can filter out later
    },

    make_comment(_input: string, _start: number, _end: number, _: any) {
        return NotVal  // return the NotVal that we can filter out later
    }
}


export function parse(inputs: string): Array<Val> {
    let values = parser.parse(inputs, { actions })
    let results: Array<Val> = values.elements.filter((e: any) => e instanceof Val)
    return results
}