# slang v1

Concatenative stack-based search language (turing complete queries).

Slang is an interpretted programming language.
It is concatenative & stack-based, making it similar to Forth.

Slang is a meta-programming language.
Its purpose is to
 1. Construct datasets by composing producers, filters, reducers, and ranking functions
 2. Flow the datasets into external programs/functions

The majority of Slang's actual operators are external programs/functions,
and the language itself has very few features.

Slang's key feature is its stack, which operators manipulate in the following ways:

 1. Producing: adding new data to the stack
 2. Filtering: removing data from the stack
 3. Reducing: a combination of filtering and producing
 4. Ranking: reordering the stack

Slang also supports variables, which are just operators defined at runtime by other operators.
Variables can store values or operators; in the latter case, the variable is effectively a method.

## syntax

Slang has only one syntactic feature, which is the quote (`'` or `"`).
The rules are, slang statements are comprised of whitespace-separated tokens.
Tokens that have spaces in them must be quoted -- therefore, `"foo bar"` is one token.

Slang is not case-sensitive.

## interpretation

Slang attempts to map each token to a known operator.
If it fails to do so, the token is added to the stack with the `UnresolvedToken` meta-templates.

## metadata and meta-templates

Slang doesn't have types; it has metadata.
Metadata is KV map of arbitrary information; there are no builtin attributes.
Every value in the stack possesses a metadata map.

Operations against the stack are typically against this metadata.

Meta-templates are metadata-map-generators.
They are similar to classes in OO, but more loosely-defined.
They take in a value, and produce a metdata-map for the value.

## operators and language

Every slang program has its own "language" of operators.
This is a set of variables which map to values, external functions, or slang-defined statements.

There are no builtin operators, but there are standard languages.
This is because slang is meant to be embedded in many environments (typically applications).
Therefore the application supplies its own language.

The common language includes:
 - `define` set new variables.
 - `execute` iterate all values on the stack and run any methods present.
 - `{` an alias to `"start subquery"`
 - `"start subquery"` a token which is commonly used by other functions to stop searching up the stack. Effectively, it creates a new fresh stack.
 - `}` an alias to `"end subquery"`
 - `"end subquery"` a complement to `"start subquery"`, removes all items from the stack up to (and including) the most recent `"start subquery"`.

## fuzzy matching

Slang's best (and probably also worst) premise is that it doesn't require precise matching of tokens to operators.
All tokens are run through a stemmer, and partial matches are considered valid.

In addition to this, some producer-operators exist only to add aliases to words.
For instance, `define` might go through the `"common slang aliases"` operator and end up mapped to `define`, `set`, `save`, and `store`.

To make this work, queries will use multiple overlapping criteria for a query, and/or special external functions which can impose hard criteria.
Very specific metadata filters can improve precision even further.

