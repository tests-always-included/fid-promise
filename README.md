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
* In node.js, AMD, CommonJS, and other methods
* With RequireJS in the browser

Usage
-----

    function somethingAsync() {
        promise = new Promise();
        
        // Do something async and that will call promise.fulfill(data) on
        // success, promise.reject(error) on failure
        return promise;
    }
    
    somethingAsync().then(function (data) {
        console.log('Success!  :-)');
    }, function (error) {
        console.log(':-(');
    });

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
