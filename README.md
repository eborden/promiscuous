# Promiscuous
### Don't Marry Your Promises

Promiscuous is a promise agnostic tool belt for Promises/A+. Promiscuous allows you to decouple your tools from your implementation. Become part of the free promises movement.

-Peace, Love and JavaScript

[View on NPM](https://npmjs.org/package/promiscuous-tool)

## Why
Promises/A+ allows varied promise implementations to interact with each other. When.js may accept Q promises or any other complying implementation. This frees developers from worrying about what promise implementation their modules employ. However, many promise implementations provide additional tools for coordinating and working with promises. By using these tools we create deep dependencies on our promise implementation, essentially marrying our promises.

Why shouldn't we marry our promises? The fastest promise implementation today could be the slowest implementation tomorrow. If you marry your implementation you are stuck with it. Changing from promise implementation A to promise implementation B will incur timely expensive refactoring. Promiscuous shields you from this dangerous situation.

##Using Promiscuous

Simply include promiscuous in your bootstrap file. Configure it with your promise implementation and enjoy.

```
promiscuous.config({
    promise: function (resolver) {
        var deferred = Q.defer();
        resolver(deferred.fulfill, deferred.reject);
        return deferred.promise;
    }
});
```

For more configuration options check out [config's api](#promiscuousconfig).

## API

- [config](#promiscuousconfig)
- [bind](#promiscuousbind)
- [bindModule](#promiscuousbindmodule)
- [map](#promiscuousmap)
- [all](#promiscuousall)
- [any](#promiscuousany)
- [join](#promiscuousjoin)
- [pipeline](#promiscuouspipeline)
- [sequence](#promiscuoussequence)
- [timeout](#promiscuoustimeout)
- [forever](#promiscuousforever)
- [foreverPipe](#promiscuousforeverpipe)

### promiscuous.config
Promiscuous does require you to use a Promises/A+ implementation, however you can change it any time. Additionally you may define callback styles to be used with bind. Promiscuous comes pre loaded with "node" and "duality" style callbacks.

```
promiscuous.config({
    promise: function (resolver) {
        var deferred = Q.defer();
        resolver(deferred.fulfill, deferred.reject);
        return deferred.promise;
    },
    styles: {
        inverseNode: function (fulfill, reject) {
            return function (value, err) {
                if (err) {
                    reject(err);
                } else {
                    fulfill(value);
                }
            }
        },
        inverseDuality:  function (fulfill, reject) {
            return [
                function () {
                    reject.apply(null, arguments);
                },
                function () {
                    fulfill.apply(null, arguments);
                }
            ];
        },
    }
});
```

More example promise configurations can be found [here](/spec/configs.js).

###promiscuous.bind
(function, length, style)

Bind converts continuation passing style functions into functions that return promises. This is very helpful for converting node functions.

```JavaScript
function nodeLike (foo, bar, callback) {
    //...
	callback(err, data);
}

promiscuous.bind(nodeLike);
promiscuous.bind(nodeLike, 3);
promiscuous.bind(nodeLike, 3, 'node');
```

###promiscuous.bindModule
(module, method, ...)

Convert entire modules into promise returning modules.

```JavaScript
promiseModule = promiscuous.bindModule(
	nodeLikeModule,
	'method1',
	['method2', 3],
	['method3', 3, 'node'],
	{
		name: 'method4',
		style: 'duality'
	});
```

###promiscuous.map
(function, [promise, ...])

Similar to Array.prototype.map, map a function over a collection of promises or values. A single promise is returned containing an array of the resulting promises or values.

```
function add2 (x) {
    return x + 2;
}

promiscuous.map(add2, [
	func1(),
	func2(),
	func3()
]).then(function (data) {
	data[0]; //add2(func1) results
	data[1]; //add2(func2) results
	data[2]; //add2(func3) results
});
```

###promiscuous.all
([promise, ...])

Return a promise that is fulfilled when all promises in the passed array are fulfilled. Returned values are passed as an array on completion.

```
promiscuous.all([
	func1(),
	func2(),
	func3()
]).then(function (data) {
	data[0]; //func1 results
	data[1]; //func2 results
	data[2]; //func3 results
});
```

###promiscuous.any
([promise, ...])

Return a promise that is fulfilled when any of the promises in passed array is fulfilled

```
promiscuous.any([
	func1(), 
	func2(), //fails
	func3() //fulfills first
]).then(function (data) {
	data; //func3 results
});
```

###promiscuous.join
(promise, ...)

Return a promise that is fulfilled when all promises passed are fulfilled. Returned values are passed as an array on completion.

```
promiscuous.join(
	func1(),
	func2(),
	func3()
).then(function (data) {
	data[0]; //func1 results
	data[1]; //func2 results
	data[2]; //func3 results
});
```

###promiscuous.pipeline
([function, ...], arguments, ...)

Invoke functions so their results feed in to each other. The result of the final function is returned.

```
promiscuous.pipeline([
	func1, //invoked with 'foo'
	func2, //invoked with the result of func1
	func3 //invoked with the result of func2
], 'foo').then(function (data) {
	data; //func3 results
});
```

###promiscuous.sequence
([function, ...], arguments, ...)

Invoke all functions with the provided arguments. Each function fires after completion of the last. All values are returned as an array on  fullfillment of the last promise.

```
promiscuous.sequence([
	func1, 
	func2,
	func3
], 'foo', 'bar').then(function (data) {
	data[0]; //func1 results
	data[1]; //func2 results
	data[2]; //func3 results
});
```

###promiscuous.timeout
(milliseconds, promise)

Reject a promise if it does not return within a specified time period.

```
promiscuous.timeout(200, func())
    .then(function (data) {
    	console.log(data);
    }, function (err) {
    	//logs error if func does not complete within 200ms
    	console.log(err);
    });
```

###promiscuous.forever
(function, ...args)

Run a function sequentially until it rejects.

```
promiscuous.forever(func, arg1, arg2)
    .then(null, function (err) {
        //it died
    });
```

###promiscuous.foreverPipe
(function, ...args)

Run a function sequentially until it rejects. Output from the previous run is piped to the next.

```
promiscuous.forever(func, arg1)
    .then(null, function (err) {
        //it died
    });
```
