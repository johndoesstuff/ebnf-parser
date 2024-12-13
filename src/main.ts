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
	children: { [key: string]: Node } | Node[],
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

	parseError(expected: TokenType, found: Token, expectedValue?: string) {
		throw `Expected token of type ${expected}${expectedValue ? " and value of " + expectedValue : ''}, instead found ${found.value} of type ${found.type} at ${found.position}`;
	}

	consume(tokenType: TokenType, value?: string): Token {
		if (!value) {
			if (this.peek().type == tokenType) {
				return this.tokens[this.position++];
			}
			this.parseError(tokenType, this.peek());
		} else {
			if (this.peek().type == tokenType && this.peek().value == value) {
				return this.tokens[this.position++];
			}
			this.parseError(tokenType, this.peek(), value);
		}
				return this.tokens[this.position++];
	}

	peek(): Token {
		return this.tokens[this.position];
	}

	parse(): Node {
		return this.ast;
	}

	consumeRule(): Node {
		let rhs: Node = this.consumeIdentifier();
		this.consume(TokenType.Operator, '=');
		let lhs: Node = this.consumeAlternation();
		this.consume(TokenType.Terminator);
		return {
			type: NodeType.Rule,
			position: rhs.position,
			children: { rhs, lhs },
		};
	}

	consumeIdentifier(): Node {
		let identifier: Token = this.consume(TokenType.Identifier);
		return {
			type: NodeType.Identifier,
			position: identifier.position,
			value: identifier.value,
			children: {},
		}
	}

	consumeAlternation(): Node {
		let concats: Node[] = [];
		concats.push(this.consumeConcatenation());
		while (this.peek().value == '|') {
			this.consume(TokenType.Operator, '|');
			concats.push(this.consumeConcatenation());
		}
		return {
			type: NodeType.Alternation,
			position: concats[0].position,
			children: concats,
		}
	}

	consumeConcatenation(): Node {
		let factors: Node[] = [];
		factors.push(this.consumeFactor());
		while (this.peek().value == ',') {
			this.consume(TokenType.Operator, ',');
			factors.push(this.consumeFactor());
		}
		return {
			type: NodeType.Concatenation,
			position: factors[0].position,
			children: factors,
		}
	}

	consumeFactor(): Node {
		let lhs: Node = this.consumeTerm();
		if (['?', '*', '+'].includes(this.peek().value)) { //normal operator case
			let operator: Token = this.consume(TokenType.Operator);
			return {
				type: NodeType.Factor,
				position: lhs.position,
				value: operator.value,
				children: { term: lhs },
			}
		} else if (this.peek().value == '-') { //exclusion case
			this.consume(TokenType.Operator, '-');
			let rhs: Node = this.consumeTerm();
			return {
				type: NodeType.Factor,
				position: lhs.position,
				value: '-',
				children: { lhs, rhs },
			}
		} else { //just term case
			return {
				type: NodeType.Factor,
				position: lhs.position,
				children: { term: lhs },
			}
		}
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
