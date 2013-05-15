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
		this.debugMessage('New promise');

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
	 * Accept onFulfilled and onRejected callbacks to our arrays and can
	 * chain their success/failure to another promise.
	 *
	 * @param function|array|null onFulfilled
	 * @param function|array|null onRejected
	 * @param undefined|Promise chainedPromise
	 * @return this
	 */
	Promise.prototype.addCallbacks = function then(onFulfilled, onRejected, chainedPromise) {
		var thenCall;

		this.debugMessage('Adding callbacks');

		thenCall = {
			fulfilled: onFulfilled,
			rejected: onRejected,
			chainedPromise: chainedPromise
		};

		this.thenCallArray.push(thenCall);

		if (this.state !== null) {
			this.debugMessage('Already resolved: ' + this.state.toString());
			this.callBack(thenCall);
		}

		return this;
	};


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
			this.debugMessage('CallBack hit non-function');
			this.chain(thenCall.chainedPromise, this.state, this.data);
			return;
		}

		myself = this;

		// Use setTimeout to avoid call stack limits
		setTimeout(function () {
			var returned;

			try {
				returned = fn.apply(null, myself.data);
				myself.chain(thenCall.chainedPromise, true, [ returned ]);
			} catch (ex) {
				myself.chain(thenCall.chainedPromise, false, [ ex ]);
			}
		}, 0); // Execute immediately
	};


	/**
	 * Chain a fulfillment/rejection to the next promise
	 *
	 * @param boolean fulfilled true/false
	 * @param array args Pass on to next promise
	 */
	Promise.prototype.chain = function chain(chainedPromise, fulfilled, args) {
		if (!chainedPromise) {
			return;
		}

		if (!args) {
			args = [];
		}

		// Check if a promise was returned and should be called
		if (fulfilled && args.length === 1 && isThenable(args[0])) {
			// Attach this.chainedPromise to this new "thenable"
			this.debugMessage('Chained to a newly returned promise');
			this.chainThenable(chainedPromise, args[0]);
		} else {
			this.debugMessage('Chaining to next promise');
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
	 * Debugging is built into this promise implementation
	 *
	 * Enable it globally:  FidPromise.debug = true;
	 * Enable it locally:  myPromise.debug = true;
	 * Use your own logger:  FidPromise.debug = yourLoggerCallback

	 */
	Promise.prototype.debugMessage = function debugMessage(message) {
		var debug, fullMessage;

		debug = Promise.debug || this.debug;

		if (debug) {
			if (!this.id) {
				this.id = this.getId();
			}

			fullMessage = this.id + ': ' + message;

			if (typeof debug === 'function') {
				debug(fullMessage);
			} else {
				console.log(fullMessage);
			}
		}
	};


	/**
	 * Create a unique-ish ID.  Does not need to strictly be unique
	 * but it is certainly helpful if it can be.  Used for debugging.
	 *
	 * @return string
	 */
	Promise.prototype.getId = function getId() {
		if (!this.id) {
			this.id = '';

			while (this.id.length < 10) {
				this.id += Math.random().toString().substr(2);
			}

			this.id = this.id.substr(0, 10);
		}

		return this.id;
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
			this.debugMessage('Resolve called twice - ignoring');
			return;
		}

		this.state = !!success;  // Force to be a boolean

		if (this.state) {
			this.debugMessage('Resolved - fulfilled');
		} else {
			this.debugMessage('Resolved - rejected');
		}

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
		var chainedPromise;

		this.debugMessage('(then) Creating new promise');
		chainedPromise = new Promise();
		this.addCallbacks(onFulfilled, onRejected, chainedPromise);
		return chainedPromise;
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

		// If an array is passed, then use the first argument only
		if (Array.isArray(args[0])) {
			args = args[0];
		}

		args.forEach(function (promise) {
			myself.waitingFor += 1;

			if (isThenable(promise)) {
				myself.debugMessage('(when) Adding then');
				promise.then(function () {
					// When all are fulfilled, fulfill this promise
					myself.waitingFor -= 1;

					if (!myself.waitingFor) {
						myself.debugMessage('(when fulfilled) fulfilled last dependency');
						myself.fulfill();
					} else {
						myself.debugMessage('(when fulfilled) ' + myself.waitingFor + ' left');
					}
				}, function (err) {
					// When any are rejected, immediately reject this promise
					myself.waitingFor -= 1;
					myself.debugMessage('(when rejected) ' + myself.waitingFor + ' left');
					myself.reject(err);
				});
			}
		});

		// Ok, now we can check to see if we are waiting for things
		if (!myself.waitingFor) {
			myself.debugMessage('(when) Immediately fulfilled - no dependencies');
			myself.fulfill();
		}

		return this;
	};


	/**
	 * SUGAR
	 */


	/**
	 * On success or failure, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	Promise.prototype.always = function (fn) {
		return this.addCallbacks(fn, fn);
	};


	/**
	 * On failure only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	Promise.prototype.error = function (fn) {
		return this.addCallbacks(null, fn);
	};


	Promise.prototype.fulfill = function () {
		return this.resolve(true, arguments);
	};


	Promise.prototype.reject = function () {
		return this.resolve(false, arguments);
	};


	/**
	 * On success only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	Promise.prototype.success = function (fn) {
		return this.addCallbacks(fn);
	};


	return Promise;
}));
