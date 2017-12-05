'use strict'

const mongoose = require('mongoose')

module.exports = () => {
  return new Promise(resolve => {
    let Schema = mongoose.Schema

    let schema = new Schema({
      _id: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        minlength: 10,
        maxlength: 50,
        required: true,
        unique: true,
        index: true,
        trim: true
      },
      enums: {
        type: String,
        enum: ['jane', 'jean', 'jhon'],
        default: 'jhon'
      },

      ref: {
        type: String,
        ref: `Demo1`,
        required: true,
        trim: true
      },
      arrRef: [{
        type: String,
        ref: `Demo2`,
        trim: true
      }],

      arr: [{
        type: String,
        required: true
      }],
      obj: {
        foo: {
          type: String,
          required: true
        },
        bar: {
          type: String,
          required: true
        },
      },
      arrObj: [{
        foo: {
          type: String,
          ref: `Foo`,
          trim: true
        },
        status: {
          type: String,
          enum: ['pending', 'scheduled', 'accomplished'],
          default: 'pending'
        }
      }],

      arrDeep: [{
        foo: [{
          type: String,
          ref: `Foo`,
          trim: true
        }]
      }],

      arrObjDeep: [{
        foo: [{
          bar: {
            type: String,
            required: true,
            trim: true
          }
        }]
      }],

      schemaObj: new Schema({
        title: {
          type: String,
          required: true,
          trim: true
        },
        content: {
          type: String,
          required: true,
          maxlength: 10,
          trim: true
        }
      }, {_id: false}),

      schemaObjArr: [new Schema({
        title: {
          type: String,
          required: true,
          trim: true
        },
        content: {
          type: String,
          required: true,
          maxlength: 10,
          trim: true
        }
      }, {_id: false})]
    })

    mongoose.model(`TestModel`, schema, 'testmodel')
    resolve()
  })
}
