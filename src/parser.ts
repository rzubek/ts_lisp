import { makeTwoElementList, arrayToCons, Val, Types, NotVal } from "./values"

declare function require(name: string);  // import an existing js file
var parser = require('./grammar-files/grammar.js')


const actions = {
    //
    // note: most of these return a Val 

    make_quoted(_input: string, _start: number, _end: number, [_quote, body]: any) {
        return makeTwoElementList( new Val(Types.Symbol, "quote"), body)
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
        return Val.NIL
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