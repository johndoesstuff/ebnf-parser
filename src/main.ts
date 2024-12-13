import * as fs from 'fs';

enum TokenType {
	Identifier,
	Terminal,
	Operator,
	Terminator,
}

interface Token {
	type: TokenType,
	value: string,
	position: number,
}

enum NodeType {
	Grammar,
	Rule,
	Concatenation,
	Alternation,
	Factor,
	Term,
	Identifier,
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
		operator: /\(:|:\)|\(|\/\)|[=,\|\/!\[\]{}?\(\)\-+*<>]/,
		terminator: /[;\.]/,
	};

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
			
			if (this.regexPattern.terminator.test(remaining)) {
				const match = remaining.match(this.regexPattern.terminator);
				if (match && match.index === 0) {
					this.tokens.push({
						type: TokenType.Terminator,
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
	constructor(private tokens: Token[]) {}
	
	private position = 0;
	private ast: Node = {
		type: NodeType.Grammar,
		position: 0,
		children: {},
	}

	consume(tokenType: TokenType): Token {
		if (this.tokens[this.position].type == tokenType) {
			return this.tokens[this.position++];
		}
		throw `could not find token of type ${tokenType}, instead found ${this.tokens[this.position]}`;
	}

	parse(): Node {
		return this.ast;
	}

	consumeRule(): Node {
		return {
			type: NodeType.Rule,
			position: 0,
			children: {},
		};
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
