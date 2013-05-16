/**
 * Promise/A+ compliant promises.
 *
 * See https://github.com/promises-aplus/promises-spec for information on
 * what Promise/A+ is.
 *
 * Usage:
 *   function somethingAsync() {
 *       promise = new Promise();
 *       // Do something async and that will call promise.resolve(data) on
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
	 * Create a new Promise
	 */
	function Promise() {
		if (!(this instanceof Promise)) {
			return new Promise();
		}

		// null = pending, true = resolved, false = rejected
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
	 * Accept onSuccess and onFailure callbacks to our arrays and can
	 * chain their success/failure to another promise.
	 *
	 * @param function|array|null onSuccess
	 * @param function|array|null onError
	 * @param undefined|Promise chainedPromise
	 * @return this
	 */
	Promise.prototype.addCallbacks = function (onSuccess, onError, chainedPromise) {
		var thenCall;

		this.debugMessage('Adding callbacks');

		thenCall = {
			onSuccess: onSuccess,
			onError: onError,
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
	 * On success or failure, run this method.
	 *
	 * @return this
	 */
	Promise.prototype.always = function (fn) {
		return this.addCallbacks(fn, fn);
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
			fn = thenCall.onSuccess;
		} else {
			fn = thenCall.onError;
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
	 * Chain a success/error to the next promise
	 *
	 * @param boolean wasSuccess true/false
	 * @param array args Pass on to next promise
	 */
	Promise.prototype.chain = function (chainedPromise, wasSuccess, args) {
		if (!chainedPromise) {
			return;
		}

		if (!args) {
			args = [];
		}

		// Check if a promise was returned and should be called
		if (wasSuccess && args.length === 1 && isThenable(args[0])) {
			// Attach this.chainedPromise to this new "thenable"
			this.debugMessage('Chained to a newly returned promise');
			this.chainThenable(chainedPromise, args[0]);
		} else {
			this.debugMessage('Chaining to next promise');
			chainedPromise.complete(wasSuccess, args);
		}
	};


	/**
	 * Chain the next promise to the promise that is passed in.
	 *
	 * @param function|object thenable
	 */
	Promise.prototype.chainThenable = function (chainedPromise, thenable) {
		try {
			// Pass all arguments to the next promise
			thenable.then(function () {
				chainedPromise.complete(true, arguments);
			}, function () {
				chainedPromise.complete(false, arguments);
			});
		} catch (ex) {
			chainedPromise.complete(false, [ ex ]);
		}
	};


	/**
	 * Change the state and pass along the data to all registered 'then'
	 * functions.
	 *
	 * @param boolean wasSuccess true if successful, false if error
	 * @param array args Additional arguments to pass on
	 * @return this
	 */
	Promise.prototype.complete = function (wasSuccess, args) {
		var myself;

		if (this.state !== null) {
			this.debugMessage('Complete called twice - ignoring');
			return this;
		}

		this.state = !!wasSuccess;  // Force to be a boolean

		if (this.state) {
			this.debugMessage('Complete - success');
		} else {
			this.debugMessage('Complete - error');
		}

		this.data = args;
		myself = this;
		this.thenCallArray.forEach(function (thenCall) {
			myself.callBack(thenCall);
		});

		return this;
	};


	/**
	 * Debugging is built into this promise implementation
	 *
	 * Enable it globally:  FidPromise.debug = true;
	 * Enable it locally:  myPromise.debug = true;
	 * Use your own logger:  FidPromise.debug = yourLoggerCallback
	 */
	Promise.prototype.debugMessage = function (message) {
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
	 * On failure only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	Promise.prototype.error = function (fn) {
		return this.addCallbacks(null, fn);
	};


	/**
	 * Create a unique-ish ID.  Does not need to strictly be unique
	 * but it is certainly helpful if it can be.  Used for debugging.
	 *
	 * @return string
	 */
	Promise.prototype.getId = function () {
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
	 * Mark a promise as rejected.  Passes arguments to onError callbacks
	 * registered with .then()
	 *
	 * @return this
	 */
	Promise.prototype.reject = function () {
		return this.complete(false, arguments);
	};


	/**
	 * Mark a promise as successfully completed.  Passes arguments
	 * to onSuccess callbacks registered with .then()
	 *
	 * @return this
	 */
	Promise.prototype.resolve = function () {
		return this.complete(true, arguments);
	};


	/**
	 * On success only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	Promise.prototype.success = function (fn) {
		return this.addCallbacks(fn);
	};


	/**
	 * Accept onSuccess and onError callbacks.  Adds them to our
	 * arrays and will return a new Promise.
	 *
	 * @param mixed onSuccess
	 * @param mixed onError
	 * @return Promise
	 */
	Promise.prototype.then = function (onSuccess, onError) {
		var chainedPromise;

		this.debugMessage('(then) Creating new promise');
		chainedPromise = new Promise();
		this.addCallbacks(onSuccess, onError, chainedPromise);
		return chainedPromise;
	};


	/**
	 * Become resolved only when everything is resolved.  You can call
	 * this multiple times in a row on the same promise to chain several
	 * together, but that introduces risk if the first one is resolved
	 * already.  Becomes rejected as soon as any is rejected.
	 *
	 * // Resolve or reject when promise2 is resolved or rejected
	 * var myPromise = new Promise();
	 * myPromise.when(promise2);
	 * // Add promise 3 to myPromise
	 * myPromise.when(promise3);
	 * // Add two more
	 * myPromise.when(promise4, promise5);
	 * // And two more with an array
	 * myPromise.when([promise6, promise7]);
	 *
	 * This lets you build a list of promises easily in two different ways.
	 * For these examples, assume the callbacks return promises.
	 *
	 * // Way #1 - avoid, but this can work
	 * // Can resolve immediately if the first resolves immediately
	 * [ callback1, callback2, callback3 ].forEach(function (cb) {
	 *     myPromise.when(cb());
	 * });
	 *
	 * // Way #2 - safer because it only can resolve after all
	 * promises = [];
	 * [ callback1, callback2, callback3 ].forEach(function (cb) {
	 *     promises.push(cb());
	 * });
	 * myPromise.when(promises);
	 *
	 * @param Promise|Array
	 * @return this
	 */
	Promise.prototype.when = function () {
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
					// When all are resolved, resolve this promise
					myself.waitingFor -= 1;

					if (!myself.waitingFor) {
						myself.debugMessage('(when resolved) resolved last dependency');
						myself.resolve();
					} else {
						myself.debugMessage('(when resolved) ' + myself.waitingFor + ' left');
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
			myself.debugMessage('(when) Immediately resolved - no dependencies');
			myself.resolve();
		}

		return this;
	};


	/**
	 * Easy way to make a new promise based on the completion of other
	 * promises.
	 *
	 * Old:  var promise = new FidPromise([other, promises, go, here]);
	 *       promise.then(...);
	 *
	 * New:  FidPromise.when([other, promises, go, here]).then(...);
	 *
	 * @param mixed (see constructor)
	 */
	Promise.when = function () {
		var promise;

		promise = new Promise();

		if (arguments.length) {
			promise.when.apply(promise, arguments);
		}

		return promise;
	};


	return Promise;
}));
