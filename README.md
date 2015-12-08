# slang v1

Slang is an interpretted programming language.
It is concatenative & stack-oriented, making it similar to Forth and PostScript.
(If you're not familiar with stack-oriented languages, take a moment to [read this wiki article](https://en.wikipedia.org/wiki/Stack-oriented_programming_language).)

Slang is a meta-programming language that focuses on user ergonomics.
Its purpose is to simplify program operation and dataset construction.
The interpretter is embedded in host programs which expose runnable APIs.

Slang's key feature is a searchable stack, which operators manipulate by mutation, filtering, and reordering.
Values carry metadata for queries, and the builtin operators use stemming and term-relevance to allow inexact code-statements.

Not yet stable.

## mechanics

```
-- each statement is comprised of space-separated tokens
-- the types of tokens are:
-- operators   start with `/`
-- comments    start with `--` and end with `\n`
-- strings     all other tokens. Strings can include spaces by surrounding them in double-quotes (`"`) ...
--             ... or curly brackets(`{` and `}`). The curly-brackets allow nesting of strings.

-- example strings tokens:
--   foo
--   "foo bar", aka {foo bar}
--   {foo {bar baz}}, aka "foo {bar baz}", aka {foo "bar baz"}

-- all string-tokens are placed on the stack
-- operators consume the string-tokens as parameters, removing them from the stack

-- a common operator is /find, which filters and orders by term-relevance
-- any string-tokens on the stack will be removed, and the query-results will be left in their place
-- eg. find alice's computer on the network
peer alice /find

-- to see the result, we can use /log, which outputs the current stack in the host environment
peer alice /find /log

-- thanks to stemming, slang can tolerate a typo:
peer alic /find /log
```

Note, for the statement above to have any output, the stack would have to be pre-populated with at least one item that matches `peer alice`.
This is expected; the host environment should prepopulate the stack with items which the user should manipulate with slang.

```
-- the /open operator looks for all 'data-sources' on the stack, and calls them ...
-- ... adding their output to the top of the stack
peer alice /find /open
```

What a stack-item "is" depends on its `isa` metavalue.
This is discussed more later.

```
-- multiple operations can be strung together, each operating on the output stack of the last
-- this is where the '/find /open' pattern becomes useful
-- eg. search alice's computer for bob's birthday-party event
peer alice /find /open events /find /open bob's birthday party /find

-- with indentation, you can string statements across multiple lines
peer alice /find /open
  events /find /open
  bob's birthday party /find

-- each indentation produces a "substack," which builds on the existing stack
-- when de-indented, the substack is cleared and the previous stack is restored
-- eg. print the time and RSVPs of bob's birthday
peer alice /find /open
  events /find /open
  bob's birthday party /find
    time /find /log
  --
    RSVPs /find /log
```

Notice the empty comment between the "time" and "RSVPs" lines.
What matters is the `  \n`, which clears the substack, but the empty comment helps us see that there is a de-indentation.

```
-- the /take operator lets you reduce the stack to the top N results
-- it expects a numeric string to be at the very top of the stack
-- therefore, its signature is 'n /take'
-- eg. log 10 peers
peer /find 10 /take /log
-- eg. log only alice
peer alice /find 1 /take /log 

-- since this is visually awkward, operators support an alternative C-style parameter-syntax
-- this allows you to place stack-inputs *after* the operator, in the following manner:
-- `c b a /operator` => `/operator(a b c)`
-- eg. log only alice
peer alice /find /take(1) /log 

-- the /atmost operator is like /take, but instead of reducing the stack ...
-- ... it *errors* if the stack is larger than the number specified
-- this is good for when a query was too broad, and needs to be refined for the program to continue
-- eg. log only alice, error if there's more than one
peer alice /find /atmost(1) /log

-- the /atleast operator is like /atmost, but it requires the stack to have at least the number given
-- eg. log all alices, error if there's no results
peer alice /find /atleast(1) /log

-- the /only operator is both combined: it requires the stack to have that number exactly
-- eg. log only alice, error if there's not just one result
peer alice /find /only(1) /log
```

Errors pause the execution of the query and call a hook in the host environment.
It's then up to the host to decide how to proceed.
It may halt execution and dump the error & stack, or it could present a UI for refining the current results, and continue execution once `/atmost` is satisfied.

```
-- programs can use the /set operator to provide an error message for the host environment
-- (/set has many more purposes, discussed below)
-- eg. log only alice, error *understandably* if there's not just one
peer alice /find
  "Please select the correct alice" /set(isa "error msg")
  /atmost(1)
  "Alice was not found" /set(isa "error msg")
  /atleast(1)
  /log
```

Remember, the ()-enclosed parameters on operators are just rearrangements.
`"Alice was not found" /set(isa "error msg")` is the same as `"Alice was not found" "error msg" isa /set`.

```
-- the /set operator writes metadata to the 3rd topmost item on the stack
-- its signature is `target value key /set`, but the natural way to use it is `target /set(key value)`
-- metadata is explained in detail in another section of this readme ...
-- ... it is a way for values to carry additional searchable information
-- eg. color some strings
"I'm not feeling very well" /set(color blue)
"I'm mad as hell!" /set(color red)

-- we can use more metadata with our previous error example to get some ordering flexibility\
peer alice /find
  "Alice was not found" /set(isa "error msg") /set(for atleast)
  "Please select the correct alice" /set(isa "error msg") /set(for atmost)
  /atmost(1)
  /atleast(1)
  /log
```

If the error example above is not intuitive, think about what would happen without the `for` metadata values.
If `/atmost` errored, it would do a search for items where `isa == error msg` and take the top match.
Since `"Please select the correct alice"` is at the top of the stack, it would come up first, which is not what we want.

By using more specific data, the search-process for the error message can get better results.
It is defined to search first for `isa == error msg AND for == atleast`, and that will find our atleast-specific error.
If that first search failed, it would fall back to `isa == error`, which is broader and thus more dependent on the stack's order.

```

-- because operators use the metadata to identify targets, /set can be used to define complex behaviors
-- let's use this to create user-defined operators
-- take this verbose example:
-- eg. find bob's email addresses
addressbook /find /only(1) /open
  friends /find /only(1) /open
  bob /find /only(1) /open
  email /find /log

-- we can simplify this with another operator  
-- eg. make convenience methods to make finding emails easier
{/find /only(1) /open} /set(isa operator) /set(name fo1o)
{/find /only(1) /log} /set(isa operator) /set(name fo1l)
addressbook /fo1o
  friends /fo1o
  bob /fo1o
  email /fo1l

-- ideally though, we'd have an operator that was more streamlined
-- something like:
--   addressbook friends bob /log-email
-- to do this, we'll need to use iteration on the input params
-- here's how:
{{/fo1o} /forall(string-token) email /foil} /set(isa operator) /set(name get-email)

-- now we can run any number of email fetches:
addressbook friends bob /log-email
addressbook work alice team project-manager /log-email
```

