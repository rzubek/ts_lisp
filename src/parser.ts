import { makeTwoElementList, arrayToCons, Val, Type, makeSymbol, makeString, NOT_A_VAL, makeNumber, makeBoolean, NIL } from "./values"

declare function require(name: string): any;  // import an existing js file
var parser = require('./grammar-files/grammar.js')


const actions = {
    //
    // note: most of these return a Val 

    make_quoted(_input: string, _start: number, _end: number, [_quote, body]: any) {
        return makeTwoElementList(makeSymbol("quote"), body)
    },

    make_symbol(_input: string, _start: number, _end: number, [first, rest]: any) {
        return makeSymbol(first.text + rest.text)
    },

    make_string(_input: string, _start: number, _end: number, [_, string]: any) {
        return makeString(string.text)
    },

    make_list(_input: string, _start: number, _end: number, [_, elts]: any) {
        var filtered: Array<Val> = elts.elements.filter((e: any) => (e != NOT_A_VAL))
        return arrayToCons(filtered)
    },

    make_listelt(_input: string, _start: number, _end: number, [_, elt]: any) {
        return elt  // internal, just returns a raw item???
    },

    make_int(input: string, start: number, end: number, _: any) {
        return makeNumber(parseInt(input.substring(start, end), 10))
    },

    make_float(input: string, start: number, end: number, _: any) {
        return makeNumber(parseFloat(input.substring(start, end)))
    },

    make_bool(_input: string, _start: number, _end: number, [_, elt]: any) {
        return makeBoolean(elt.text == "t" || elt.text == "T")
    },

    make_nil(_input: string, _start: number, _end: number, _: any) {
        return NIL
    },

    make_space(_input: string, _start: number, _end: number, _: any) {
        return NOT_A_VAL  // return the NotVal that we can filter out later
    },

    make_comment(_input: string, _start: number, _end: number, _: any) {
        return NOT_A_VAL  // return the NotVal that we can filter out later
    }
}


export function parse(inputs: string): Array<Val> {
    let values = parser.parse(inputs, { actions })
    let results: Array<Val> = values.elements.filter((e: any) => e != NOT_A_VAL)
    return results
}