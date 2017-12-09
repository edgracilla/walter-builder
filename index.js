'use strict'

const _ = require('lodash')
const vsprintf = require('sprintf-js').vsprintf

const ALLOCATIONS = ['params', 'query', 'body', 'headers', 'cookies']

const ERR_MSG = {
  unique: "Expecting unique value in '%1$s' field",
  isUUID: "Value for field '%1$s' must be a valid UUIDv%2$s",
  isEmail: "Value for field '%1$s' must be a valid email address",
  matches: "Can't find match value on enum field '%1$s'. Expecting '%2$s'",
  required: "Value for field '%1$s' is required",
  isLength: "Value for field '%1$s' must have a minimum length of %2$s and maximum length of %3$s characters",
  minlength: "Value for field '%1$s' must be atleast in %2$s character(s).",
  maxlength: "Value for field '%1$s' must not exceed in %2$s character(s).",
}

class WalterBuilder {
  constructor (options) {
    this._mix = null
    this._alloc = null

    this._omit = []
    this._fields = []
    this._addedRules = {}

    this.options = options || {}

    _.defaults(this.options, {
      uuid: false,
      uuidVersion: 5
    })

    let mongooseSchema = _.get(this.options.model, 'schema.obj')
    if (_.isNil(mongooseSchema)) throw new Error('A valid mongoose model is required in walter-builder.')

    let mapSchema = this.crawl(mongooseSchema)
    this.validationSchema = this.translate(mapSchema)
  }

  crawl (schema, parent = '') {
    let map = {}
    
    if (_.isNil(schema)) return {}
    
    Object.keys(schema).forEach(path => {
      map[path] = this.inspect(path, schema[path], parent ? `${parent}.${path}` : path)
      if (_.isNil(map[path])) delete map[path]
    })

    return Object.keys(map).length ? map : {}
  }

  inspect (path, field, absPath = '') {
    if (_.isNil(field)) return null

    let hasType = !_.isNil(field.type) && _.isFunction(field.type)
    let entry = {}

    if (hasType) {
      if (path === 'email') {
        // entry.isEmail = {
        //   msg: vsprintf(ERR_MSG.isEmail, [absPath])
        // }
        Object.assign(entry, this.mapRule(absPath, 'isEmail'))
      }

      if (this.options.uuid && (path === '_id' || !_.isNil(field.ref))) {
        // entry.isUUID = {
        //   options: [this.options.uuidVersion] ,
        //   msg: vsprintf(ERR_MSG.isUUID, [absPath, this.options.uuidVersion])
        // }
        Object.assign(entry, this.mapRule(absPath, 'isUUID', {
          options: [this.options.uuidVersion]
        }))
      }

      if (!_.isNil(field.unique) && field.unique) {
        // entry.unique = {
        //   options: [this.options.model.modelName, path],
        //   msg: vsprintf(ERR_MSG.unique, [absPath])
        // }
        Object.assign(entry, this.mapRule(absPath, 'unique', {
          options: [this.options.model.modelName, path]
        }))
      }
      
      if (!_.isNil(field.required) && field.required) {
        // entry.required = {
        //   msg: vsprintf(ERR_MSG.required, [absPath])
        // }
        Object.assign(entry, this.mapRule(absPath, 'required'))
      } else {
        entry.optional = true
      }

      if ((!_.isNil(field.minlength) && field.minlength > 0) && (!_.isNil(field.maxlength) && field.maxlength > 0)) {
        // entry.isLength = {
        //   options: [{min: field.minlength, max: field.maxlength}],
        //   msg: vsprintf(ERR_MSG.isLength, [absPath, field.minlength, field.maxlength])
        // }
        Object.assign(entry, this.mapRule(absPath, 'isLength', {
          options: [{min: field.minlength, max: field.maxlength}],
          minlength: field.minlength,
          minlength: field.minlength,
          tag: 'isLength'
        }))
      } else {
        if (!_.isNil(field.minlength) && field.minlength > 0) {
          // entry.isLength = {
          //   options: [{min: field.minlength}],
          //   msg: vsprintf(ERR_MSG.minlength, [absPath, field.minlength])
          // }
          Object.assign(entry, this.mapRule(absPath, 'isLength', {
            options: [{min: field.minlength}],
            minlength: field.minlength,
            tag: 'minlength'
          }))
        }
        if (!_.isNil(field.maxlength) && field.maxlength > 0) {
          // entry.isLength = {
          //   options: [{max: field.maxlength}],
          //   msg: vsprintf(ERR_MSG.maxlength, [absPath, field.maxlength])
          // }
          Object.assign(entry, this.mapRule(absPath, 'isLength', {
            options: [{max: field.maxlength}],
            maxlength: field.maxlength,
            tag: 'maxlength'
          }))
        }
      }

      if (!_.isNil(field.enum) && Array.isArray(field.enum) && field.enum.length) {
        // entry.matches = {
        //   options: [`^(${field.enum.join('|')})$`],
        //   msg: vsprintf(ERR_MSG.matches, [absPath, field.enum.join(', ')])
        // }
        Object.assign(entry, this.mapRule(absPath, 'matches', {
          options: [`^(${field.enum.join('|')})$`],
          enums: field.enum.join(', ')
        }))
      }
    } else {
      if (Array.isArray(field)) {
        entry['*'] = this.inspect('*', field[0], `${absPath}.*`)
        if (_.isNil(entry['*'])) delete entry['*']
      } else if (_.isPlainObject(field)) {
        entry = this.crawl(field, absPath)
      } else if (_.isObject(field)) {
        entry = this.crawl(field.obj, absPath || path)
      }
    }

    return (hasType && !_.isEmpty(entry) ? entry : (Object.keys(entry).length ? entry : undefined))
  }

  mapRule (absPath, validationName, misc = {}) {
    let entry = {}

    switch (misc.tag || validationName) {
      case 'required':
        entry.required = {
          msg: vsprintf(ERR_MSG.required, [absPath])
        }; break

      case 'unique':
        entry.unique = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG.unique, [absPath])
        }; break
      
      case 'isEmail':
        entry.isEmail = {
          msg: vsprintf(ERR_MSG.isEmail, [absPath])
        }; break
      
      case 'isUUID':
        if (Array.isArray(misc.options)) {
          misc.options[0] = misc.options[0] || this.options.uuidVersion
        }
        
        entry.isUUID = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG.isUUID, [absPath, misc.options[0] || this.options.uuidVersion])
        }; break
      
      case 'minlength':
        entry.isLength = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG[misc.tag], [absPath, misc.minlength])
        }; break

      case 'maxlength':
        entry.isLength = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG[misc.tag], [absPath, misc.maxlength])
        }; break
      
      case 'isLength':
        entry.isLength = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG.isLength, [absPath, misc.minlength, misc.maxlength])
        }; break

      case 'matches':
        entry.matches = {
          options: misc.options || [],
          msg: vsprintf(ERR_MSG.matches, [absPath, misc.enums])
        }
    }

    return entry
  }

  translate (mapSchema) {
    let validations = {}

    function __remap (key, schemaEntry) {
      let validation = {}

      Object.keys(schemaEntry).forEach(subkey => {
        if (subkey === 'optional' || ERR_MSG[subkey]) {
          if (_.isNil(validation[key])) {
            validation[key] = schemaEntry
          } else {
            Object.assign(validation[key], schemaEntry)
          }
        } else {
          Object.keys(schemaEntry).forEach(subkey => {
            Object.assign(validation, __remap(`${key}.${subkey}`, schemaEntry[subkey]))
          })
        }
      })

      return !_.isEmpty(validation) ? validation : undefined
    }

    Object.keys(mapSchema).forEach(key => {
      Object.assign(validations, __remap(key, mapSchema[key]))
    })

    return validations
  }

  // -- user usable functions

  location (alloc) {
    this._alloc = alloc
    return this
  }

  select (fields) {
    fields = Array.isArray(fields) ? fields : _.isString(fields) ? [fields] : []
    this._fields = this._fields.concat(fields)
    return this
  }

  pickByLoc (options) {
    this._mix = _.isPlainObject(options) ? options : {}
    return this
  }

  exclude (path) {
    path = Array.isArray(path) ? path : _.isString(path) ? [path] : []
    this._omit = this._omit.concat(path)
    return this
  }

  addRule (path, rule, options, misc) {
    if (_.isString(path)) {
      
      let value = {
        rule: rule,
        misc: misc,
        options: Array.isArray(options) ? options : []
      }

      if (_.isNil(this._addedRules[path])) {
        this._addedRules[path] = [value]
      } else {
        this._addedRules[path].push(value)
      }
    }

    return this
  }

  addRules (rules) {
    if (Array.isArray(rules)) {
      rules.forEach(rule => {
        if (Array.isArray(rule) && rule.length > 1) {
          this.addRule(...rule)
        }
      })
    }

    return this
  }

  build () {
    let schema = _.clone(this.validationSchema)
    let pickByLoc = {}

    if (!_.isEmpty(this._omit)) {
      let paths = []
      this._omit = _.uniq(this._omit)

      Object.keys(schema).forEach(path => {
        paths.push(path)
      })

      this._omit.forEach(omitKey => {
        paths.forEach(path => {
          if ((new RegExp(`^${omitKey.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\.`)).test(path)) {
            this._omit.push(path)
          }
        })
      })

      schema = _.omit(schema, this._omit)
    }

    if (!_.isEmpty(this._mix) && _.isPlainObject(this._mix)) {
      Object.keys(this._mix).forEach(alloc => {
        if (ALLOCATIONS.includes(alloc) && Array.isArray(this._mix[alloc])) {
          this._mix[alloc].forEach(field => {
            if (!_.isEmpty(schema[field])) {
              pickByLoc[field] = Object.assign(_.clone(schema[field]), {in: alloc})
            }
          })
        }
      })

      this._mix = null

      if (_.isEmpty(this._fields) && _.isNil(this._alloc)) {
        return pickByLoc
      }
    }

    if (!_.isEmpty(this._fields) && Array.isArray(this._fields)) {
      this._fields = _.uniq(this._fields)
      schema = _.pick(schema, this._fields)
      this._fields = []
    }

    if (ALLOCATIONS.includes(this._alloc)) {
      Object.keys(schema).forEach(path => {
        if (!_.isEmpty(schema[path])) {
          schema[path].in = this._alloc
        }
      })

      this._alloc = null
    }

    schema = Object.assign(schema, pickByLoc)

    if (!_.isEmpty(this._addedRules)) {
      Object.keys(this._addedRules).forEach(rulePath => {
        Object.keys(schema).forEach(path => {
          if (rulePath === path) {
            this._addedRules[rulePath].forEach(entry => {
              if (_.isNil(schema[path][entry.rule])) {
                Object.assign(schema[path], this.mapRule(path, entry.rule, {
                  options: entry.options,
                  misc: entry.misc
                }))
              }
            })
          }
        })
      })
    }

    return schema
  }
}

module.exports = WalterBuilder
