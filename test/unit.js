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
FidPromise = require('../lib/fid-promise.js');

function FakePromise() {
    this.thenCallArray = [];
}

function noop() {
    return;
}

describe('FidPromise()', function () {
	it('works without arguments', function () {
		var p;
		p = new FidPromise();
		Assert.equal('object', typeof p);
		Assert.equal(null, p.state);
		Assert.equal(0, p.thenCallArray.length);
	});
});

describe('FidPromise.prototype.after()', function () {
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
		Assert.equal(p, p.after([]));
	});

	it('does not immediately resolve with first fulfilled promise', function (done) {
		var p;
		p = openPromise();
		p.after([
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
		p.after([]);
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
		p.after(promises);
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
			Assert.equal(null, p.state);
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
	it('does not immediately reject with any rejected promise', function (done) {
		var p, promises;
		promises = [
			openPromise(),
			rejectedPromise(),
			openPromise(),
			openPromise()
		];
		p = openPromise();
		p.after(promises);
		Assert.equal(null, p.state);
		// The resolution happens asynchronously
		setTimeout(function () {
			try {
				Assert.equal(null, p.state);
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
		p.after(promises);
		Assert.equal(null, p.state);
		promises[2].reject();
		promises[0].resolve();
		promises[1].resolve();
		promises[3].resolve();
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

describe('FidPromise.prototype.always()', function () {
	it('adds callbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.always.call(faker, noop);
        Assert.equal(faker.thenCallArray[0].onSuccess, noop);
        Assert.equal(faker.thenCallArray[0].onError, noop);
        Assert.notEqual(faker.thenCallArray[0].nextPromise, undefined);
		Assert.notStrictEqual(faker, result);
	});
});

describe('FidPromise.prototype.error()', function () {
	it('adds callbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.error.call(faker, noop);
        Assert.equal(faker.thenCallArray[0].onSuccess, null);
        Assert.equal(faker.thenCallArray[0].onError, noop);
        Assert.notEqual(faker.thenCallArray[0].nextPromise, undefined);
		Assert.notStrictEqual(faker, result);
	});
});

describe('FidPromise.prototype.success()', function () {
	it('adds callbacks correctly', function () {
		var faker, result;

		faker = new FakePromise();
		result = FidPromise.prototype.success.call(faker, noop);
        Assert.equal(faker.thenCallArray[0].onSuccess, noop);
        Assert.equal(faker.thenCallArray[0].onError, undefined);
        Assert.notEqual(faker.thenCallArray[0].nextPromise, undefined);
		Assert.notStrictEqual(faker, result);
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
		Assert.equal(p, p.when([]));
	});

	it('does not immediately resolve with first fulfilled promise', function (done) {
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

describe('FidPromise.after()', function () {
	var oldAfter, afterCount;

	beforeEach(function () {
		oldAfter = FidPromise.prototype.after;
		afterCount = 0;
		FidPromise.prototype.after = function (arg) {
			afterCount += 1;
			Assert.equal('pigs fly', arg);
		};
	});
	afterEach(function () {
		FidPromise.prototype.after = oldAfter;
	});
	it('simply calls Promise.prototype.after()', function () {
		FidPromise.after('pigs fly');
		Assert.equal(1, afterCount);
	});
});

describe('FidPromise.when()', function () {
	var oldWhen, whenCount;

	beforeEach(function () {
		oldWhen = FidPromise.prototype.when;
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
		FidPromise.when('pigs fly');
		Assert.equal(1, whenCount);
	});
});
