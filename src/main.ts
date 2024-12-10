import * as fs from 'fs';

enum TokenType {
	Identifier,
	Terminal,
	Operator,
}

interface Token {
	type: TokenType,
	value: string,
	position: number,
}

class Tokenizer {
	private position = 0;
	private tokens: Token[] = [];
	private regexPattern: { [key: string]: RegExp } = {
		comment: /\(\*[^*]*\*+(?:[^)*][^*]*\*+)*\)/,
		whitespace: /^[ \t\n\r]+/,
		terminal: /".[^"]*"|'.[^"]*'/,
		identifier: /[A-Za-z][0-9A-Za-z_]*/,
		operator: /\(:|:\)|\(|\/\)|[=,;\.\|\/!\[\]{}?\(\)]/,
	};
	private regexPriority: string[] = [
		"whitespace",
		"comment",
		"terminal",
		"identifier",
		"operator",
	];

	constructor(private input: string) {}

	tokenize(): Token[] {
		let remaining = this.input;

		while (remaining.length > 0) {
			let matched = false;
			this.position = this.input.length - remaining.length;
			
			if (this.regexPattern.whitespace.test(remaining)) {
				const match = remaining.match(this.regexPattern.whitespace);
				if (match) remaining = remaining.substring(match[0].length);
				continue;
			}

			if (this.regexPattern.comment.test(remaining)) {
				const match = remaining.match(this.regexPattern.comment);
				if (match) remaining = remaining.substring(match[0].length);
				continue;
			}


			if (this.regexPattern.terminal.test(remaining)) {
				const match = remaining.match(this.regexPattern.terminal);
				if (match) {
					this.tokens.push({
						type: TokenType.Terminal,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
				}
				continue;
			}
			
			if (this.regexPattern.identifier.test(remaining)) {
				const match = remaining.match(this.regexPattern.identifier);
				if (match) {
					this.tokens.push({
						type: TokenType.Identifier,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
				}
				continue;
			}

			if (this.regexPattern.operator.test(remaining)) {
				const match = remaining.match(this.regexPattern.operator);
				if (match) {
					this.tokens.push({
						type: TokenType.Operator,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
				}
				continue;
			}

			throw new Error(`Unexpected token: ${remaining}`);
		}

		return this.tokens;
	}
}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath, 'utf-8');

const tokenizer = new Tokenizer(data);
const tokens = tokenizer.tokenize();

console.log(tokens);
