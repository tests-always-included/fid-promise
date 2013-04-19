/**
 * Promise/A+ compliant promises.
 *
 * See https://github.com/promises-aplus/promises-spec for information on
 * what Promise/A+ is.
 *
 * Usage:
 *   function somethingAsync() {
 *       promise = new Promise();
 *       // Do something async and that will call promise.fulfill(data) on
 *       // success, promise.reject(error) on failure
 *       return promise;
 *   }
 *   somethingAsync().then(function (data) { console.log(':-)'); },
 *       function (error) { console.log(':-('); });
 */
/*global define, YUI*/
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		if (typeof module === 'object' && module.exports) {
			module.exports = factory();
		} else {
			exports.FidPromise = factory();
		}
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof YUI === 'function') {
		YUI.add('FidPromise', function (Y) {
			Y.FidPromise = factory();
		});
	} else if (typeof root === 'object') {
		root.FidPromise = factory();
	} else {
		throw "Unable to export FidPromise";
	}
}(this, function () {
	'use strict';


	/**
	 * Create a new Promise
	 */
	function Promise() {
		if (!(this instanceof Promise)) {
			return new Promise();
		}

		// null = pending, true = fulfilled, false = rejected
		this.state = null;
		this.thenCallArray = [];
		this.data = [];
		this.waitingFor = 0;

		if (arguments.length) {
			this.when.apply(this, arguments);
		}
	}


	/**
	 * UTILITY FUNCTIONS
	 */


	/**
	 * Determines if something is "thenable" according to A+ spec
	 *
	 * @param mixed target
	 * @return boolean True if it's thenable
	 */
	function isThenable(target) {
		try {
			if (typeof target.then === 'function') {
				return true;
			}
		} catch (ex) {
		}

		return false;
	}


	/**
	 * PROTOTYPE
	 */


	/**
	 * Call the right function on a thenCall object, passing in this
	 * promise's data.
	 *
	 * @parameter object thenCall
	 */
	Promise.prototype.callBack = function (thenCall) {
		var fn, myself;

		if (this.state) {
			fn = thenCall.fulfilled;
		} else {
			fn = thenCall.rejected;
		}

		if (typeof fn !== 'function') {
			this.chain(thenCall.chainedPromise, this.state, this.data);
			return;
		}

		myself = this;

		setTimeout(function () {
			var returned;

			try {
				returned = fn.apply(null, myself.data);
				myself.chain(thenCall.chainedPromise, true, [ returned ]);
			} catch (ex) {
				myself.chain(thenCall.chainedPromise, false, [ ex ]);
			}
		}, 0);
	};


	/**
	 * Chain a fulfillment/rejection to the next promise
	 *
	 * @param boolean fulfilled true/false
	 * @param array args Pass on to next promise
	 */
	Promise.prototype.chain = function chain(chainedPromise, fulfilled, args) {
		if (!args) {
			args = [];
		}

		// Check if a promise was returned and should be called
		if (fulfilled && args.length === 1 && isThenable(args[0])) {
			// Attach this.chainedPromise to this new "thenable"
			this.chainThenable(chainedPromise, args[0]);
		} else {
			chainedPromise.resolve.call(chainedPromise, fulfilled, args);
		}
	};


	/**
	 * Chain the next promise to the promise that is passed in.
	 *
	 * @param function|object thenable
	 */
	Promise.prototype.chainThenable = function chainThenable(chainedPromise, thenable) {
		try {
			// Pass all arguments to the next promise
			thenable.then(function () {
				chainedPromise.resolve(true, arguments);
			}, function () {
				chainedPromise.resolve(false, arguments);
			});
		} catch (ex) {
			chainedPromise.resolve(false, [ ex ]);
		}
	};


	/**
	 * Change the state and pass along the data to all registered 'then'
	 * functions.
	 *
	 * @param boolean success true if fulfilled, false if rejected
	 * @param array args Additional arguments to pass on
	 */
	Promise.prototype.resolve = function resolve(success, args) {
		var myself;

		if (this.state !== null) {
			return;
		}

		this.state = !!success;  // Force to be a boolean
		this.data = args;
		myself = this;
		this.thenCallArray.forEach(function (thenCall) {
			myself.callBack(thenCall);
		});

		return this;
	};


	/**
	 * Accept onFulfilled and onRejected callbacks.  Adds them to our
	 * arrays and will return a new Promise.
	 *
	 * @param function|array|null onFulfilled
	 * @param function|array|null onRejected
	 * @return Promise
	 */
	Promise.prototype.then = function then(onFulfilled, onRejected) {
		var thenCall;

		thenCall = {
			fulfilled: onFulfilled,
			rejected: onRejected,
			chainedPromise: new Promise()
		};

		this.thenCallArray.push(thenCall);

		if (this.state !== null) {
			this.callBack(thenCall);
		}

		return thenCall.chainedPromise;
	};


	/**
	 * Become fulfilled only when everything is resolved.  You can call
	 * this multiple times in a row on the same promise to chain several
	 * together, but that introduces risk if the first one is fulfilled
	 * already.
	 *
	 * // Fulfilled or reject when promise2 is fulfilled or rejected
	 * Promise.when(promise2);
	 * // Add promise 3 to Promise
	 * Promise.when(promise3);
	 * // Add two more
	 * Promise.when(promise4, promise5);
	 * // And two more with an array
	 * Promise.when([promise6, promise7]);
	 *
	 * This lets you build a list of promises easily in two different ways.
	 *
	 * // Way #1
	 * [ callback1, callback2, callback3 ].forEach(function (cb) {
	 *     Promise.when(cb());
	 * });
	 *
	 * // Way #2 (safer)
	 * promises = [];
	 * [ callback1, callback2, callback3 ].forEach(function (cb) {
	 *     promises.push(cb());
	 * });
	 * Promise.when(promises);
	 *
	 * @param Promise|Array
	 * @return this
	 */
	Promise.prototype.when = function when() {
		var args, myself;

		args = Array.prototype.slice.call(arguments);
		myself = this;

		// Avoid triggering too early
		myself.waitingFor += 1;

		// If an array is passed, then use the first argument only
		if (Array.isArray(args[0])) {
			args = args[0];
		}

		args.forEach(function (promise) {
			myself.waitingFor += 1;

			if (isThenable(promise)) {
				promise.then(function () {
					// When all are fulfilled, fulfill this promise
					myself.waitingFor -= 1;

					if (!myself.waitingFor) {
						myself.fulfill();
					}
				}, function () {
					// When any are rejected, immediately reject this promise
					myself.waitingFor -= 1;
					myself.reject();
				});
			}
		});

		// Ok, now we can check to see if we are waiting for things
		if (!myself.waitingFor) {
			myself.fulfill();
		}

		return this;
	};


	/**
	 * SUGAR
	 */


	Promise.prototype.always = function (fn) {
		return this.then(fn, fn);
	};


	Promise.prototype.error = function (fn) {
		return this.then(null, fn);
	};


	Promise.prototype.fulfill = function () {
		return this.resolve(true, arguments);
	};


	Promise.prototype.reject = function () {
		return this.resolve(false, arguments);
	};


	Promise.prototype.success = function (fn) {
		return this.then(fn);
	};


	return Promise;
}));
