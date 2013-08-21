/**
 * Promise/A+ compliant promises.
 *
 * See https://github.com/promises-aplus/promises-spec for information on
 * what Promise/A+ is.
 *
 * Usage:
 *   function somethingAsync() {
 *       promise = new FidPromise();
 *       // Do something async and that will call promise.resolve(data) on
 *       // success, promise.reject(error) on failure
 *       return promise;
 *   }
 *   somethingAsync().then(function (data) { console.log(':-)'); },
 *       function (error) { console.log(':-('); });
 */
// fid-umd {"name":"FidPromise"}
(function (n, r, f) {
	try { module.exports = f(); return; } catch (a) {}
	try { exports[n] = f(); return; } catch (b) {}
	try { return define.amd && define(n, [], f); } catch (c) {}
	try { return YUI.add(n, function (Y) { Y[n] = f(); }); } catch (d) {}
	try { r[n] = f(); return; } catch (e) {}
	throw new Error("Unable to export " + n);
}("FidPromise", this, function () {
	// fid-umd end


	/**
	 * Copy the arguments passed in
	 *
	 * @param arguments args
	 * @return Array
	 */
	function copyArgs(args) {
		return Array.prototype.slice.call(args);
	}


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
	 * Create a new FidPromise
	 */
	function FidPromise() {
		if (!(this instanceof FidPromise)) {
			return new FidPromise();
		}

		// null = pending, true = resolved, false = rejected
		this.data = [];
		this.debugMessage('New promise');
		this.state = null;
		this.thenCallArray = [];
	}


	/**
	 * Accept onSuccess and onFailure callbacks to our arrays and can
	 * chain their success/failure to another promise.
	 *
	 * @param function|array|null onSuccess
	 * @param function|array|null onError
	 * @param undefined|FidPromise chainedPromise
	 * @return this
	 */
	FidPromise.prototype.addCallbacks = function (onSuccess, onError, chainedPromise) {
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
	 * Resolve or reject only after every other promise is resolved or
	 * rejected.  Like the when() method, but rejections are held back
	 * until all promises are done and then only the first rejection is
	 * sent via a rejection.  See when() for more details.
	 *
	 * @param Array promises
	 * @return this
	 */
	FidPromise.prototype.after = function (promises) {
		var args, endSuccess, failResults, myself, successResults, waitingFor;

		args = copyArgs(arguments);
		waitingFor = 0;
		endSuccess = true;
		successResults = [];
		failResults = [];
		myself = this;

		function checkCount() {
			if (waitingFor === 0) {
				myself.debugMessage('(after) Final error count ' + failResults.length);

				if (endSuccess) {
					myself.resolve(successResults);
				} else {
					myself.reject(failResults);
				}
			}
		}

		promises.forEach(function (promise, index) {
			if (isThenable(promise)) {
				waitingFor += 1;
				myself.debugMessage('(after) Adding then');
				promise.then(function (result) {
					waitingFor -= 1;

					if (result !== undefined) {
						successResults[index] = result;
					}

					myself.debugMessage('(after resolved) ' + waitingFor + ' left');
					checkCount();
				}, function (result) {
					waitingFor -= 1;
					failResults.push(result);
					endSuccess = false;
					myself.debugMessage('(after rejected) ' + waitingFor + ' left');
					checkCount();
				});
			}
		});

		// Ok, now we can check to see if we are waiting for things
		checkCount();
		return this;
	};


	/**
	 * On success or failure, run this method.
	 *
	 * @return this
	 */
	FidPromise.prototype.always = function (fn) {
		return this.addCallbacks(fn, fn);
	};


	/**
	 * Call the right function on a thenCall object, passing in this
	 * promise's data.
	 *
	 * @parameter object thenCall
	 */
	FidPromise.prototype.callBack = function (thenCall) {
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
	FidPromise.prototype.chain = function (chainedPromise, wasSuccess, args) {
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
	FidPromise.prototype.chainThenable = function (chainedPromise, thenable) {
		try {
			// Pass all arguments to the next promise
			thenable.then(function () {
				chainedPromise.complete(true, copyArgs(arguments));
			}, function () {
				chainedPromise.complete(false, copyArgs(arguments));
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
	FidPromise.prototype.complete = function (wasSuccess, args) {
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
	FidPromise.prototype.debugMessage = function (message) {
		var debug, fullMessage;

		debug = FidPromise.debug || this.debug;

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
	FidPromise.prototype.error = function (fn) {
		return this.addCallbacks(null, fn);
	};


	/**
	 * Create a unique-ish ID.  Does not need to strictly be unique
	 * but it is certainly helpful if it can be.  Used for debugging.
	 *
	 * @return string
	 */
	FidPromise.prototype.getId = function () {
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
	FidPromise.prototype.reject = function () {
		return this.complete(false, copyArgs(arguments));
	};


	/**
	 * Mark a promise as successfully completed.  Passes arguments
	 * to onSuccess callbacks registered with .then()
	 *
	 * @return this
	 */
	FidPromise.prototype.resolve = function () {
		return this.complete(true, copyArgs(arguments));
	};


	/**
	 * On success only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	FidPromise.prototype.success = function (fn) {
		return this.addCallbacks(fn);
	};


	/**
	 * Accept onSuccess and onError callbacks.  Adds them to our
	 * arrays and will return a new FidPromise.
	 *
	 * @param mixed onSuccess
	 * @param mixed onError
	 * @return FidPromise
	 */
	FidPromise.prototype.then = function (onSuccess, onError) {
		var chainedPromise;

		this.debugMessage('(then) Creating new promise');
		chainedPromise = new FidPromise();
		this.addCallbacks(onSuccess, onError, chainedPromise);
		return chainedPromise;
	};


	/**
	 * Become resolved only when everything is resolved, but will be
	 * rejected as soon as any promise is rejected.  Very similar to
	 * after().
	 *
	 * // Resolve once all of the promises are resolved
	 * promises = [ callback1, callback2, callback3 ].map(function (cb) {
	 *     // Your callback returns a promise
	 *     return cb();
	 * });
	 * myPromise.when(promises);
	 *
	 * @param Array promises
	 * @return this
	 */
	FidPromise.prototype.when = function (promises) {
		var args, myself, successResults, waitingFor;

		waitingFor = 0;
		successResults = [];
		myself = this;

		promises.forEach(function (promise) {
			if (isThenable(promise)) {
				waitingFor += 1;
				myself.debugMessage('(when) Adding then');
				promise.then(function (result) {
					// When all are resolved, resolve this promise
					waitingFor -= 1;

					if (result !== undefined) {
						successResults.push(result);
					}

					if (!waitingFor) {
						myself.debugMessage('(when resolved) resolved last dependency');
						myself.resolve(successResults);
					} else {
						myself.debugMessage('(when resolved) ' + waitingFor + ' left');
					}
				}, function (err) {
					// When any are rejected, immediately reject this promise
					waitingFor -= 1;
					myself.debugMessage('(when rejected) ' + waitingFor + ' left');
					myself.reject(err);
				});
			}
		});

		// Ok, now we can check to see if we are waiting for things
		if (!waitingFor) {
			myself.debugMessage('(when) Immediately resolved - no dependencies');
			myself.resolve(this.successResults);
		}

		return this;
	};


	/**
	 * Easy way to make a new promise based on the completion of other
	 * promises.  Waits for all promises to be resolved, one way or another.
	 *
	 * Old:  var promise = new FidPromise();
	 *       promise = promise.after([other, promises, go, here]);
	 *       promise.then(...);
	 *
	 * New:  FidPromise.after([other, promises, go, here]).then(...);
	 *
	 * @param Array promises
	 */
	FidPromise.after = function (promises) {
		var promise;

		promise = new FidPromise();
		promise.after.call(promise, promises);
		return promise;
	};


	/**
	 * Easy way to make a new promise based on the completion of other
	 * promises.  Waits for all promises to pass or any failure.
	 *
	 * Old:  var promise = new FidPromise();
	 *       promise.when([other, promises, go, here]);
	 *       promise.then(...);
	 *
	 * New:  FidPromise.when([other, promises, go, here]).then(...);
	 *
	 * @param Array promises
	 */
	FidPromise.when = function (promises) {
		var promise;

		promise = new FidPromise();
		promise.when.call(promise, promises);
		return promise;
	};


	return FidPromise;

	// fid-umd post
}));
// fid-umd post-end
