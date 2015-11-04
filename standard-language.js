const tmpl = require('./meta-templates')

module.exports = [
  tmpl.function('log-stack', (stack, cb) => { stack.takeUntil(v => v.value === 'start-program').log(); cb() }),
  tmpl.function('reset', (stack, cb) => { stack.set(stack.removeUntil(v => v.value === 'start-program')); cb() }),
  tmpl.function('speak', 'say-something talk', (stack, cb) => { console.log('woof!'); cb() }),
]