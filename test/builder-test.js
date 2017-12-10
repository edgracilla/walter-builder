'use strict'

require('./test-model')()
const Builder = require('../index')
const mongoose = require('mongoose')

let options = {
  uuid: true,
  arrStrict: false,
  model: mongoose.model('TestModel'),
}

let extraRules = [
  ['schemaObjArr.*.foo', 'isUUID', [4]],
  ['schemaObjArr.*.foo', 'isEmail'],
  ['schemaObjArr.*.bar', 'unique', ['aa', 'bb']]
]
  
let builder = new Builder(options)
let schema = builder
  // .pickByLoc({query: ['_id'], params: ['email']})
  // .select(['_id', 'enums', 'ref'])
  // .location('body')
  // .addRules(extraRules)
  // .exclude(['schemaObjArrSchemaObj.*.foo'])
  // .addRule('email', 'unique', ['aa', 'bb'])
  // .addRule('schemaObjArrSchemaObj.*.foo.bar', 'unique', ['aa', 'bb'])
  // .unstrict(['arrObj.*', 'schemaObjArr.*'])

  // TODO: add .new() function to completely create new validation schema, this can be helpful with addRule for custom schema creation ignoring mongoose db
  // TODO: pickByLoc 'arrObj.*' instead of arrObj.*.foo
  // TODO: pickByLoc support string object value for string || array of string
  .pickByLoc({query: ['arrObj.*']}) // !!

  .select(['_id', 'arrObj.*'])
  .build()

console.log('\n--schema', schema)
console.log('\nOUTPUT:', JSON.stringify(schema))