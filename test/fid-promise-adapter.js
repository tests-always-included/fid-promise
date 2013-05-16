// Tests Promise against the Promises/A+ Test Suite
// https://github.com/promises-aplus/promises-tests

'use strict';

var Promise = require('../fid-promise');

module.exports = {
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
