// Tests Promise against the Promises/A+ Test Suite
// https://github.com/promises-aplus/promises-tests
/*global describe*/

'use strict';

var adapter, Promise;

Promise = require('../lib/fid-promise');
adapter = {
	deferred: function () {
		var p = new Promise();
		return {
			promise: p,
			resolve: function (value) {
				p.resolve(value);
			},
			reject: function (reason) {
				p.reject(reason);
			}
		};
	}
};

describe('Promises/A+ Tests', function () {
	require('promises-aplus-tests').mocha(adapter);
});
