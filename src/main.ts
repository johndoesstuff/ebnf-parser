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
