enum Type {
	letter = 'letter',
	digit = 'digit',
	symbol = 'symbol',
	character = 'character',
	identifier = 'identifier',
	S = 'S',
	terminal = 'terminal',
	terminator = 'terminator',
	term = 'term',
	factor = 'factor',
	concatenation = 'concatenation',
	alternation = 'alternation',
	rhs = 'rhs',
	lhs = 'lhs',
	rule = 'rule',
	grammar = 'grammar',
}

import * as fs from 'fs'

class Parser {
	private position: number = 0;

	constructor(private input: string) {}

	peek(): string {
		return this.input[this.position]
	}

	consume(expected: string): boolean {
		if (this.peek() === expected) {
			this.position++;
			return true;
		}
		return false;
	}

	consumeletter() {
		let startPosition = this.position;
		let success: boolean = (this.consume("A")) || (this.consume("B")) || (this.consume("C")) || (this.consume("D")) || (this.consume("E")) || (this.consume("F")) || (this.consume("G")) || (this.consume("H")) || (this.consume("I")) || (this.consume("J")) || (this.consume("K")) || (this.consume("L")) || (this.consume("M")) || (this.consume("N")) || (this.consume("O")) || (this.consume("P")) || (this.consume("Q")) || (this.consume("R")) || (this.consume("S")) || (this.consume("T")) || (this.consume("U")) || (this.consume("V")) || (this.consume("W")) || (this.consume("X")) || (this.consume("Y")) || (this.consume("Z")) || (this.consume("a")) || (this.consume("b")) || (this.consume("c")) || (this.consume("d")) || (this.consume("e")) || (this.consume("f")) || (this.consume("g")) || (this.consume("h")) || (this.consume("i")) || (this.consume("j")) || (this.consume("k")) || (this.consume("l")) || (this.consume("m")) || (this.consume("n")) || (this.consume("o")) || (this.consume("p")) || (this.consume("q")) || (this.consume("r")) || (this.consume("s")) || (this.consume("t")) || (this.consume("u")) || (this.consume("v")) || (this.consume("w")) || (this.consume("x")) || (this.consume("y")) || (this.consume("z"));
		if (!success) this.position = startPosition;
		return success;
	}

	consumedigit() {
		let startPosition = this.position;
		let success: boolean = (this.consume("0")) || (this.consume("1")) || (this.consume("2")) || (this.consume("3")) || (this.consume("4")) || (this.consume("5")) || (this.consume("6")) || (this.consume("7")) || (this.consume("8")) || (this.consume("9"));
		if (!success) this.position = startPosition;
		return success;
	}

	consumesymbol() {
		let startPosition = this.position;
		let success: boolean = (this.consume("[")) || (this.consume("]")) || (this.consume("{")) || (this.consume("}")) || (this.consume("(")) || (this.consume(")")) || (this.consume("<")) || (this.consume(">")) || (this.consume("'")) || (this.consume('"')) || (this.consume("=")) || (this.consume("|")) || (this.consume(".")) || (this.consume(",")) || (this.consume(";")) || (this.consume("-")) || (this.consume("+")) || (this.consume("*")) || (this.consume("?")) || (this.consume("\n")) || (this.consume("\t")) || (this.consume("\r")) || (this.consume("\f")) || (this.consume("\b"));
		if (!success) this.position = startPosition;
		return success;
	}

	consumecharacter() {
		let startPosition = this.position;
		let success: boolean = (this.consumeletter()) || (this.consumedigit()) || (this.consumesymbol()) || (this.consume("_")) || (this.consume(" "));
		if (!success) this.position = startPosition;
		return success;
	}

	consumeidentifier() {
		let startPosition = this.position;
		let success: boolean = this.consumeletter() && (()=>{let startPosition = this.position; while((this.consumeletter()) || (this.consumedigit()) || (this.consume("_"))){}; return true})();
		if (!success) this.position = startPosition;
		return success;
	}

	consumeS() {
		let startPosition = this.position;
		let success: boolean = (()=>{let startPosition = this.position; while((this.consume(" ")) || (this.consume("\n")) || (this.consume("\t")) || (this.consume("\r")) || (this.consume("\f")) || (this.consume("\b"))){}; return true})();
		if (!success) this.position = startPosition;
		return success;
	}

	consumeterminal() {
		let startPosition = this.position;
		let success: boolean = (this.consume("'") && (this.consumecharacter()&& !this.consume("'")) && (()=>{let startPosition = this.position; while((this.consumecharacter()&& !this.consume("'"))){}; return true})() && this.consume("'")) || (this.consume('"') && (this.consumecharacter()&& !this.consume('"')) && (()=>{let startPosition = this.position; while((this.consumecharacter()&& !this.consume('"'))){}; return true})() && this.consume('"'));
		if (!success) this.position = startPosition;
		return success;
	}

	consumeterminator() {
		let startPosition = this.position;
		let success: boolean = (this.consume(";")) || (this.consume("."));
		if (!success) this.position = startPosition;
		return success;
	}

	consumeterm() {
		let startPosition = this.position;
		let success: boolean = (this.consume("(") && this.consumeS() && this.consumerhs() && this.consumeS() && this.consume(")")) || (this.consume("[") && this.consumeS() && this.consumerhs() && this.consumeS() && this.consume("]")) || (this.consume("{") && this.consumeS() && this.consumerhs() && this.consumeS() && this.consume("}")) || (this.consumeterminal()) || (this.consumeidentifier());
		if (!success) this.position = startPosition;
		return success;
	}

	consumefactor() {
		let startPosition = this.position;
		let success: boolean = (this.consumeterm() && this.consumeS() && this.consume("?")) || (this.consumeterm() && this.consumeS() && this.consume("*")) || (this.consumeterm() && this.consumeS() && this.consume("+")) || (this.consumeterm() && this.consumeS() && this.consume("-") && this.consumeS() && this.consumeterm()) || (this.consumeterm() && this.consumeS());
		if (!success) this.position = startPosition;
		return success;
	}

	consumeconcatenation() {
		let startPosition = this.position;
		let success: boolean = (()=>{let startPosition = this.position; if (!(this.consumeS() && this.consumefactor() && this.consumeS() && (this.consume(",") || true))) {this.position = startPosition; return false;} while ((this.consumeS() && this.consumefactor() && this.consumeS() && (this.consume(",") || true))) {} return true;})();
		if (!success) this.position = startPosition;
		return success;
	}

	consumealternation() {
		let startPosition = this.position;
		let success: boolean = (()=>{let startPosition = this.position; if (!(this.consumeS() && this.consumeconcatenation() && this.consumeS() && (this.consume("|") || true))) {this.position = startPosition; return false;} while ((this.consumeS() && this.consumeconcatenation() && this.consumeS() && (this.consume("|") || true))) {} return true;})();
		if (!success) this.position = startPosition;
		return success;
	}

	consumerhs() {
		let startPosition = this.position;
		let success: boolean = this.consumealternation();
		if (!success) this.position = startPosition;
		return success;
	}

	consumelhs() {
		let startPosition = this.position;
		let success: boolean = this.consumeidentifier();
		if (!success) this.position = startPosition;
		return success;
	}

	consumerule() {
		let startPosition = this.position;
		let success: boolean = this.consumelhs() && this.consumeS() && this.consume("=") && this.consumeS() && this.consumerhs() && this.consumeS() && this.consumeterminator();
		if (!success) this.position = startPosition;
		return success;
	}

	consumegrammar() {
		let startPosition = this.position;
		let success: boolean = (()=>{let startPosition = this.position; while((this.consumeS() && this.consumerule() && this.consumeS())){}; return true})();
		if (!success) this.position = startPosition;
		return success;
	}

}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath, "utf-8");
const parser = Parser(data);
fs.writeFileSync(filePath, parser.consumegrammar(), "utf8");