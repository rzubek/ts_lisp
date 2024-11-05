import { evaluate } from "./interpreter";
import { parse } from "./parser"
import { length, envGet, Environment, Val, print, arrayToCons, consToArray, asCons, makeCons, makeSymbol, makeTwoElementList, cadr, caddr, isCons, second, third, first, isNil, nth, NIL, fourth, envMake, envAdd, makeString, makeNumber, valToPrimval, makeBoolean, primvalToVal } from "./values";

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
    let strings = vals.map(val => print(val))
    return strings.join(" ")
}

function verifyEnv(env: Environment, key: string, expected: string): void {
    let value = envGet(env, key)
    let result = value != null ? print(value) : ""
    verify(expected == result, expected, result)
}

function verifyParse(input: string, expected?: string): void {
    let result = stringifyVals(parse(input))
    expected ??= input
    verify(expected == result, expected, result)
}

function verifyEval(input: string, expected?: string, env?: Environment): void {
    env = env ?? envMake()
    let result = stringifyVals(evaluate(input, env))
    expected ??= input
    verify(expected == result, input + " => " + expected, result)
}

function verifyEvalError(input: string, env?: Environment): void {
    try {
        env = env ?? envMake()
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
    let tryabc = parse("(a b c)")[0]
    console.assert(isCons(tryabc))
    let abc = asCons(tryabc)
    let abcstr = print(abc)

    let abc2 = arrayToCons(consToArray(abc))
    console.assert(abcstr == print(abc2))

    let abc3 = makeCons(makeSymbol("a"), makeTwoElementList(makeSymbol("b"), makeSymbol("c")))
    console.assert(abcstr == print(abc3))

    console.assert(length(asCons(abc)) == 3)
    console.assert(consToArray(asCons(abc)).length == 3)

    console.assert(print(first(abc)) == "a")
    console.assert(print(second(abc)) == "b")
    console.assert(print(third(abc)) == "c")
    console.assert(print(fourth(abc)) == "()")

    let justa = asCons(parse("(a)")[0])
    console.assert(print(first(justa)) == "a")
    console.assert(print(second(justa)) == "()")
    console.assert(print(third(justa)) == "()")

    let nothing = parse("()")[0]
    console.assert(isNil(nothing))
    console.assert(print(nothing) == "()")

    console.assert(print(nth(abc, 0)) == "a")
    console.assert(print(nth(abc, 1)) == "b")
    console.assert(print(nth(abc, 2)) == "c")
    console.assert(print(nth(abc, 3)) == "()")
    console.assert(isNil(nth(abc, 3)))
    console.assert(isNil(nth(NIL, 0)))
}


function testEvalAtom() {
    let parent = envAdd(envMake(), "parent", makeString("present"))
    let env = envAdd(envMake(parent), "foo", makeNumber(42))
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
    let parent = envAdd(envMake(), "parent", makeString("present"))
    let env = envAdd(envMake(parent), "foo", makeNumber(42))
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

function testEvalPrimops () {
    console.assert(valToPrimval(makeNumber(42)) == 42)
    console.assert(valToPrimval(makeString("foo")) == "foo")
    console.assert(valToPrimval(makeBoolean(true)) == true)
    verifyEval("(+ 1 2)", "3")
    verifyEval("(* 2 (+ 1 2))", "6")
    verifyEval("(> 2 1)", "#t")
    verifyEval("(not (== 2 1))", "#t")

    verifyEval("(begin (set! x 0) (set! x (+ x 1)) x)", "1")
}

testParser()
testVals()
testEvalAtom()
testEvalCons()
testEvalPrimops()

if (errors > 0) {
    console.error(`TOTAL ERRORS: ${errors}`)
} else {
    console.info('✔️ ALL CLEAR')
}