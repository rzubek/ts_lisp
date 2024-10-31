import { Environment, evaluate } from "./interpreter";
import { parse } from "./parser"
import { arrayToCons, consToArray, listLength, makeTwoElementList, nth, Val } from "./values";

let message: string = 'Hello World';
console.log(message);


let errors = 0

function verify(test: boolean, expected: any, actual: any): void {
    if (!test) {
        errors++;
        console.error(`FAILED TEST: expected ${expected} - actual: ${actual}`)
    }
}

function stringifyVals(vals: Array<Val>): string {
    let strings = vals.map(val => val.toString())
    return strings.join(" ")
}

function verifyEnv(env: Environment, key: string, expected: string): void {
    let result = env.get(key)?.toString() ?? ""
    verify(expected == result, expected, result)
}

function verifyParse(input: string, expected?: string): void {
    let result = stringifyVals(parse(input))
    expected ??= input
    verify(expected == result, expected, result)
}

function verifyEval(input: string, expected?: string, env? :Environment): void {
    let result = stringifyVals(evaluate(input, env))
    expected ??= input
    verify(expected == result, expected, result)
}

function verifyEvalError(input: string, env? :Environment): void {
    try {
        let result = stringifyVals(evaluate(input, env))
        verify(false, "Error", result)
    } catch (e) {
        // success
    }
}

function testParser() {
    verifyParse('1 2.0 "foo"', "1 2 \"foo\"")
    verifyParse("(1 2 foo f)")
    verifyParse("((3 4) 2 () \"foo\")")
    verifyParse("#t #f")
    verifyParse("(1\n2\t3    4)", "(1 2 3 4)")
    verifyParse("'foo '(1 2)", "(quote foo) (quote (1 2))")
    verifyParse("foo ;bar", "foo")
    verifyParse("(foo ;baz\n bar)", "(foo bar)")
}

function testVals (){
    let abc = parse("(a b c)")[0]
    let abcstr = abc.toString()

    let abc2 = arrayToCons(consToArray(abc.asCons()))
    console.assert(abcstr == abc2.toString())

    let abc3 = Val.makeCons(Val.makeSymbol("a"), makeTwoElementList(Val.makeSymbol("b"),  Val.makeSymbol("c")))
    console.assert(abcstr == abc3.toString())
                        
    console.assert(listLength(abc.asCons()) == 3)
    console.assert(consToArray(abc.asCons()).length == 3)

    console.assert(abc.asCons().secondOrNil().toString() == "b")
    console.assert(abc.asCons().thirdOrNil().toString() == "c")

    let justa = parse("(a)")[0]
    console.assert(justa.asCons().secondOrNil().toString() == "()")
    console.assert(justa.asCons().thirdOrNil().toString() == "()")

    console.assert(parse("()")[0].toString() == "()")

    console.assert(nth(abc, 0).value == "a")
    console.assert(nth(abc, 2).value == "c")
    console.assert(nth(abc, 3) == Val.NIL)
    console.assert(nth(Val.NIL, 0) == Val.NIL)
    console.assert(nth(null, 0) == Val.NIL)

}


function testSimpleEval() {
    let parent = new Environment(new Map([["parent", Val.makeString("present")]]))
    let env = new Environment(new Map([["foo", Val.makeNumber(42)]]), parent)
    verifyEnv(env, "foo", "42")
    verifyEnv(env, "parent", '"present"')
    verifyEnv(env, "doesNotExist", "")

    verifyEval("1 2 #t #f")          // primitives
    verifyEval('"foo"')
    verifyEval("foo", "42", env)     // symbol lookup in the environment
    verifyEval("parent", '"present"', env)     // symbol lookup in the environment
    verifyEvalError("doesNotExist")
}


testParser()
testVals()
testSimpleEval()

if (errors > 0) {
    console.error(`TOTAL ERRORS: ${errors}`)
} else {
    console.info('✔️ ALL CLEAR')
}