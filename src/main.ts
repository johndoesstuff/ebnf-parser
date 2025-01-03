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

let verbose: boolean = false;

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
		} else if (token.type == TokenType.Terminal) { //having things named term terminal and terminator gets confusing
			let term: Token = this.consume(TokenType.Terminal);
			/*let q = term.value[0];
			term.value = q + term.value.slice(1, -1).replace(/\\(n|t|r|b|f|v|u[0-9a-fA-F]{4})/g, (match, p1) => {
				switch(p1) {
					case 'n': return '\n';
					case 't': return '\t';
					case 'r': return '\r';
					case 'b': return '\b';
					case 'f': return '\f';
					case 'v': return '\v';
					case 'u': return String.fromCharCode(parseInt(match.slice(2), 16));
					default: return match;
				}
			}) + q;*/
			return {
				type: NodeType.Term,
				position: term.position,
				value: 'terminal',
				children: [{
					type: NodeType.Terminal,
					position: term.position,
					value: term.value,
					children: [],
				}],
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
		compiledParser.push("import * as fs from 'fs'\n"); //imports

		compiledParser.push("type ASTNode = {"); //ast node
		compiledParser.push("\ttype: string;");
		compiledParser.push("\tvalue: string;");
		compiledParser.push("\tchildren: ASTNode[];")
		compiledParser.push("};\n");

		compiledParser.push('class Parser {'); //parser class
		compiledParser.push('\tprivate position: number = 0;\n');
		compiledParser.push('\tconstructor(private input: string) {}\n');

		compiledParser.push('\tpeek(): string {'); //peek
		compiledParser.push('\t\treturn this.input[this.position]');
		compiledParser.push('\t}\n');

		compiledParser.push('\tconsume(expected: string): ASTNode | null {'); //consume
		if (verbose) compiledParser.push('\t\tconsole.log(`attempting to consume ${expected}`)');
		compiledParser.push('\t\tif (this.peek() === expected) {');
		if (verbose) compiledParser.push('\t\t\tconsole.log(`consumed ${expected}`)');
		compiledParser.push('\t\t\treturn { type: "TOKEN", value: this.input[this.position++], children: [] };');
		compiledParser.push('\t\t}');
		compiledParser.push('\t\treturn null;');
		compiledParser.push('\t}\n');

		for (let i = 0; i < Object.keys(this.rules).length; i++) { //rules
			let key: string = Object.keys(this.rules)[i];
			compiledParser.push(...this.createConsumer(key, this.rules[key]));
		}
		let grammar: string = Object.keys(this.rules)[Object.keys(this.rules).length - 1] as string; //assume last rule defines a grammar
		compiledParser.push('}\n');

		compiledParser.push('const filePath = process.argv[2];'); //parse
		compiledParser.push('const data = fs.readFileSync(filePath, "utf-8");');
		compiledParser.push('const parser = new Parser(data);')
		compiledParser.push(`console.log(JSON.stringify(parser.consume${grammar}()));`);
		return compiledParser.join("\n");
	}

	createConsumer(identifier: string, rule: Node): string[] {
		let compiledConsumer: string[] = [];
		compiledConsumer.push(`\tconsume${identifier}() {`);
		if (verbose) compiledConsumer.push(`\t\tconsole.log("attempting to consume ${identifier} at position " + this.position + "")`);
		compiledConsumer.push('\t\tlet startPosition = this.position;'); //incase consumption fails
		compiledConsumer.push(`\t\tlet success: ASTNode | null = ${this.createAlternator(rule)};`);
		compiledConsumer.push(`\t\tif (!success) {`); //if consumption fails
		compiledConsumer.push(`\t\t\tthis.position = startPosition;`); //if consumption fails
		if (verbose) compiledConsumer.push(`\t\t\tconsole.log("could not consume ${identifier}")`);
		compiledConsumer.push(`\t\t}`)
		compiledConsumer.push(`\t\telse {`)
		compiledConsumer.push(`\t\t\tsuccess.type = '${identifier}'`);
		if (verbose) compiledConsumer.push(`\t\t\tconsole.log("consumed ${identifier}")`);
		compiledConsumer.push(`\t\t}`);
		compiledConsumer.push(`\t\treturn success;`);
		compiledConsumer.push('\t}\n')
		return compiledConsumer;
	}

	doNoneOrMore(code: string): string {
		return "(()=>{let startPosition = this.position; let acc = []; let res = null; do {res = " + code + "; if (res) acc.push(res)} while (res); return { type: 'matcher', value: '0+', children: acc};})()";
	}

	doOnceOrMore(code: string): string {
		return "(()=>{let startPosition = this.position; let acc = []; let res = " + code + "; if (!res) {this.position = startPosition; return null;} while(res){acc.push(res); res = " + code + "}; return { type: 'matcher', value: '1+', children: acc};})()"; 
	}

	doNoneOrOnce(code: string): string {
		return "(()=>{let startPosition = this.position; let res = " + code + "; if (!res) {this.position = startPosition; return { type: 'matcher', value: '0|1', children: []};} return { type: 'matcher', value: '0|1', children: [res]};})()";
	}

	excludeFrom(code: string, excludes: string): string {
		return "(() => {let startPosition = this.position; let res = " + excludes + "; this.position = startPosition; if (res) {return null} else {return " + code + "}})()";
	}

	createAlternator(alternator: Node): string {
		let compiledAlternator: string = "let startPosition = this.position; let res = null; ";
		if (alternator.type != NodeType.Alternation) throw `huhhh`;
		if (alternator.children.length == 1) return this.createConcatenator(alternator.children[0]);
		for (let i = 0; i < alternator.children.length; i++) {
			compiledAlternator += "res = (" + this.createConcatenator(alternator.children[i]) + "); if (res) {return res;}";
			/*if (i + 1 < alternator.children.length) {
				compiledAlternator += " || ";
			}*/
		}
		return "(()=>{" + compiledAlternator + "})()";
	}

	createConcatenator(concatenator: Node): string {
		let compiledConcatenator: string = "let startPosition = this.position; let acc = []; let res = null; ";
		if (concatenator.type != NodeType.Concatenation) throw `expected concatenator...`;
		if (concatenator.children.length == 1) return this.createFactor(concatenator.children[0]);
		for (let i = 0; i < concatenator.children.length; i++) {
			compiledConcatenator += "res = " + this.createFactor(concatenator.children[i]) + "; if (!res) {this.position = startPosition; return null} acc.push(res); "
			/*if (i + 1 < concatenator.children.length) {
				compiledConcatenator += " && ";
			}*/
		}
		compiledConcatenator += "return { type: 'concat', value: '', children: acc};"
		return "(()=>{" + compiledConcatenator + "})()";
	}

	createFactor(factor: Node): string {
		let compiledFactor: string = "";
		if (factor.type != NodeType.Factor) throw `expected factor...`;
		if (!factor.value) { //no operaton to be performed
			compiledFactor += this.createTerm(factor.children[0]);
		} else if (factor.value == "*") {
			compiledFactor += this.doNoneOrMore(this.createTerm(factor.children[0]));
		} else if (factor.value == "+") {
			compiledFactor += this.doOnceOrMore(this.createTerm(factor.children[0]));
		} else if (factor.value == "?") {
			compiledFactor += this.doNoneOrOnce(this.createTerm(factor.children[0]));
		} else if (factor.value == "-") {
			compiledFactor += this.excludeFrom(this.createTerm(factor.children[0]), this.createTerm(factor.children[1]));
		} else {
			throw `unknown factor ${factor.value}`;
		}
		return compiledFactor;
	}

	createTerm(term: Node): string {
		let compiledTerm: string = "";
		if (term.value == "identifier") {
			compiledTerm += this.createIdentifier(term.children[0]);
		} else if (term.value == "terminal") {
			compiledTerm += this.createTerminal(term.children[0]);
		} else if (term.value == "[]") {
			compiledTerm += this.doNoneOrOnce(this.createAlternator(term.children[0]));
		} else if (term.value == "()") {
			compiledTerm += "(" + this.createAlternator(term.children[0]) + ")";
		} else if (term.value == "{}") {
			compiledTerm += this.doNoneOrMore(this.createAlternator(term.children[0]));
		} else {
			throw `unknown term ${term.value}`;
		}
		return compiledTerm;
	}

	createIdentifier(identifier: Node): string {
		return `this.consume${identifier.value}()`;
	}

	createTerminal(terminal: Node): string {
		return `this.consume(${terminal.value})`;
	}

	compile(): string {
		let compileString: string = '';
		compileString += this.createEnums();
		compileString += this.createParser();
		return compileString;
	}

	compileToFile(filePath: string) {
		fs.writeFileSync(filePath, this.compile(), 'utf8');
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
compiler.compileToFile("dist/compiled.ts");

if (verbose) {
	console.log(tokens);
	console.log(JSON.stringify(ast));
	console.log(compiled);
}
