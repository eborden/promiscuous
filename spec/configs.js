var Q = require('q'),
    when = require('when'),
    vow = require('vow'),
    node = require("node-promise"),
    deferred = require('deferred'),
    rsvp = require('rsvp'),
    laissez = require('laissez-faire');
module.exports = {
    //Q https://github.com/kriskowal/q
    Q: {
        promise: function (resolver) {
            var deferred = Q.defer();
            resolver(deferred.fulfill, deferred.reject);
            return deferred.promise;
        }
    },
    //https://github.com/kriszyp/node-promise
    "node-promise": {
        promise: function (resolver) {
            var defer = node.defer();
            resolver(defer.resolve, defer.reject);
            return defer.promise;
        }
    },
    //When https://github.com/cujojs/when
    when: {
        promise: function (resolver) {
            var deferred = when.defer();
            resolver(deferred.resolve, deferred.reject);
            return deferred.promise;
        }
    },
    //RSVP https://github.com/tildeio/rsvp.js
    rsvp: {
        promise: function (resolver) {
            return new rsvp.Promise(function(fulfill, reject){
                resolver(fulfill, reject);
            });
        }
    },
    //Vow https://github.com/dfilatov/jspromise
    vow: {
        promise: function (resolver) {
            return new vow.Promise(function (fulfill, reject) {
                resolver(fulfill, reject);
            });
        }
    },
    //laissez-faire https://github.com/jkroso/Laissez-faire
    "laissez-faire": {
        promise: function (resolver) {
            return new laissez(function(fulfill, reject){
                resolver(fulfill, reject);
            });
        }
    },
    //Deferred https://github.com/medikoo/deferred
    deferred: {
        promise: function  (resolver) {
            var def = deferred();
            resolver(def.resolve, def.reject);
            return def.promise;
        }
    }
};
