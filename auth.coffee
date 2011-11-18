class NotAuthenticated extends Error
  constructor: (@msg) ->
    super msg

exports.requestAuthentication = (msg, callback) ->
  return (req, resp, next) ->
    if callback req, resp
      next()
    else
      throw new NotAuthenticated msg

exports.anonymousRedirect = (url) ->
  return (err, req, res, next) ->
    console.dir err
    if err instanceof NotAuthenticated
      res.redirect url
    else
      next err
