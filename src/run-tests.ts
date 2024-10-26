import { parse } from "./parser"

let message: string = 'Hello World';
console.log(message);



let result1 = parse('1 2.0 "foo"')
for (let result of result1) { console.log(result.toString()) }

let result2 = parse("(1 2 foo f)")
for (let result of result2) { console.log(result.toString()) }

let result3 = parse("((3 4) 2 () \"foo\")")
for (let result of result3) { console.log(result.toString()) }
