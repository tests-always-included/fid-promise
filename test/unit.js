/**
 * Unit tests beyond the Promise/A+ spec tests.
 *
 * Most of the code is functionally tested quite well by those tests.  This
 * tests mostly the "ease of use" functionality that is tacked on beyond
 * what the spec regulates.
 */
/*global afterEach, beforeEach, describe, it*/

'use strict';

var Assert, FidPromise;

Assert = require('assert');
FidPromise = require('../fid-promise.js');

function FakePromise() {
	this.a = 'unchanged';
	this.b = 'unchanged';
}

FakePromise.prototype.addCallbacks = function (a, b) {
	this.a = a;
	this.b = b;
	return this;
};

function noop() {}

describe('FidPromise()', function () {
	it('works without arguments', function () {
		var p;
		p = new FidPromise();
		Assert.equal('object', typeof p);
		Assert.equal(0, p.waitingFor);
		Assert.equal(null, p.state);
		Assert.equal(0, p.thenCallArray.length);
	});
	it('works with empty array', function () {
		var p;
		p = new FidPromise([]);
		Assert.equal('object', typeof p);
		Assert.equal(0, p.waitingFor);
		Assert.equal(true, p.state); // Already fulfilled
	});
	it('works with single promise', function () {
		var p1, p2;
		p1 = new FidPromise();
		Assert.equal('object', typeof p1);
		Assert.equal(0, p1.waitingFor);
		Assert.equal(null, p1.state);
		p2 = new FidPromise(p1);
		Assert.equal('object', typeof p2);
		Assert.equal(1, p2.waitingFor);
		Assert.equal(null, p2.state);
		Assert.equal(1, p1.thenCallArray.length);
		Assert.equal(0, p2.thenCallArray.length);
	});
	it('works with array of promises', function () {
		var p1, p2;
		p1 = new FidPromise();
		Assert.equal('object', typeof p1);
		Assert.equal(0, p1.waitingFor);
		Assert.equal(null, p1.state);
		p2 = new FidPromise([p1, p1, p1]);
		Assert.equal('object', typeof p2);
		Assert.equal(3, p2.waitingFor);
		Assert.equal(null, p2.state);
		Assert.equal(3, p1.thenCallArray.length);
		Assert.equal(0, p2.thenCallArray.length);
	});
});

describe('FidPromise.prototype.always()', function () {
	it('adds callsbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.always.call(faker, noop);
		Assert.equal(faker.a, noop);
		Assert.equal(faker.b, noop);
		Assert.strictEqual(faker, result);
	});
});

describe('FidPromise.prototype.debugMessage()', function () {
	var logger, logCount;

	beforeEach(function () {
		logger = console.log;
		console.log = function () {
			logCount += 1;
		};
		logCount = 0;
	});
	afterEach(function () {
		console.log = logger;

		if (FidPromise.debug) {
			delete FidPromise.debug;
		}
	});
	it('does not log when off', function () {
		var p;
		p = new FidPromise();
		Assert.equal(0, logCount);
	});
	it('logs when Promise.debug = true', function () {
		var p;
		FidPromise.debug = true;
		p = new FidPromise();
		Assert.notEqual(0, logCount);
	});
	it('logs when promise.debug = true', function () {
		var p;
		p = new FidPromise();
		Assert.equal(0, logCount);
		p.debug = true;
		p.then(noop);
		Assert.notEqual(0, logCount);
	});
	it('logs when Promise.debug = function', function () {
		var p, internalLogCount;
		internalLogCount = 0;
		FidPromise.debug = function () {
			internalLogCount += 1;
		};
		p = new FidPromise();
		Assert.equal(0, logCount);
		Assert.notEqual(0, internalLogCount);
	});
	it('logs when promise.debug = function', function () {
		var p, internalLogCount;
		internalLogCount = 0;
		p = new FidPromise();
		p.debug = function () {
			internalLogCount += 1;
		};
		p.then(noop);
		Assert.equal(0, logCount);
		Assert.notEqual(0, internalLogCount);
	});
});

describe('FidPromise.prototype.error()', function () {
	it('adds callsbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.error.call(faker, noop);
		Assert.equal(faker.a, null);  // Not "unchanged"
		Assert.equal(faker.b, noop);
		Assert.strictEqual(faker, result);
	});
});

describe('FidPromise.prototype.getId()', function () {
	it('generates unique-ish IDs', function () {
		var id1, id2;

		function getId() {
			var promise;
			promise = new FidPromise();
			return promise.getId();
		}

		id1 = getId();
		id2 = getId();
		Assert.notEqual(id1, id2);
		Assert.equal(true, id1.length >= 10);
		Assert.equal(true, id2.length >= 10);
	});
});

describe('FidPromise.prototype.success()', function () {
	it('adds callsbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.success.call(faker, noop);
		Assert.equal(faker.a, noop);
		Assert.equal(faker.b, null);  // Not "unchanged"
		Assert.strictEqual(faker, result);
	});
});

describe('FidPromise.prototype.when()', function () {
	function openPromise() {
		var p;
		p = new FidPromise();
		return p;
	}

	function rejectedPromise() {
		var p;
		p = new FidPromise();
		p.reject();
		return p;
	}

	function resolvedPromise() {
		var p;
		p = new FidPromise();
		p.resolve();
		return p;
	}

	it('returns itself', function () {
		var p;
		p = openPromise();
		Assert.equal(p, p.when());
	});

	describe('[array]', function (done) {
		it('does not immediately resolve with first fulfilled promise', function (done) {
			// This illustrates the reason arrays of promises should
			// be used with .when() -- had these promises been added
			// to .when() in a loop the promise would resolve immediately
			var p;
			p = openPromise();
			p.when([
				resolvedPromise(),
				openPromise()
			]);
			Assert.equal(null, p.state);
			setTimeout(function () {
				// Still should not be resolved
				try {
					Assert.equal(null, p.state);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
		it('immediately resolves with empty array', function () {
			var p;
			p = openPromise();
			p.when([]);
			// Synchronous resolution
			Assert.equal(true, p.state);
		});
		it('resolves after all promises are resolved', function (done) {
			var p, promises;
			promises = [
				openPromise(),
				openPromise(),
				openPromise(),
				openPromise()
			];
			p = openPromise();
			p.when(promises);
			Assert.equal(null, p.state);
			promises[0].resolve();
			promises[3].resolve();
			promises[2].resolve();
			Assert.equal(null, p.state);
			setTimeout(function () {
				// Still should not be resolved
				try {
					Assert.equal(null, p.state);
				} catch (err) {
					done(err);
				}

				// The resolution happens asynchronously
				promises[1].resolve();
				setTimeout(function () {
					try {
						Assert.equal(true, p.state);
						done();
					} catch (err) {
						done(err);
					}
				});
			});
		});
		it('immediately rejects with any rejected promise', function (done) {
			var p, promises;
			promises = [
				openPromise(),
				rejectedPromise(),
				openPromise(),
				openPromise()
			];
			p = openPromise();
			p.when(promises);
			Assert.equal(null, p.state);
			// The resolution happens asynchronously
			setTimeout(function () {
				try {
					Assert.equal(false, p.state);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
		it('rejects after any rejections', function (done) {
			var p, promises;
			promises = [
				openPromise(),
				openPromise(),
				openPromise(),
				openPromise()
			];
			p = openPromise();
			p.when(promises);
			Assert.equal(null, p.state);
			promises[2].reject();
			Assert.equal(null, p.state);
			// The resolution happens asynchronously
			setTimeout(function () {
				try {
					Assert.equal(false, p.state);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});
	describe('[multiple calls]', function () {
		it('immediately resolves with no arguments', function () {
			var p;
			p = openPromise();
			p.when();
			// Synchronous resolution
			Assert.equal(true, p.state);
		});
		it('immediately resolves with first fulfilled promise', function () {
			// This illustrates a potential problem with using
			// .when() without using an array of promises
			var p;
			p = openPromise();
			p.when(resolvedPromise());
		});
		it('resolves after all promises are resolved', function (done) {
			var p, child1, child2, child3;
			p = openPromise();
			child1 = openPromise();
			child2 = openPromise();
			child3 = openPromise();
			p.when(child1).when(child2).when(child3);
			child1.resolve();
			child3.resolve();
			Assert.equal(null, p.state);
			setTimeout(function () {
				// Still should not be resolved
				try {
					Assert.equal(null, p.state);
					child2.resolve();
					// The resolution happens asynchronously
					setTimeout(function () {
						try {
							Assert.equal(true, p.state);
							done();
						} catch (err) {
							done(err);
						}
					});
				} catch (err) {
					done(err);
				}
			});
		});
		it('rejects after any rejections', function (done) {
			var p, child1, child2, child3;
			p = openPromise();
			child1 = openPromise();
			child2 = openPromise();
			child3 = openPromise();
			p.when(child1).when(child2).when(child3);
			child1.resolve();  // Just adding this for variety
			child2.reject();
			Assert.equal(null, p.state);
			setTimeout(function () {
				// Should be rejected
				try {
					Assert.equal(false, p.state);
					child3.resolve();
					setTimeout(function () {
						try {
							Assert.equal(false, p.state);
							done();
						} catch (err) {
							done(err);
						}
					});
				} catch (err) {
					done(err);
				}
			});
		});
	});
});

describe('FidPromise.when()', function () {
	var oldWhen, whenCount;

	beforeEach(function () {
		oldWhen = FidPromise.prototype.when();
		whenCount = 0;
		FidPromise.prototype.when = function (arg) {
			whenCount += 1;
			Assert.equal('pigs fly', arg);
		};
	});
	afterEach(function () {
		FidPromise.prototype.when = oldWhen;
	});
	it('simply calls Promise.prototype.when()', function () {
		var p;
		FidPromise.when('pigs fly');
		Assert.equal(1, whenCount);
	});
});
