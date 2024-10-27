import { parse } from "./parser"

let message: string = 'Hello World';
console.log(message);


let errors = 0

function verify (test: boolean, expected: any, actual: any): void {
    if (! test) {
        errors++;
        console.error(`FAILED TEST: expected ${expected} - actual: ${actual}`)
    }
}

function parseAndStringify (input: string): string {
    let parsed = parse(input)
    let strings = parsed.map(val => val.toString())
    return strings.join(" ")
}

function verifyParse (input: string, expected?: string): void {
    let result = parseAndStringify(input)
    if (expected == null) { expected = input }
    verify(expected == result, expected, result)
}

function testParser () {
    verifyParse('1 2.0 "foo"', "1 2 \"foo\"")
    verifyParse("(1 2 foo f)")
    verifyParse("((3 4) 2 () \"foo\")")
    verifyParse("#t #f")
    verifyParse("(1\n2\t3    4)", "(1 2 3 4)")
    verifyParse("'foo '(1 2)", "(quote foo) (quote (1 2))")
    verifyParse("foo ;bar", "foo")
    verifyParse("(foo ;baz\n bar)", "(foo bar)")
}

testParser()

if (errors > 0){
    console.error(`TOTAL ERRORS: ${errors}`)
} else {
    console.info('✔️ ALL CLEAR')
}