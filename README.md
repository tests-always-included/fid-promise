FidPromise
==========

Promise/A+ compliant promises.  See the [Promises Spec] for more information.

[![Promises/A+ 1.1 compliant][promise-image]][Promises Spec]
[![NPM][npm-image]][NPM]
[![Build Status][travis-image]][Travis CI]
[![Dependencies][dependencies-image]][Dependencies]
[![Dev Dependencies][devdependencies-image]][Dev Dependencies]


Goals
-----

1. Readable.  *I like learning from examples.*
2. Debuggable.  *When there are problems, can I figure out what's going wrong?*
3. Testable.  *All code should be tested.*
4. Simple.  *Extra functionality often makes bugs or the code will become brittle.*
5. Avoid blowing up a call stack.
6. Use it everywhere.  *Browser, node, with YUI, RequireJS and more.*

That last goal just means that everything runs with its own timeout, so one can not possibly break the code by accidentally chaining a lot of promises together.  If they are all synchronous and fulfill themselves immediately other libraries may recurse too deeply and cause the code to fail.  It's a tiny bit slower, but I'd take reliability over extreme speed.

The module uses [FidUmd] to let you use this library in the following areas:

* In the browser, attaching to `window.FidPromise`
* With YUI as FidPromise
* In node.js, AMD, CommonJS, and other methods via the regular module.exports
* With RequireJS in the browser


Quick Usage
-----------

    function somethingAsync() {
        promise = new FidPromise();

        // Do something async and that will call promise.resolve(data) on
        // success, promise.reject(error) on failure
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

For the below, `FidPromise` refers to the constructor function and `promise` refers to an instance.

### `FidPromise()` constructor

Returns a new `FidPromise`.

### `promise.after(arrayOfPromises)`

Waits for every promise in the array to be completed.  Once they are, this promise will be rejected or resolved.  If rejected, the passed data will be an array of all of the rejections.  If resolved properly, the passed data will be an array of all of the resolutions in the order they were passed in.  This is similar to `when()` except that this will reject the promise only after everything is done instead of on the first error.

Returns `promise`.

### `promise.always(callback)`

Attach a callback to both the list of success and error callbacks.  The callback should always be called when the promise is completed.  Returns `promise`.

### `FidPromise.debug` and `promise.debug`

If either are defined and are truthy, then debug messages will start being sent to the console.  If `FidPromise.debug` is truthy then all promises will get debugged and `promise.debug` will debug just a single promise.

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

This always returns *a new FidPromise* object.

### `promise.when(arrayOfPromises)`

Waits for every promise in the array to be resolved or until the first rejected promise.  If rejected, the promise will be immediately rejected with the data passed from the other rejected promise.  If resolved properly, the passed data will be an array of all of the resolutions.  This is the same as `after()` but this version does not wait for all of the promises to resolve if any hit an error condition.

Returns `promise`.

### `FidPromise.after(arrayOfPromises)`

Creates a new promise and calls `promise.after()` on it, passing in your arguments.  Returns the new promise.  This saves you from potentially creating another local variable and could produce cleaner looking code.

### `FidPromise.when(arrayOfPromises)`

Creates a new promise and calls `promise.when()` on it, passing in your arguments.  Returns the new promise.  This saves you from potentially creating another local variable and could produce cleaner looking code.


Running Tests
-------------

Extra modules are needed when you run tests.  You need to have an environment that uses node.js and npm.  From there, you should be able to just run these commands.

    npm update
	npm test

The code is also tested with [Travis CI] automatically.


Changelog
---------

Not all minor changes are listed here.  Just the important ones that affect how you'd use this object.

2014-04-08:

 * Rewrote large chunks of the library to handle the new Promise/A+ spec.
 * Hidden several functions inside the library; no more exposing things that should not be seen by a client.
 * Moved the repository to the tests-always-included organization on GitHub.

2013-05-30:

 * Constructor now does not take any parameter.  Use `FidPromise.when()` instead.
 * `when()` will return an array of the results from the promises that are fulfilled.
 * `when()` now only accepts an array for a parameter.
 * Added `.after()` method and `FidPromise.after()` helper function.


Developing
----------

First, clone the repository.  Then run `npm install` to fetch dependencies.


Testing
-------

Tests are *always* included.  You can run them with the following command.  It runs the test suites for both the Promise/A+ spec and custom unit tests.

    npm test


License
-------

This package is licensed under the [MIT License] with an additional non-advertising clause.

[Dev Dependencies]: https://david-dm.org/tests-always-included/fid-promise#info=devDependencies
[devdependencies-image]: https://david-dm.org/tests-always-included/fid-promise/dev-status.png
[Dependencies]: https://david-dm.org/tests-always-included/fid-promise
[dependencies-image]: https://david-dm.org/tests-always-included/fid-promise.png
[FidUmd]: https://github.com/fidian/fid-umd/
[MIT License]: LICENSE.md
[NPM]: https://npmjs.org/package/fid-promise
[npm-image]: https://nodei.co/npm/fid-promise.png?downloads=true&stars=true
[promise-image]: http://promises-aplus.github.com/promises-spec/assets/logo-small.png
[Promises Spec]: https://github.com/promises-aplus/promises-spec
[travis-image]: https://secure.travis-ci.org/tests-always-included/fid-promise.png?branch=master
[Travis CI]: http://travis-ci.org/tests-always-included/fid-promise
[UMD]: https://github.com/umdjs/umd
