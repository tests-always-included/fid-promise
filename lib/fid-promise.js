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
// fid-umd {"jslint":1,"name":"FidPromise"}
/*global define, YUI*/
(function (n, r, f) {
    "use strict";
    try { module.exports = f(); return; } catch (ignore) {}
    try { exports[n] = f(); return; } catch (ignore) {}
    try { return define.amd && define(n, [], f); } catch (ignore) {}
    try { return YUI.add(n, function (Y) { Y[n] = f(); }); } catch (ignore) {}
    try { r[n] = f(); return; } catch (ignore) {}
    throw new Error("Unable to export " + n);
}("FidPromise", this, function () {
    "use strict";
    // fid-umd end
   
    var addCallbacks, attachTo, callNext, complete, debugMessage, FidPromise, getId, getThen;

	/**
	 * Accept onSuccess and onFailure callbacks to our arrays and can
	 * chain their success/failure to another promise.
	 *
	 * @param {FidPromise} promise
	 * @param {Function} [onSuccess]
	 * @param {Function} [onError]
	 * @param {FidPromise} [nextPromise]
	 * @return this
	 */
	addCallbacks = function (promise, onSuccess, onError, nextPromise) {
		var thenCall;

		debugMessage(promise, 'Adding callbacks');

		thenCall = {
			onSuccess: onSuccess,
			onError: onError,
			nextPromise: nextPromise
		};

		promise.thenCallArray.push(thenCall);

		if (promise.state !== null) {
			debugMessage(promise, 'Already resolved, state is ' + promise.state);
			callNext(promise, thenCall);
		}

        return promise;
	};


    /**
     * @typedef {Object} FidPromise.thenCall
     * @property {Function} onSuccess
     * @property {Function} onError
     * @property {FidPromise} nextPromise
     */

    /**
     * Attach a promise to another promise via its 'then' method
     *
     * @param {FidPromise} promise
     * @param {Object} otherPromise
     * @param {Function} otherThen
     */
    attachTo = function (promise, otherPromise, otherThen) {
        var otherId, wasCalled;

        function doubleCheck(thisType) {
            if (wasCalled) {
                debugMessage(promise, 'Ignoring another resolution from the other promise: ' + otherId);
                return;
            }

            wasCalled = true;
            debugMessage(promise, thisType + ' by another promise: ' + otherId);
            return true;
        }

        otherId = 'other' + getId();
        debugMessage(promise, 'Attaching to another promise: ' + otherId);
        wasCalled = false;

        try {
            otherThen.call(otherPromise, function (success) {
                if (doubleCheck('Resolved')) {
                    promise.resolve(success);
                }
            }, function (failure) {
                if (doubleCheck('Rejected')) {
                    promise.reject(failure);
                }
            });
        } catch (ex) {
            if (doubleCheck('Caught error thrown during then()')) {
                promise.reject(ex);
            }
        }
    };


	/**
	 * Call the right function on a thenCall object, passing in this
	 * promise's data.
	 *
	 * @param {FidPromise} parentPromise
     * @param {FidPromise~thenCall} thenCall
	 */
	callNext = function (parentPromise, thenCall) {
		var fn;

		if (parentPromise.state) {
			fn = thenCall.onSuccess;
		} else {
			fn = thenCall.onError;
		}

		if (typeof fn !== 'function') {
			debugMessage(parentPromise, 'CallBack hit non-function - passing to child');
            complete(thenCall.nextPromise, parentPromise.state, parentPromise.data);
			return;
		}

		// Use setTimeout to avoid call stack limits
		setTimeout(function () {
			var success, value;

			try {
				value = fn.call(undefined, parentPromise.data);
                success = true;
			} catch (ex) {
                value = ex;
                success = false;
			}

            complete(thenCall.nextPromise, success, value);
		}, 0); // Execute immediately
	};


	/**
	 * Change the state and pass along the data to all registered 'then'
	 * functions.
	 *
     * @param {FidPromise} promise
	 * @param {boolean} wasSuccess true if successful, false if error
	 * @param {*} value Value for resolved/rejected promise
	 */
	complete = function (promise, wasSuccess, value) {
		var err, then;

        if (!promise) {
            return;
        }
        debugMessage(promise, 'complete');

        if (value === promise) {
            err = 'Can not resolve a promise with itself';
            debugMessage(promise, err);
            value = new TypeError(err);
            wasSuccess = false;
        }

		if (promise.state !== null) {
			debugMessage(promise, 'Complete called a second time - ignoring');
            return;
		}

        try {
            then = getThen(value);
        } catch (ex) {
            debugMessage(promise, 'Accessing .then threw an error');
            value = ex;
            wasSuccess = false;
        }
        
        if (then) {
            attachTo(promise, value, then);
            return;
        }

		promise.state = !!wasSuccess;  // Force to be a boolean
        debugMessage(promise, 'Complete - state is now ' + promise.state);
		promise.data = value;
		promise.thenCallArray.forEach(function (thenCall) {
			callNext(promise, thenCall);
		});
	};


	/**
	 * Debugging is built into this promise implementation
	 *
	 * Enable it globally:  FidPromise.debug = true;
	 * Enable it locally:  myPromise.debug = true;
	 * Use your own logger:  FidPromise.debug = yourLoggerCallback
     *
     * @param {FidPromise} promise
     * @param {string} message
	 */
	debugMessage = function (promise, message) {
		var debug, fullMessage;

		debug = FidPromise.debug || promise.debug;

		if (debug) {
			if (!promise.id) {
                promise.id = getId();
			}

			fullMessage = promise.id + ': ' + message;

			if (typeof debug === 'function') {
				debug(fullMessage);
			} else {
				console.log(fullMessage);
			}
		}
	};


    /**
     * Generate a random ID
     *
     * @return {string}
     */
    getId = function () {
        var id;
        
        id = '';

        while (id.length < 10) {
            id += Math.random().toString().substr(2);
        }

        return id.substr(0, 10);
    };

	/**
	 * Determines if something is "thenable" according to A+ spec
	 *
	 * @param {*} target
	 * @return {?Function} Then function, null otherwise
	 */
	getThen = function (target) {
        var then;

        if (target && (typeof target === 'object' || typeof target === 'function')) {
            then = target.then;

            if (typeof then === 'function') {
                return then;
            }
        }

		return null;
	};


	/**
	 * Create a new FidPromise
     *
     * @class FidPromise
	 */
	FidPromise = function () {
		if (!(this instanceof FidPromise)) {
			return new FidPromise();
		}

		this.data = [];
		this.state = null;
		this.thenCallArray = [];
		debugMessage(this, 'New promise');
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
		var endSuccess, failResults, myself, successResults, waitingFor;

		waitingFor = 0;
		endSuccess = true;
		successResults = [];
		failResults = [];
		myself = this;

		function checkCount() {
			if (waitingFor === 0) {
				debugMessage(myself, '(after) Final error count ' + failResults.length);

				if (endSuccess) {
					myself.resolve(successResults);
				} else {
					myself.reject(failResults);
				}
			}
		}

		promises.forEach(function (promise, index) {
			if (getThen(promise)) {
				waitingFor += 1;
				debugMessage(myself, '(after) Adding then');
				promise.then(function (result) {
					waitingFor -= 1;

					if (result !== undefined) {
						successResults[index] = result;
					}

					debugMessage(myself, '(after resolved) ' + waitingFor + ' left');
					checkCount();
				}, function (result) {
					waitingFor -= 1;
					failResults.push(result);
					endSuccess = false;
					debugMessage(myself, '(after rejected) ' + waitingFor + ' left');
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
		return addCallbacks(this, fn, fn);
	};


	/**
	 * On failure only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	FidPromise.prototype.error = function (fn) {
		return addCallbacks(this, null, fn);
	};


	/**
	 * Mark a promise as rejected.  Passes arguments to onError callbacks
	 * registered with .then()
     *
     * @param {*} reason
	 */
	FidPromise.prototype.reject = function (reason) {
		complete(this, false, reason);
	};


	/**
	 * Mark a promise as successfully completed.  Passes arguments
	 * to onSuccess callbacks registered with .then()
	 *
     * @param {*} value
	 */
	FidPromise.prototype.resolve = function (value) {
		complete(this, true, value);
	};


	/**
	 * On success only, run this method.
	 *
	 * @return this Not a new promise but instead the original
	 */
	FidPromise.prototype.success = function (fn) {
		return addCallbacks(this, fn);
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
		var nextPromise;

		debugMessage(this, '(then) Creating new promise');
		nextPromise = new FidPromise();
		addCallbacks(this, onSuccess, onError, nextPromise);
		return nextPromise;
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
		var myself, successResults, waitingFor;

		waitingFor = 0;
		successResults = [];
		myself = this;

		promises.forEach(function (promise) {
			if (getThen(promise)) {
				waitingFor += 1;
				debugMessage(myself, '(when) Adding then');
				promise.then(function (result) {
					// When all are resolved, resolve this promise
					waitingFor -= 1;

					if (result !== undefined) {
						successResults.push(result);
					}

					if (!waitingFor) {
						debugMessage(myself, '(when resolved) resolved last dependency');
						myself.resolve(successResults);
					} else {
						debugMessage(myself, '(when resolved) ' + waitingFor + ' left');
					}
				}, function (err) {
					// When any are rejected, immediately reject this promise
					waitingFor -= 1;
					debugMessage(myself, '(when rejected) ' + waitingFor + ' left');
					myself.reject(err);
				});
			}
		});

		// Ok, now we can check to see if we are waiting for things
		if (!waitingFor) {
			debugMessage(myself, '(when) Immediately resolved - no dependencies');
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
		promise.after(promises);
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
		promise.when(promises);
		return promise;
	};


	return FidPromise;

    // fid-umd post
}));
// fid-umd post-end
