import * as fs from 'fs';

enum TokenType {
	Identifier,
	Terminal,
	Operator,
	EOF,
}

interface Token {
	type: TokenType,
	value: string,
	position: number,
}

class Tokenizer {
	private position = 0;

	constructor(private input: string) {}
}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath, 'utf-8');
console.log(data);
