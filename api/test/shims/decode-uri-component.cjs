'use strict'

/** Jest CJS stand-in for ESM decode-uri-component@0.5.0 (audit override). */
function decodeUriComponent(encodedURI) {
  try {
    return decodeURIComponent(encodedURI)
  } catch {
    return encodedURI
  }
}

module.exports = decodeUriComponent
module.exports.default = decodeUriComponent
