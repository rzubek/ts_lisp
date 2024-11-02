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
    let result = env.getOrNull(key)?.toString() ?? ""
    verify(expected == result, expected, result)
}

function verifyParse(input: string, expected?: string): void {
    let result = stringifyVals(parse(input))
    expected ??= input
    verify(expected == result, expected, result)
}

function verifyEval(input: string, expected?: string, env?: Environment): void {
    let result = stringifyVals(evaluate(input, env))
    expected ??= input
    verify(expected == result, input + " => " + expected, result)
}

function verifyEvalError(input: string, env?: Environment): void {
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
    verifyParse("foo-bar -foo +foo *foo* :foo: foo/bar foo?")
    verifyParse("(1\n2\t3    4)", "(1 2 3 4)")
    verifyParse("'foo '(1 2)", "(quote foo) (quote (1 2))")
    verifyParse("foo ;bar", "foo")
    verifyParse("(foo ;baz\n bar)", "(foo bar)")
}

function testVals() {
    let abc = parse("(a b c)")[0]
    let abcstr = abc.toString()

    let abc2 = arrayToCons(consToArray(abc.asCons()))
    console.assert(abcstr == abc2.toString())

    let abc3 = Val.makeCons(Val.makeSymbol("a"), makeTwoElementList(Val.makeSymbol("b"), Val.makeSymbol("c")))
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

    console.assert(abc.asCons().first.toString() == "a")
    console.assert(abc.asCons().secondOrNil().toString() == "b")
    console.assert(abc.asCons().thirdOrNil().toString() == "c")
    console.assert(abc.asCons().fourthOrNil().toString() == "()")

}


function testEvalAtom() {
    let parent = new Environment().add("parent", Val.makeString("present"))
    let env = new Environment(parent).add("foo", Val.makeNumber(42))
    verifyEnv(env, "foo", "42")
    verifyEnv(env, "parent", '"present"')
    verifyEnv(env, "doesNotExist", "")

    verifyEval("1 2 #t #f")          // primitives
    verifyEval('"foo"')
    verifyEval("foo", "42", env)     // symbol lookup in the environment
    verifyEval("parent", '"present"', env)     // symbol lookup in the environment
    verifyEvalError("doesNotExist")
}

function testEvalCons() {
    let parent = new Environment().add("parent", Val.makeString("present"))
    let env = new Environment(parent).add("foo", Val.makeNumber(42))
    verifyEnv(env, "foo", "42")

    verifyEval("(quote foo)", "foo", env)
    verifyEval("'foo", "foo", env)

    verifyEval("(if #t 1 2)", "1", env)
    verifyEval("(if #f 1 2)", "2", env)
    verifyEval("(if 0 1 2)", "1", env)
    verifyEval("(if 1 2 3)", "2", env)
    verifyEval("(if (if #t #f #t) 1 2)", "2", env)

    verifyEval("(if* 1 2)", "1")
    verifyEval("(if* #f 2)", "2")

    verifyEval("(begin #f #t \"hello\" 1 2 3)", "3", env)

    // these tests modify env, then parent env, then add a new var
    verifyEval("foo", "42", env)
    verifyEval("(set! foo 7)", "7", env)
    verifyEval("foo", "7", env)
    console.assert(env.entries.size == 1)
    verifyEval("parent", "\"present\"", env)
    verifyEval("(set! parent 7)", "7", env)
    verifyEval("parent", "7", env)
    console.assert(parent.entries.size == 1)
    verifyEvalError("bar", env)
    verifyEval("(set! bar 7)", "7", env)
    verifyEval("bar", "7", env)
    console.assert(env.entries.size == 2)

    verifyEval("(lambda () #t)", "[Closure (lambda () ...)]", env)
    verifyEval("(lambda (a b c) #t)", "[Closure (lambda (a b c) ...)]", env)
    verifyEvalError("(lambda 1 #t)", env)
    verifyEvalError("(lambda ())", env)

    // this adds a new definition of identity to env
    verifyEval("(begin (set! identity (lambda (x) x)) (identity 1))", "1", env)
    console.assert(env.entries.has("identity"))

    verifyEval("((lambda (x) x) 1)", "1", env)
    verifyEval("((lambda (x y) y) 1 2)", "2", env)
    verifyEval("((lambda (x y) y #t #f x) 1 2)", "1", env)
}


testParser()
testVals()
testEvalAtom()
testEvalCons()

if (errors > 0) {
    console.error(`TOTAL ERRORS: ${errors}`)
} else {
    console.info('✔️ ALL CLEAR')
}