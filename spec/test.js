var configs = require('./configs.js'),
    prom = require('../lib/promiscuous');
function test (name) {
    console.log('[Testing ' + name + ']');
    process.on('uncaughtException',function(e) {
        //Got additional debugging
        //console.log("Caught unhandled exception: " + e);
        //console.log(" ---> : " + e.stack);
    });

    var _ = function () {},
        asyncError = function (done) {
            return function () {
                done();
                throw new Error(done.message);
                expect(true).toBe(false);
            }
        },
        pSync = function (val, time, fail) {
            return prom(function (fulfill, reject) {
                setTimeout(function () {
                    if (fail === true) {
                        reject(val);
                    } else {
                        fulfill(val);
                    }
                }, time);
            });
        };

    prom._unconfig();
    describe("Configuration", function () {
        it("No config throws error", function () {
            try {
                prom(_);
            } catch (e) {
                expect(e.message).toBe('No promise implementation has been provided.');
            }
        });

        prom.config(configs[name]);

        it("Returns a thenable", function () {
            expect(typeof prom(_).then).toBe('function');
        });
    });


    describe("Promise facade", function() {
        it("Thenable returned from factory", function() {
            expect(typeof prom(_).then).toBe('function');
        });
        it("Passes correct fulfill value", function (done) {
            prom(function (fulfill) {
                fulfill(1234);
            }).then(function (data) {
                expect(data).toBe(1234);
                done();
            }, asyncError);
        });
        it("Passes correct reject value", function (done) {
            prom(function (_, reject) {
                reject('error');
            }).then(asyncError, function (msg) {
                expect(msg).toBe('error');
                done();
            });
        });
        it("Swallows exceptions", function (done) {
            prom(function (_, reject) {
                throw new Error('error');
            }).then(asyncError, function (msg) {
                expect(msg.message).toBe('error');
                done();
            });
        });
    });


    describe("Bind", function() {
        var bindable = function (x, y, c) {
                setTimeout(function () {
                    c(null, x + y);
                }, 0);
            },
            bound = prom.bind(bindable),
            dualitiable = function (x, y, s, f) {
                setTimeout(function () {
                    s(x + y);
                }, 0);
            },
            dualbound = prom.bind(dualitiable, null, 'duality');
        it("bindable works as epxected", function (done) {
            bindable(1, 2, function (err, val) {
                expect(val).toBe(3);
                done();
            });
        });
        it("Returns a function", function() {
            expect(typeof bound).toBe('function');
        });
        it("Returns a thenable", function() {
            expect(typeof bound(1, 2).then).toBe('function');
        });
        it("default correct fulfill value", function (done) {
            bound(1, 4).then(function (data) {
                expect(data).toBe(5);
                done();
            }, asyncError);
        });
        it("duality correct fulfill value", function (done) {
            dualbound(1, 6).then(function (data) {
                expect(data).toBe(7);
                done();
            }, asyncError);
        });
        it("Passes correct reject value", function (done) {
            var bindable = function (x, y, c) {
                    setTimeout(function () {
                        c('error!', x + y);
                    }, 0);
                },
                bound = prom.bind(bindable);
            bound(1, 2).then(asyncError, function (msg) {
                expect(msg).toBe('error!');
                done();
            });
        });
    });


    describe("BindModule", function() {
        var module = {
                node: function (x, y, c) {
                    setTimeout(function () {
                        c(null, x + y);
                    }, 0);
                },
                duality: function (x, y, s, f) {
                    setTimeout(function () {
                        s(x + y);
                    }, 0);
                }
            },
            boundModule = prom.bindModule(module, 'node', {name: 'duality', callbackStyle: 'duality'});
        it("Returns a function", function() {
            expect(typeof boundModule.node).toBe('function');
            expect(typeof boundModule.duality).toBe('function');
        });
        it("Returns a thenable", function() {
            expect(typeof boundModule.node(1, 2).then).toBe('function');
            expect(typeof boundModule.duality(1, 2).then).toBe('function');
        });
        it("default correct fulfill value", function (done) {
            boundModule.node(1, 4).then(function (data) {
                expect(data).toBe(5);
                done();
            }, asyncError);
        });
        it("duality correct fulfill value", function (done) {
            boundModule.duality(1, 6).then(function (data) {
                expect(data).toBe(7);
                done();
            }, asyncError);
        });
    });


    describe("All", function() {
        
        it("Returns thenable", function() {
            expect(typeof prom.all([prom(_)]).then).toBe('function');
        });
        it("Passes correct fulfill data", function (done) {
            prom.all([
                pSync(1, 2),
                pSync(2, 6),
                pSync(3, 3),
                4
            ]).then(function (data) {
                expect(data).toEqual([[1], [2], [3], [4]]);
                done();
            }, asyncError(done));
        });
        it("Passes correct reject value", function (done) {
            prom.all([
                pSync(1, 1),
                pSync(2, 4),
                pSync('error', 2, true)
            ]).then(asyncError(done), function (msg) {
                expect(msg).toBe('error');
                done();
            });
        });
    });


    describe("Join", function() {
        
        it("Returns thenable", function() {
            expect(typeof prom.join(prom(_)).then).toBe('function');
        });
        it("Passes correct fulfill data", function (done) {
            prom.join(
                pSync(1, 2),
                pSync(2, 6),
                pSync(3, 3)
            ).then(function (data) {
                expect(data).toEqual([[1], [2], [3]]);
                done();
            }, asyncError(done));
        });
        it("Passes correct reject value", function (done) {
            prom.join(
                pSync(1, 1),
                pSync(2, 4),
                pSync('error', 2, true)
            ).then(asyncError(done), function (msg) {
                expect(msg).toBe('error');
                done();
            });
        });
    });


    describe("Any", function() {
        it("Returns thenable", function() {
            expect(typeof prom.any([prom(_)]).then).toBe('function');
        });
        it("Passes correct fulfill data", function (done) {
            prom.any([
                pSync(1, 100),
                pSync(2, 6),
                pSync(3, 50)
            ]).then(function (data) {
                expect(data).toBe(2);
                done();
            }, asyncError(done));
        });
        it("Doesn't reject unless all items reject", function (done) {
            prom.any([
                pSync(1, 50),
                pSync(2, 10),
                pSync('error', 2, true)
            ]).then(asyncError(done), function (data) {
                expect(data).toBe(2);
                done();
            });
        });
        it("Passes correct reject value", function (done) {
            prom.any([
                pSync('oh no!', 1, true),
                pSync('dear lord!', 4, true),
                pSync('error', 2, true)
            ]).then(asyncError(done), function (msg) {
                expect(msg).toEqual([['oh no!'], ['dear lord!'], ['error']]);
                done();
            });
        });
    });


    describe('Sequence', function () {
        
        it("Returns thenable", function() {
            expect(typeof prom.sequence([function () {
                return prom(_);
            }]).then).toBe('function');
        });
        it("Applies additional arguments to functions", function (done) {
            prom.sequence([
                function (_1, _2, _3, _4) {
                    return prom(function () {
                        expect([_1, _2, _3, _4]).toEqual([1, 2, 3, 4]);
                        done();
                    });
                },
                function (_1, _2, _3, _4) {
                    return prom(function () {
                        expect([_1, _2, _3, _4]).toEqual([1, 2, 3, 4]);
                        done();
                    });
                }
            ], 1, 2, 3, 4);
        });
        it("Passes correct fulfill data", function (done) {
            prom.sequence([
                pSync,
                pSync,
                pSync
            ], 1, 2).then(function (data) {
                expect(data).toEqual([[1], [1], [1]]);
                done();
            }, asyncError(done));
        });
        it("Passes correct reject value", function (done) {
            var promise = prom.sequence([
                pSync,
                function (val, oval) {
                    throw new Error('error');
                },
                pSync,
            ], 1, 2).then(asyncError(done), function (msg) {
                expect(msg.message).toBe('error');
                done();
            });
        });
    });

    describe('Pipeline', function () {
        var increment = function (val) {
                return prom(function (fulfill) {
                    setTimeout(function () {
                        fulfill(val + 1);
                    }, 1);
                });
            };
        it("Returns thenable", function() {
            expect(typeof prom.pipeline([function () {
                return prom(_);
            }], 1).then).toBe('function');
        });
        it("Applies additional arguments to functions", function (done) {
            prom.pipeline([
                function (_1, _2, _3, _4) {
                    return prom(function () {
                        expect([_1, _2, _3, _4]).toEqual([1, 2, 3, 4]);
                        done();
                    });
                },
                function (_1, _2, _3, _4) {
                    return prom(function () {
                        expect([_1, _2, _3, _4]).toEqual([1, 2, 3, 4]);
                        done();
                    });
                }
            ], 1, 2, 3, 4);
        });
        it("Passes correct fulfill data", function (done) {
            prom.pipeline([
                increment,
                increment,
                increment,
                increment
            ], 0).then(function (data) {
                expect(data).toBe(4);
                done();
            }, asyncError(done));
        });
        it("Passes correct reject value", function (done) {
            prom.pipeline([
                increment,
                function (val, oval) {
                    throw new Error('error');
                },
                increment,
                increment
            ], 0).then(asyncError(done), function (msg) {
                expect(msg.message).toBe('error');
                done();
            });
        });
    });


    describe("Timeout", function() {
        
        it("Returns thenable", function() {
            expect(typeof prom.timeout(100, prom(_)).then).toBe('function');
        });
        it("Passes correct fulfill data", function (done) {
            prom.timeout(10, pSync(1, 2)).then(function (data) {
                expect(data).toBe(1);
                done();
            }, asyncError(done));
        });
        it("Passes correct reject value", function (done) {
            prom.timeout(100, pSync('error', 2, true))
                .then(asyncError(done), function (msg) {
                    expect(msg).toBe('error');
                    done();
                });
        });
        it("Rejects when time has elapsed", function (done) {
            prom.timeout(1, pSync('error', 100, true))
                .then(asyncError(done), function (msg) {
                    expect(msg).toBe('Timed Out.');
                    done();
                });
        });
    });


    describe("Forever", function() {
        var error = function () {
                return prom(function (_, reject) {
                    reject('error');
                });
            };
        it("Returns thenable", function() {
            expect(typeof prom.forever(error).then).toBe('function');
        });
        it("Arguments are fed to the function", function (done) {
            prom.forever(function (_1, _2) {
                expect([_1, _2]).toEqual([10, 12]);
                return prom(function (_, reject) {
                    reject('foo');
                    done();
                });
            }, 10, 12);
        });
        it("Repeats until rejection is encountered", function (done) {
            var foo = 0;
            prom.forever(function (i) {
                return prom(function (fulfill) {
                    foo += 1;
                    if (foo == 10) {
                        throw new Error('error');
                    }
                    fulfill(foo);
                });
            }).then(asyncError(done), function (msg) {
                expect(msg.message).toBe('error');
                done();
            });
        });
    });


    describe("ForeverPipe", function() {
        var error = function () {
                return prom(function (_, reject) {
                    reject('error');
                });
            };
        it("Returns thenable", function() {
            expect(typeof prom.forever(error).then).toBe('function');
        });
        it("Arguments are fed to the function", function (done) {
            prom.forever(function (_1, _2) {
                expect([_1, _2]).toEqual([10, 12]);
                return prom(function (_, reject) {
                    reject('foo');
                    done();
                });
            }, 10, 12);
        });
        it("Repeats until rejection is encountered and values are piped", function (done) {
            var foo = 0;
            prom.foreverPipe(function (i) {
                return prom(function (fulfill) {
                    i += 1;
                    if (i == 10) {
                        throw new Error('error');
                    }
                    fulfill(i);
                });
            }, foo).then(asyncError(done), function (msg) {
                expect(msg.message).toBe('error');
                done();
            });
        });
    });
}

module.exports = test;
