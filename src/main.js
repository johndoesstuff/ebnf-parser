"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var TokenType;
(function (TokenType) {
    TokenType["Identifier"] = "identifier";
    TokenType["Terminal"] = "terminal";
    TokenType["Operator"] = "operator";
    TokenType["Terminator"] = "terminator";
})(TokenType || (TokenType = {}));
var NodeType;
(function (NodeType) {
    NodeType["Grammar"] = "grammar";
    NodeType["Rule"] = "rule";
    NodeType["Concatenation"] = "concatenation";
    NodeType["Alternation"] = "alternation";
    NodeType["Factor"] = "factor";
    NodeType["Term"] = "term";
    NodeType["Identifier"] = "identifier";
    NodeType["Terminal"] = "terminal";
})(NodeType || (NodeType = {}));
var Tokenizer = /** @class */ (function () {
    function Tokenizer(input) {
        this.input = input;
        this.position = 0;
        this.tokens = [];
        this.regexPattern = {
            comment: /\(\*[^*]*\*+(?:[^)*][^*]*\*+)*\)/,
            whitespace: /[ \t\n\r\f\b]+/,
            terminal: /".[^"]*"|'.[^']*'/,
            identifier: /[A-Za-z][0-9A-Za-z_]*/,
            operator: /\(:|:\)|\(|\/\)|[=,\|\/!\[\]{}?\(\)\-+*<>]/,
            terminator: /[;\.]/,
        };
    }
    Tokenizer.prototype.tokenize = function () {
        var remaining = this.input;
        while (remaining.length > 0) {
            var matched = false;
            this.position = this.input.length - remaining.length;
            if (this.regexPattern.whitespace.test(remaining)) {
                var match = remaining.match(this.regexPattern.whitespace);
                if (match && match.index === 0) {
                    remaining = remaining.substring(match[0].length);
                    continue;
                }
            }
            if (this.regexPattern.comment.test(remaining)) {
                var match = remaining.match(this.regexPattern.comment);
                if (match && match.index === 0) {
                    remaining = remaining.substring(match[0].length);
                    continue;
                }
            }
            if (this.regexPattern.terminal.test(remaining)) {
                var match = remaining.match(this.regexPattern.terminal);
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
                var match = remaining.match(this.regexPattern.terminator);
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
                var match = remaining.match(this.regexPattern.identifier);
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
                var match = remaining.match(this.regexPattern.operator);
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
            throw new Error("Unexpected token: ".concat(remaining));
        }
        return this.tokens;
    };
    return Tokenizer;
}());
var Parser = /** @class */ (function () {
    function Parser(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.ast = {
            type: NodeType.Grammar,
            position: 0,
            children: [],
        };
    }
    Parser.prototype.parseError = function (expected, found, expectedValue) {
        throw "Expected token of type ".concat(expected).concat(expectedValue ? " and value of " + expectedValue : '', ", instead found ").concat(found.value, " of type ").concat(found.type, " at ").concat(found.position);
    };
    Parser.prototype.consume = function (tokenType, value) {
        if (!value) {
            if (this.peek().type == tokenType) {
                return this.tokens[this.position++];
            }
            this.parseError(tokenType, this.peek());
        }
        else {
            if (this.peek().type == tokenType && this.peek().value == value) {
                return this.tokens[this.position++];
            }
            this.parseError(tokenType, this.peek(), value);
        }
        return this.tokens[this.position++];
    };
    Parser.prototype.peek = function () {
        return this.tokens[this.position];
    };
    Parser.prototype.parse = function () {
        this.ast.children = [];
        while (this.peek()) {
            this.ast.children.push(this.consumeRule());
        }
        return this.ast;
    };
    Parser.prototype.consumeRule = function () {
        var lhs = this.consumeIdentifier();
        this.consume(TokenType.Operator, '=');
        var rhs = this.consumeAlternation();
        this.consume(TokenType.Terminator);
        return {
            type: NodeType.Rule,
            position: rhs.position,
            children: [lhs, rhs],
        };
    };
    Parser.prototype.consumeIdentifier = function () {
        var identifier = this.consume(TokenType.Identifier);
        return {
            type: NodeType.Identifier,
            position: identifier.position,
            value: identifier.value,
            children: [],
        };
    };
    Parser.prototype.consumeAlternation = function () {
        var concats = [];
        concats.push(this.consumeConcatenation());
        while (this.peek().value == '|') {
            this.consume(TokenType.Operator, '|');
            concats.push(this.consumeConcatenation());
        }
        return {
            type: NodeType.Alternation,
            position: concats[0].position,
            children: concats,
        };
    };
    Parser.prototype.consumeConcatenation = function () {
        var factors = [];
        factors.push(this.consumeFactor());
        while (this.peek().value == ',') {
            this.consume(TokenType.Operator, ',');
            factors.push(this.consumeFactor());
        }
        return {
            type: NodeType.Concatenation,
            position: factors[0].position,
            children: factors,
        };
    };
    Parser.prototype.consumeFactor = function () {
        var lhs = this.consumeTerm();
        if (['?', '*', '+'].includes(this.peek().value)) { //normal operator case
            var operator = this.consume(TokenType.Operator);
            return {
                type: NodeType.Factor,
                position: lhs.position,
                value: operator.value,
                children: [lhs],
            };
        }
        else if (this.peek().value == '-') { //exclusion case
            this.consume(TokenType.Operator, '-');
            var rhs = this.consumeTerm();
            return {
                type: NodeType.Factor,
                position: lhs.position,
                value: '-',
                children: [lhs, rhs],
            };
        }
        else { //just term case
            return {
                type: NodeType.Factor,
                position: lhs.position,
                children: [lhs],
            };
        }
    };
    Parser.prototype.consumeTerm = function () {
        var token = this.peek();
        var contents = null;
        var value = ''; //important for determining grouping type
        if (token.value == '(') {
            this.consume(TokenType.Operator, '(');
            contents = this.consumeAlternation();
            this.consume(TokenType.Operator, ')');
            value = '()';
        }
        else if (token.value == '[') {
            this.consume(TokenType.Operator, '[');
            contents = this.consumeAlternation();
            this.consume(TokenType.Operator, ']');
            value = '[]';
        }
        else if (token.value == '{') {
            this.consume(TokenType.Operator, '{');
            contents = this.consumeAlternation();
            this.consume(TokenType.Operator, '}');
            value = '{}';
        }
        else if (token.type == TokenType.Terminal) { //having things named term terminal and terminator gets confusing
            var term = this.consume(TokenType.Terminal);
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
            };
        }
        else {
            contents = this.consumeIdentifier();
            value = 'identifier'; //yes yes these should probably be enums somewhere but this is my first ever typescript program and second parser give me some grace buster
        }
        return {
            type: NodeType.Term,
            position: contents.position,
            value: value,
            children: [contents],
        };
    };
    return Parser;
}());
var Compiler = /** @class */ (function () {
    function Compiler(ast) {
        this.ast = ast;
        this.rules = {};
    }
    ;
    Compiler.prototype.getIdentifiers = function () {
        if (this.ast.type != NodeType.Grammar)
            throw "huh";
        for (var i = 0; i < ast.children.length; i++) {
            var rule = ast.children[i];
            if (!rule.children || rule.children.length < 2)
                throw "blehhh!!";
            if (rule.type != NodeType.Rule)
                throw "thats not good!";
            var lhs = rule.children[0];
            var rhs = rule.children[1];
            if (!lhs.value)
                throw "rule must have a value";
            this.rules[lhs.value] = rhs;
        }
    };
    Compiler.prototype.createEnums = function () {
        this.getIdentifiers();
        var compiledEnums = [];
        compiledEnums.push('enum Type {');
        for (var i = 0; i < Object.keys(this.rules).length; i++) {
            var key = Object.keys(this.rules)[i];
            compiledEnums.push("\t".concat(key, " = '").concat(key, "',"));
        }
        compiledEnums.push('}\n\n');
        return compiledEnums.join("\n");
    };
    Compiler.prototype.createParser = function () {
        var compiledParser = [];
        compiledParser.push("import * as fs from 'fs'\n");
        compiledParser.push("type ASTNode = {");
        compiledParser.push("\ttype: string;");
        compiledParser.push("\tvalue: string;");
        compiledParser.push("};\n");
        compiledParser.push('class Parser {');
        compiledParser.push('\tprivate position: number = 0;\n');
        compiledParser.push('\tconstructor(private input: string) {}\n');
        compiledParser.push('\tpeek(): string {');
        compiledParser.push('\t\treturn this.input[this.position]');
        compiledParser.push('\t}\n');
        compiledParser.push('\tconsume(expected: string): ASTNode | null {');
        compiledParser.push('\t\tif (this.peek() === expected) {');
        compiledParser.push('\t\t\treturn { type: "TOKEN", value: this.input[this.position++] };');
        compiledParser.push('\t\t}');
        compiledParser.push('\t\treturn false;');
        compiledParser.push('\t}\n');
        for (var i = 0; i < Object.keys(this.rules).length; i++) {
            var key = Object.keys(this.rules)[i];
            compiledParser.push.apply(compiledParser, this.createConsumer(key, this.rules[key]));
        }
        var grammar = Object.keys(this.rules)[Object.keys(this.rules).length - 1]; //assume last rule defines a grammar
        compiledParser.push('}\n');
        compiledParser.push('const filePath = process.argv[2];');
        compiledParser.push('const data = fs.readFileSync(filePath, "utf-8");');
        compiledParser.push('const parser = new Parser(data);');
        compiledParser.push("fs.writeFileSync(filePath, parser.consume".concat(grammar, "(), \"utf8\");"));
        return compiledParser.join("\n");
    };
    Compiler.prototype.createConsumer = function (identifier, rule) {
        var compiledConsumer = [];
        compiledConsumer.push("\tconsume".concat(identifier, "() {"));
        compiledConsumer.push('\t\tlet startPosition = this.position;'); //incase consumption fails
        compiledConsumer.push("\t\tlet success: ASTNode | null = ".concat(this.createAlternator(rule), ";"));
        compiledConsumer.push("\t\tif (!success) this.position = startPosition;"); //if consumption fails
        compiledConsumer.push("\t\treturn success;"); //if consumption fails
        compiledConsumer.push('\t}\n');
        return compiledConsumer;
    };
    Compiler.prototype.doNoneOrMore = function (code) {
        return "(()=>{let startPosition = this.position; while(" + code + "){}; return true})()";
    };
    Compiler.prototype.doOnceOrMore = function (code) {
        return "(()=>{let startPosition = this.position; if (!" + code + ") {this.position = startPosition; return false;} while (" + code + ") {} return true;})()";
    };
    Compiler.prototype.doNoneOrOnce = function (code) {
        return "(" + code + " || true)";
    };
    Compiler.prototype.excludeFrom = function (code, excludes) {
        return "(" + code + "&& !" + excludes + ")";
    };
    Compiler.prototype.createAlternator = function (alternator) {
        var compiledAlternator = "";
        if (alternator.type != NodeType.Alternation)
            throw "huhhh";
        if (alternator.children.length == 1)
            return this.createConcatenator(alternator.children[0]);
        for (var i = 0; i < alternator.children.length; i++) {
            compiledAlternator += "(" + this.createConcatenator(alternator.children[i]) + ")";
            if (i + 1 < alternator.children.length) {
                compiledAlternator += " || ";
            }
        }
        return compiledAlternator;
    };
    Compiler.prototype.createConcatenator = function (concatenator) {
        var compiledConcatenator = "";
        if (concatenator.type != NodeType.Concatenation)
            throw "expected concatenator...";
        if (concatenator.children.length == 1)
            return this.createFactor(concatenator.children[0]);
        for (var i = 0; i < concatenator.children.length; i++) {
            compiledConcatenator += this.createFactor(concatenator.children[i]);
            if (i + 1 < concatenator.children.length) {
                compiledConcatenator += " && ";
            }
        }
        return compiledConcatenator;
    };
    Compiler.prototype.createFactor = function (factor) {
        var compiledFactor = "";
        if (factor.type != NodeType.Factor)
            throw "expected factor...";
        if (!factor.value) { //no operaton to be performed
            compiledFactor += this.createTerm(factor.children[0]);
        }
        else if (factor.value == "*") {
            compiledFactor += this.doNoneOrMore(this.createTerm(factor.children[0]));
        }
        else if (factor.value == "+") {
            compiledFactor += this.doOnceOrMore(this.createTerm(factor.children[0]));
        }
        else if (factor.value == "?") {
            compiledFactor += this.doNoneOrOnce(this.createTerm(factor.children[0]));
        }
        else if (factor.value == "-") {
            compiledFactor += this.excludeFrom(this.createTerm(factor.children[0]), this.createTerm(factor.children[1]));
        }
        else {
            throw "unknown factor ".concat(factor.value);
        }
        return compiledFactor;
    };
    Compiler.prototype.createTerm = function (term) {
        var compiledTerm = "";
        if (term.value == "identifier") {
            compiledTerm += this.createIdentifier(term.children[0]);
        }
        else if (term.value == "terminal") {
            compiledTerm += this.createTerminal(term.children[0]);
        }
        else if (term.value == "[]") {
            compiledTerm += this.doNoneOrOnce(this.createAlternator(term.children[0]));
        }
        else if (term.value == "()") {
            compiledTerm += "(" + this.createAlternator(term.children[0]) + ")";
        }
        else if (term.value == "{}") {
            compiledTerm += this.doNoneOrMore(this.createAlternator(term.children[0]));
        }
        else {
            throw "unknown term ".concat(term.value);
        }
        return compiledTerm;
    };
    Compiler.prototype.createIdentifier = function (identifier) {
        return "this.consume".concat(identifier.value, "()");
    };
    Compiler.prototype.createTerminal = function (terminal) {
        return "this.consume(".concat(terminal.value, ")");
    };
    Compiler.prototype.compile = function () {
        var compileString = '';
        compileString += this.createEnums();
        compileString += this.createParser();
        return compileString;
    };
    Compiler.prototype.compileToFile = function (filePath) {
        fs.writeFileSync(filePath, this.compile(), 'utf8');
    };
    return Compiler;
}());
var filePath = process.argv[2];
var data = fs.readFileSync(filePath, 'utf-8');
var tokenizer = new Tokenizer(data);
var tokens = tokenizer.tokenize();
var parser = new Parser(tokens);
var ast = parser.parse();
var compiler = new Compiler(ast);
var compiled = compiler.compile();
compiler.compileToFile("dist/poopoo.ts");
console.log(tokens);
console.log(JSON.stringify(ast));
console.log(compiled);
