function value(v, meta) {
  return { value: v, meta: meta || {} }
}
module.exports.value = value
module.exports.unresolvedToken = v => value(v, { desc: 'unresolved token', token: true, unresolved: true })
module.exports.function = (name, aliases, fn) => {
  if (typeof aliases == 'function')
    return value(aliases, { desc: 'function method', name: name })
  return value(fn, { desc: 'function method', aka: aliases, name: name })
}