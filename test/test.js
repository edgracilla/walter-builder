'use strict'

require('./test-model')()
const Builder = require('../index')
const mongoose = require('mongoose')

let options = {
  uuid: true,
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
  .exclude(['schemaObjArrSchemaObj'])
  .addRules(extraRules)
  // .addRule('email', 'unique', ['aa', 'bb'])
  // .addRule('schemaObjArrSchemaObj.*.foo.bar', 'unique', ['aa', 'bb'])
  .build()

console.log('\n--schema', schema)
console.log('\nOUTPUT:', JSON.stringify(schema))