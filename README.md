fidPromise
==========

[Promise/A+ specification] compliant promises.

Goals
-----

1. Readable.  *I like learning from examples.*
2. Debuggable.  *When there are problems, can I figure out what's going wrong?*
3. Testable.  *All code should be tested.*
4. Simple.  *Extra functionality often makes bugs or the code will become brittle.*
5. Avoid blowing up a call stack.
6. Use it everywhere

That last goal just means that everything runs with its own timeout, so one can not possibly break the code by accidentally chaining a lot of promises together.  If they are all synchronous and fulfill themselves immediately other libraries may recurse too deeply and cause the code to fail.  It's a tiny bit slower, but I'd take reliability over extreme speed.

The module uses [UMD] (Universal Module Definition) to let you use this library in the following areas:

* In the browser, attaching to `window.FidPromise`
* With YUI as FidPromise
* In node.js, AMD, CommonJS, and other methods via the regular module.exports
* With RequireJS in the browser

Quick Usage
-----------

    function somethingAsync() {
        promise = new Promise();
        
        // Do something async and that will call promise.resolve(data) on
        // success, promise.resolve(error) on failure
        return promise;
    }
    
    somethingAsync().then(function (data) {
        console.log('Success!  :-)');
    }, function (error) {
        console.log(':-(');
    });

Public API
----------

Here's the functions that are intended to be used by outsiders.  You're welcome to dig into the source in order to poke around at the rest, but that's hopefully unnecessary.

For the below, `Promise` refers to the constructor function and `promise` refers to an instance.

### `Promise([array])` constructor

Returns a new `FidPromise`.  If passed arguments, those are passed to `.when()`.

### `promise.always(callback)`

Attach a callback to both the list of success and error callbacks.  The callback should always be called when the promise is completed.  Returns `promise`.

### `Promise.debug` and `promise.debug`

If either are defined and are truthy, then debug messages will start being sent to the console.  If `Promise.debug` is truthy then all promises will get debugged and `promise.debug` will debug just a single promise.

You can also set `.debug` to a callback that will be passed a single string parameter if you wish to implement your own logging mechanism.

### `promise.error(onError)`

Attach a callback to the list of error callbacks.  Returns `promise`.

### `promise.reject`

Complete this promise and call its error callbacks.  Returns `promise`.

### `promise.resolve`

Complete this promise and call its success callbacks.  Returns `promise`.

### `promise.success(onSuccess)`

Attach a callback to the list of success callbacks.  Returns `promise`.

### `promise.then(onSuccess, onError)`

Attach callbacks to the success and error callback lists.

Both `onSuccess` and `onError` may be omitted or `null` for no callbacks, a function, or an array of functions.

This always returns *a new Promise* object.

### `promise.when(arrayOfPromises)` and `promise.when(anotherPromise)`

Add `anotherPromise` or each of the promises in `arrayOfPromises` to the list of dependencies.  Fail when any of them are rejected, or succeed when all of them are fulfilled.

It is strongly suggested that you collect your promises into an array and pass that array at once.  This will avoid potential problems where you pass nothing or passing a resolved promise, which would instantly resolve `promise` and probably altering the flow of your program.

Returns `promise`.

### `Promise.when(arrayOfPromises)` and `Promise.when(anotherPromise)`

Creates a new promise and calls `promise.when()` on it, passing in your arguments.  Returns the new promise.  This saves you from potentially creating another local variable and could produce cleaner looking code.

Running Tests
-------------

Extra modules are needed when you run tests.  You need to have an environment that uses node.js and npm.  From there, you should be able to just run these commands.

    npm update
	npm test

License
-------

This package is licensed under the [MIT License] with an additional non-advertising clause.

[MIT License]: LICENSE.md
[Promise/A+ specification]: https://github.com/promises-aplus/promises-spec
[UMD]: https://github.com/umdjs/umd
