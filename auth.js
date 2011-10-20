var util = require('util');

function NotAuthenticated(msg) {
  Error.call(this, msg);
}
util.inherits(NotAuthenticated, Error);

exports.requestAuthentication = function(msg, callback) {
  return function(req, resp, next){
    if (callback(req, resp)) {
      next();
    } else {
      throw new NotAuthenticated(msg);
    }
  }
};

exports.anonymousRedirect = function(url) {
  return function(err, req, res, next) {
    if (err instanceof NotAuthenticated) {
      res.redirect(url);
    } else {
      next(err);
    }
  }
}
