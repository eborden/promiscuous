/* ***************
 *****************
 ** promiscuous **
 *****************
 ***************/

//Default configurations
var config,
    defaultConfig = {
        promise: null,
        callbackStyles: {
            //Generic node style callback function generator
            node: function (fulfill, reject) {
                return function (err, value) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(value);
                    }
                }
            },
            duality: function (fulfill, reject) {
                return [
                    function () {
                        fulfill.apply(this, arguments);
                    },
                    function () {
                        reject.apply(this, arguments);
                    }
                ];
            }
        }
    };

function setDefaults () {
    config = JSON.parse(JSON.stringify(defaultConfig));
    //Could be replaced with an extend call
    for (var style in defaultConfig.callbackStyles) {
        if (defaultConfig.callbackStyles.hasOwnProperty(style)) {
            config.callbackStyles[style] = defaultConfig.callbackStyles[style];
        }
    }
}

//Pull in the user configuration and apply it to defaults
function configure (conf) {
    if (!config) {
        setDefaults();
    }
    config.promise = conf.promise;
    //Could be replaced with an extend call
    for (var style in conf.callbackStyles) {
        if (conf.callbackStyles.hasOwnProperty(style)) {
            config.callbackStyles[style] = conf.callbackStyles[style];
        }
    }
}


//Utilities
function toArray (a) {
    return Array.prototype.slice.call(a, 0);
}
function cleanArray (actual) {
    var newArray = new Array();
    for(var i = 0; i<actual.length; i++){
        if (actual[i]){
            newArray.push(actual[i]);
        }
    }
    return newArray;
}
function last (a) {
    return a[a.length - 1];
}
function promiseFactory (action) {
    if (typeof config.promise !== 'function') {
        throw Error('No promise implementation has been provided.');
    }
    //replace itself so error checking only occurs once.
    promiseFactory = function (action) {
        var fulfill,
        reject,
        promise = config.promise(function (f, r) {
            fulfill = f;
            reject = r;
        });
        try {
            action(fulfill, reject);
        } catch (e) {
            reject(e);
        }
        return promise;
    }
    promiseFactory(action);
}
function extend (obj, extendor) {
    for (var name in extendor) {
        if (extendor.hasOwnProperty(name)) {
            obj[name] = extendor[name];
        }
    }
}


//Pull the specified callback style from the config
function determineCallbackStyle (callbackStyle) {
    if (!callbackStyle) {
        return config.callbackStyles.node;
    } else {
        return config.callbackStyles[callbackStyle];
    }
}

//Append callbacks to arguments array
function appendCallbacks (callbacks, args, argLength) {
    if (Array.isArray(callbacks)) {
        callbacks.reduceRight(function (acc, c) {
            return acc.push(c), acc;
        }, []).forEach(function (c, i) {
            args[argLength - i] = c;
        });
    } else {
        args[argLength] = callbacks;
    }
    return args;
}

//Create a new promisified function from a continuous passing style function
function bind (fn, argLength, callbackStyle) {
    var callback;
    if (typeof fn !== 'function') {
        throw Error('First argument must be a function.');
    }
    //Determine argument length
    if (!argLength) {
        argLength = fn.length - 1;
    }
    
    callback = determineCallbackStyle(callbackStyle);
    
    //Return caller function
    return function () {
        var args = Array.prototype.slice.call(arguments);
        return promiseFactory(function (fulfill, reject) {
            fn.apply(null, appendCallbacks(callback(fulfill, reject), args, argLength));
        });
    };
}

//Convert a modules functions to promises
//module, ...methods
function bindModule () {
    var methods = toArray(arguments),
        module = methods.shift();
    if (!module) {
        throw Error('No module provided.');
    }
    if (!methods.length) {
        throw Error('No methods have been supplied.');
    }
    methods.forEach(function (method) {
        if (typeof method === 'string') {
            module[method] = bind(module[method]);
        } else if (Array.isArray(method)) {
            method[0] = module[method[0]];
            module[method[0]] = bind.apply(null, method);
        } else if (typeof method === 'object') {
            module[method.name] = bind(module[method.name], method.argLength, method.callbackStyle);
        } else {
            throw Error('Unkown argument type supplied.');
        }
    });
    return module;
}


//Fulfill when all promises in passed array are fulfilled
//All values are returned as an array on completion.
function all (promiseCollection) {
    var l = promiseCollection.length,
        fulfill,
        reject,
        promise = promiseFactory(function (f, r) {
            fulfill = f;
            reject = r;
        }),
        fulfilledState = [],
        fulfilledValues = [],
        fulfiller = function (i) {
            return function () {
                fulfilledValues[i] = toArray(arguments);
                fulfilledState[i] = true;
                //Check if all promises have been fulfilled
                if (cleanArray(fulfilledState).length == l ) {
                    fulfill(fulfilledValues);
                }
            };
        };
    promiseCollection.forEach(function (p, i) {
        p.then(fulfiller(i), reject);
    });
    
    return promise;
}

//Fulfill when all passed promises are fulfilled
//All values are returned as an array on completion.
function join () {
    return all(toArray(arguments));
}


//Fulfill when any promises in passed array is fulfilled
//Only reject when all promises have been rejected
function any (promiseCollection) {
    var l = promiseCollection.length,
        reject,
        rejectionValues = [],
        rejectionState = [],
        rejector = function (i) {
            return function () {
                rejectionValues[i] = toArray(arguments);
                rejectionState[i] = true;

                //Check if all promises have rejected
                if (cleanArray(rejectionState).length == l) {
                    reject(rejectionValues);
                }
            };
        };
    return promiseFactory(function (f, r) {
        reject = r;
        promiseCollection.forEach(function (p, i) {
            p.then(f, rejector(i));
        });
    });
}


//Run all tasks with the provided arguments. Each tasks fires after completion of the last.
//All values are returned as an array on completion of the last task.
function sequence () {
    var args = toArray(arguments),
        tasks = args.shift(),
        firstTask = tasks.shift(),
        //Return last promise in sequence chain.
        values = tasks.reduce(function (accumulator, task, i) {
                accumulator.push(last(accumulator).then(function () {
                    accumulator[i] = toArray(arguments);
                    var val = task.apply(task, args);
                    return val;
                }));
                return accumulator;
            }, [firstTask.apply(firstTask, args)]);
    return last(values).then(function () {
        values[values.length - 1] = toArray(arguments);
        return values;
    });
}


//Order promises so their results feed in to each other. The final result is returned.
function pipeline () {
    var args = toArray(arguments),
        tasks = args.shift(),
        firstTask = tasks.shift();
    return tasks.reduce(function (promise, task) {
        return promise.then(function () {
            return task.apply(task, arguments);
        });
    }, firstTask.apply(firstTask, args))
}


//Reject a task if it does not return within a specified time period.
function timeout (time, promise) {
    return promiseFactory(function (fulfill, reject) {
        var timer = setTimeout(function () {
            reject('Timed Out.');
        }, time);
        return promise.then(function () {
            clearTimeout(timer);
            return fulfill.apply(this, arguments);
        }, reject);
    });
}


//Repeat function sequentially forever unless it is rejected. Additionaly arguments are passed to the function.
function forever () {
    var args = toArray(arguments),
        func = args.shift(),
        reject,
        promise = promiseFactory(function (_, r) {
            reject = r;
        }),
        rejector = function () {
            reject.apply(null, arguments);
        },
        recurse = function () {
            try {
                return func.apply(null, args).then(recurse, rejector);
            } catch (e) {
                rejector(e);
            }
        };
    recurse.apply(null, args);
    return promise;
}


//Repeat function sequentially forever unless it is rejected. Additionaly arguments are passed to the function.
//Returned values are piped to the next function call
function foreverPipe () {
    var args = toArray(arguments),
        func = args.shift(),
        reject,
        promise = promiseFactory(function (_, r) {
            reject = r;
        }),
        rejector = function () {
            reject.apply(null, arguments);
        },
        recurse = function () {
            try {
                return func.apply(null, arguments).then(recurse, rejector);
            } catch (e) {
                rejector(e);
            }
        };
    recurse.apply(null, args);
    return promise;
}

function publicFunction (async) {
    return promiseFactory.call(null, async);
}
extend(publicFunction, {
    bind: bind,
    bindModule: bindModule,
    all: all,
    any: any,
    join: join,
    pipeline: pipeline,
    sequence: sequence,
    timeout: timeout,
    forever: forever,
    foreverPipe: foreverPipe,
    config: configure,
    _unconfig: setDefaults
});

module.exports = publicFunction;
