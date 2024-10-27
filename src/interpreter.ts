import { parse } from "./parser";
import { Val } from "./values";

export class Environment {
    entries: Map<string, Val>
    parent?: Environment

    constructor(entries?: Map<string, Val>, parent?: Environment) {
        this.entries = entries ?? new Map<string, Val>()
        this.parent = parent
    }

    public get(name: string): Val | null {
        return this.entries.get(name) ?? this.parent?.get(name);
    }
}

export function evaluate(input: string, env?: Environment): Val[] {
    let realenv = env ?? new Environment()
    let parsed: Val[] = parse(input)

    return parsed.map(val => evaluateVal(val, realenv))
}

export function evaluateVal(input: Val, env: Environment): Val {

    if (input.isPrimitive()) { return input }
    if (input.isNil()) { return input }
    if (input.isSymbol()) {
        let result = env.get(input.asSymbol())
        if (result == null) {
            throw new Error("Unknown symbol: " + input.toString())
        } else {
            return result
        }
    }

    throw new Error("Unable to evaluate input: " + input.toString())
}
