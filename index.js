'use strict'

class Stack {
  constructor(initialValues) {
    this.values = initialValues || []
  }

  executeToken(token, cb) {
    // default action: add to stack
    this.values.push(token)
    cb()
  }
}

// the world's simplest parser:
const parse = str => str.split(/\s/g).filter(Boolean)

// the world's simplest interpreter
// - iterate the tokens, pass them to the stack for execution
const interpret = (str, initialValues, done) => {
  const tokens = parse(str)
  let stack = new Stack(initialValues)

  let currentTokenIndex = 0
  const nextToken = (tokenIndex) => {
    if (tokenIndex >= tokens.length)
      return done(null, stack)
    stack.executeToken(tokens[tokenIndex], err => {
      if (err)
        return done(err) // TODO is this best?
      nextToken(tokenIndex + 1)
    })
  }
  nextToken(0)
}

module.exports = interpret
if (!module.parent)
  interpret(
    require('fs').readFileSync('/dev/stdin').toString(),
    require('./standard-language'),
    console.log
  )