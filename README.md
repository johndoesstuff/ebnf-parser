# Typescript EBNF Parser & AST Compiler

This was made as an exercise to help me understand typescript and lexers as well as an introduction to compilers.

To build and run use files in the test directory and run `make SFILE=<Syntax File> PFILE=<File to Parse>`

To run just the parser built from a metasyntax run `make metarun PFILE=<File to Parse>`

## Examples runs:

`make SFILE=math.ebnf PFILE=math.txt`

`make SFILE=ebnf.ebnf PFILE=ebnf.ebnf`

(ebnf parser builds ebnf parser that parses ebnf syntax)

## Technical stuff

The EBNF implementation this uses supports:

`* {}` - Do none or more

`+` - Do once or more

`? []` - Do none or once

`()` - Parentheses

`=` - Rule assignment using `lhs = rhs;`

`|` - Alternation (consume a or b)

`,` - Concatenation (consume a then b)

`-` - Exclusion (consume a unless b)

`'terminal' "terminal"` - Terminals using quotes
