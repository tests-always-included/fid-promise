// Tests Promise against the Promises/A+ Test Suite
// https://github.com/promises-aplus/promises-tests
/*global describe*/

'use strict';

var adapter, Promise;

Promise = require('../fid-promise');
adapter = {
	pending: function () {
		var p = new Promise();
		return {
			promise: p,
			fulfill: function (value) {
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
