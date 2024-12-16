import * as fs from 'fs';

enum TokenType {
	Identifier = 'identifier',
	Terminal = 'terminal',
	Operator = 'operator',
	Terminator = 'terminator',
}

interface Token {
	type: TokenType,
	value: string,
	position: number,
}

enum NodeType {
	Grammar = 'grammar',
	Rule = 'rule',
	Concatenation = 'concatenation',
	Alternation = 'alternation',
	Factor = 'factor',
	Term = 'term',
	Identifier = 'identifier',
	Terminal = 'terminal',
}

interface Node {
	type: NodeType,
	value?: string,
	position: number,
	children: Node[],
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
		children: [],
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
		this.ast.children = [] as Node[];
		while (this.peek()) {
			this.ast.children.push(this.consumeRule());
		}
		return this.ast;
	}

	consumeRule(): Node {
		let lhs: Node = this.consumeIdentifier();
		this.consume(TokenType.Operator, '=');
		let rhs: Node = this.consumeAlternation();
		this.consume(TokenType.Terminator);
		return {
			type: NodeType.Rule,
			position: rhs.position,
			children: [ lhs, rhs ],
		};
	}

	consumeIdentifier(): Node {
		let identifier: Token = this.consume(TokenType.Identifier);
		return {
			type: NodeType.Identifier,
			position: identifier.position,
			value: identifier.value,
			children: [],
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
				children: [ lhs ],
			}
		} else if (this.peek().value == '-') { //exclusion case
			this.consume(TokenType.Operator, '-');
			let rhs: Node = this.consumeTerm();
			return {
				type: NodeType.Factor,
				position: lhs.position,
				value: '-',
				children: [ lhs, rhs ],
			}
		} else { //just term case
			return {
				type: NodeType.Factor,
				position: lhs.position,
				children: [ lhs ],
			}
		}
	}

	consumeTerm(): Node {
		let token: Token = this.peek();
		let contents: Node = null as unknown as Node;
		let value: string = ''; //important for determining grouping type
		if (token.value == '(') {
			this.consume(TokenType.Operator, '(');
			contents = this.consumeAlternation();
			this.consume(TokenType.Operator, ')');
			value = '()';
		} else if (token.value == '[') {
			this.consume(TokenType.Operator, '[');
			contents = this.consumeAlternation();
			this.consume(TokenType.Operator, ']');
			value = '[]';
		} else if (token.value == '{') {
			this.consume(TokenType.Operator, '{');
			contents = this.consumeAlternation();
			this.consume(TokenType.Operator, '}');
			value = '{}';
		} else if (token.type == TokenType.Terminal) { //was i drunk?? what the fuck was this???
			let term: Token = this.consume(TokenType.Terminal);
			return {
				type: NodeType.Terminal,
				position: term.position,
				value: term.value,
				children: [],
			}
		} else {
			contents = this.consumeIdentifier();
			value = 'identifier'; //yes yes these should probably be enums somewhere but this is my first ever typescript program and second parser give me some grace buster
		}
		return {
			type: NodeType.Term,
			position: contents.position,
			value,
			children: [ contents ],
		}
	}
}

class Compiler {
	private rules: { [key: string] : Node } = {};

	constructor(private ast: Node) {};

	getIdentifiers() {
		if (this.ast.type != NodeType.Grammar) throw `huh`;
		for (let i = 0; i < ast.children.length; i++) {
			let rule: Node = ast.children[i];
			if (!rule.children || rule.children.length < 2) throw `blehhh!!`
			if (rule.type != NodeType.Rule) throw `thats not good!`;
			const lhs = rule.children[0];
			const rhs = rule.children[1];
			if (!lhs.value) throw `rule must have a value`
			this.rules[lhs.value as string] = rhs;
		}
	}
	
	createEnums(): string {	
		this.getIdentifiers();
		let compiledEnums: string[] = [];
		compiledEnums.push('enum Type {');
		for (let i = 0; i < Object.keys(this.rules).length; i++) {
			let key: string = Object.keys(this.rules)[i];
			compiledEnums.push(`\t${key} = '${key}',`);
		}
		compiledEnums.push('}\n\n');
		return compiledEnums.join("\n");
	}

	createParser(): string {
		let compiledParser: string[] = [];
		compiledParser.push('class Parser {');
		compiledParser.push('\tprivate position: number = 0;\n');
		compiledParser.push('\tconstructor(private input: string) {}\n');

		compiledParser.push('\tpeek(): string {');
		compiledParser.push('\t\treturn this.input[this.position]');
		compiledParser.push('\t}\n');
		compiledParser.push('\tconsume(expected: string): boolean {');
		compiledParser.push('\t\tif (this.peek() === expected) {');
		compiledParser.push('\t\t\tthis.position++;');
		compiledParser.push('\t\t\treturn true;');
		compiledParser.push('\t\t}');
		compiledParser.push('\t\treturn false;');
		compiledParser.push('\t}\n');
		for (let i = 0; i < Object.keys(this.rules).length; i++) {
			let key: string = Object.keys(this.rules)[i];
			compiledParser.push(...this.createConsumer(key, this.rules[key]));
		}
		compiledParser.push('}');
		return compiledParser.join("\n");
	}

	createConsumer(identifier: string, rule: Node): string[] {
		let compiledConsumer: string[] = [];
		compiledConsumer.push(`\tconsume${identifier}() {`);
		compiledConsumer.push(`\t\t${this.createAlternator(rule)}`);
		compiledConsumer.push('\t}\n')
		return compiledConsumer;
	}

	createAlternator(alternator: Node): string {
		let compiledAlternator: string = "";
		if (alternator.type != NodeType.Alternation) throw `huhhh`;
		for (let i = 0; i < alternator.children.length; i++) {
			compiledAlternator += this.createConcatenator(alternator.children[i]);
			if (i + 1 < alternator.children.length) {
				compiledAlternator += " || ";
			}
		}
		return compiledAlternator;
	}

	createConcatenator(concatenator: Node): string {
		let compiledConcatenator: string = "";
		if (concatenator.type != NodeType.Concatenation) throw `expected concatenator...`;
		for (let i = 0; i < concatenator.children.length; i++) {
			compiledConcatenator += this.createFactor(concatenator.children[i]);
			if (i + 1 < concatenator.children.length) {
				compiledConcatenator += " + ";
			}
		}
		return compiledConcatenator;
	}

	createFactor(factor: Node): string {
		let compiledFactor: string = "0";
		if (factor.type != NodeType.Factor) throw `expected factor...`;
		return compiledFactor;
	}

	compile(): string {
		let compileString: string = '';
		compileString += this.createEnums();
		compileString += this.createParser();
		return compileString;
	}
}

const filePath = process.argv[2];
const data = fs.readFileSync(filePath, 'utf-8');

const tokenizer = new Tokenizer(data);
const tokens = tokenizer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();
const compiler = new Compiler(ast);
const compiled = compiler.compile();

console.log(tokens);
console.log(JSON.stringify(ast));
console.log(compiled);
