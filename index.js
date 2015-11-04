'use strict'

const stemmer = require('porter-stemmer').stemmer
const tmpl = require('./meta-templates')

const deepCopy = v => JSON.parse(JSON.stringify(v)) // eh, w/e

// stack: the runtime environment
// - maintains, and provides an API to, the stack
// - processes new tokens and executes them, if they're functions
class Stack {
  constructor(initialValues) {
    this.values = initialValues || []
  }

  findValueOnStack(token) {
    // stem the token we're going to search
    const stemmedToken = stemmer(token).toLowerCase()

    // iterate the stack, from most recent to oldest
    for (var i=this.values.length-1; i >= 0; i--) {
      const stackValue = this.values[i]
      // check actual value
      if (matches(stackValue.value))
        return stackValue
      // check everything in meta
      for (var k in stackValue.meta) {
        if (matches(stackValue.meta[k]))
          return stackValue
      }
    }
    function matches (v) {
      // currently checking only string values
      if (typeof v === 'string')
        return stemmer(v).toLowerCase().indexOf(stemmedToken) >= 0
      return false
    }
  }

  slice(start, end) {
    return new Stack(this.values.slice(start, end))
  }

  takeUntil(fn) {
    let newValues = []
    for (var i=this.values.length-1; i >= 0; i--) {
      if (fn(this.values[i]))
        break
      newValues.push(this.values[i])
    }
    return new Stack(newValues)
  }

  removeUntil(fn) {
    for (var i=this.values.length-1; i >= 0; i--) {
      if (fn(this.values[i]))
        return new Stack(this.values.slice(0, i))
    }
    return new Stack([])
  }

  set(values) {
    this.values = values || []
  }

  executeToken(token, cb) {
    const match = this.findValueOnStack(token)
    if (match) {
      // found a value on the stack...
      if (typeof match.value === 'function') {
        // matching value is a function, execute it...
        return match.value(this, err => {
          if (err)
            return cb(err)
          cb()
        })
      } else {
        // matching value is not a function, push it onto the top of the stack
        this.values.push(deepCopy(match))
        return cb()
      }
    } else {
      // default action: add to stack as an unresolved token
      this.values.push(tmpl.unresolvedToken(token))
      return cb()
    }
  }

  log() {
    console.log(this.values)
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
module.exports.interpret = interpret

if (!module.parent) {
  // execute and log
  interpret(
    'start-program '+require('fs').readFileSync('/dev/stdin').toString() + ' log-stack',
    require('./standard-language'),
    (err, stack) => { err && console.log(err) }
  )
}