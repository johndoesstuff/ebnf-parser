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

enum NodeType {
	Program,

}

interface Node {
	type: NodeType,
	value?: string,
	position: number,
	children: { [key: string]: Node },
}

class Tokenizer {
	private position = 0;
	private tokens: Token[] = [];
	private regexPattern: { [key: string]: RegExp } = {
		comment: /\(\*[^*]*\*+(?:[^)*][^*]*\*+)*\)/,
		whitespace: /[ \t\n\r\f\b]+/,
		terminal: /".[^"]*"|'.[^']*'/,
		identifier: /[A-Za-z][0-9A-Za-z_]*/,
		operator: /\(:|:\)|\(|\/\)|[=,;\.\|\/!\[\]{}?\(\)\-+*<>]/,
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
				if (match && match.index === 0) {
					remaining = remaining.substring(match[0].length);
					continue;
				}
			}

			if (this.regexPattern.comment.test(remaining)) {
				const match = remaining.match(this.regexPattern.comment);
				if (match && match.index === 0) {
					remaining = remaining.substring(match[0].length);
					continue;
				}
			}


			if (this.regexPattern.terminal.test(remaining)) {
				const match = remaining.match(this.regexPattern.terminal);
				if (match && match.index === 0) {
					this.tokens.push({
						type: TokenType.Terminal,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
					continue;
				}
			}
			
			if (this.regexPattern.identifier.test(remaining)) {
				const match = remaining.match(this.regexPattern.identifier);
				if (match && match.index === 0) {
					this.tokens.push({
						type: TokenType.Identifier,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
					continue;
				}
			}

			if (this.regexPattern.operator.test(remaining)) {
				const match = remaining.match(this.regexPattern.operator);
				if (match && match.index === 0) {
					this.tokens.push({
						type: TokenType.Operator,
						value: match[0],
						position: this.position,
					});
					remaining = remaining.substring(match[0].length);
					continue;
				}
			}

			throw new Error(`Unexpected token: ${remaining}`);
		}

		return this.tokens;
	}
}

class Parser {
	constructor(private input: Token[]) {}
	
	private position = 0;
	private ast: Node = {
		type: NodeType.Program,
		position: 0,
		children: {},
	}

	parse(): Node {
		return this.ast;
	}
}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath, 'utf-8');

const tokenizer = new Tokenizer(data);
const tokens = tokenizer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

console.log(tokens);
console.log(ast);
