// 2020 for prefixItems
import AJV from 'ajv/dist/2020'
import { log, print } from './logger'

const options  = {
  strict: false,
  discriminator: true,
  useDefaults: true,
  logger: log,
}

export const noncoercing = new AJV(options)
export const coercing = new AJV({...options, coerceTypes: true})

import keywords from 'ajv-keywords'
for (const ajv of [coercing, noncoercing]) {
  keywords(ajv)
}

import betterAjvErrors from 'better-ajv-errors'

type AjvError = { error: string, suggestion: string }

export function validator(schema, ajv): (data: any) => string { // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
  try {
    const ok = ajv.compile(schema)
    return function(data: any): string { // eslint-disable-line prefer-arrow/prefer-arrow-functions
      if (ok(data)) return ''
      return (betterAjvErrors(schema, data, ok.errors, { format: 'js' }) as AjvError[])
        .map((err: AjvError) => err.error + (err.suggestion ? `, ${err.suggestion}` : '')).join('\n')
    }
  }
  catch (err) {
    print(`${err}\n${err.stack}`)
    throw err
  }
}

import { client } from './client'

const jurism = client === 'jurism'
const zotero = !jurism

const zoterovalidator = validator(require('../gen/items/zotero.json'), noncoercing)
const jurismvalidator = validator(require('../gen/items/jurism.json'), noncoercing)
const broken = {
  me: zotero ? zoterovalidator : jurismvalidator,
  other: jurism ? zoterovalidator : jurismvalidator,
}
export function validItem(obj: any, strict?: boolean): string { // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
  const errors = broken.me(obj)
  if (!errors) return ''
  if (!strict && !broken.other(obj)) {
    if (typeof Zotero !== 'undefined') print('Better BibTeX soft error: ' + errors)
    return ''
  }
  // https://ajv.js.org/api.html#validation-errors
  return errors
}
