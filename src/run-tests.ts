import { Environment, evaluate } from "./interpreter";
import { parse } from "./parser"
import { Val } from "./values";

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

function testSimpleEval() {
    let parent = new Environment(new Map([["parent", Val.makeString("present")]]))
    let env = new Environment(new Map([["foo", Val.makeNumber(42)]]), parent)
    verifyEnv(env, "foo", "42")
    verifyEnv(env, "parent", '"present"')
    verifyEnv(env, "doesNotExist", "")

    verifyEval("1 2 #t #f")          // primitives
    verifyEval('"foo"')
    verifyEval("foo", "42", env)     // symbol lookup in the environment
}

testParser()
testSimpleEval()

if (errors > 0) {
    console.error(`TOTAL ERRORS: ${errors}`)
} else {
    console.info('✔️ ALL CLEAR')
}