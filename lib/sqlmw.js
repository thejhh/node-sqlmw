/* SQL Middleware Framework by @jheusala */

/*
 * Copyright (C) 2011 by Jaakko-Heikki Heusala <jheusala@iki.fi>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* Create SQL object */
module.exports = function(type, conf, orig_args) {
	
	var foreach = require('snippets').foreach,
	    args = orig_args || {},
	    sql = {};
	
	function get_backend(name) {
		return require('./backends/'+name+'.js');
	}
	
	function load_middleware(ware) {
		var loaded = {};
		ware(loaded);
		foreach(loaded).each(function(mw, k) {
			
			// Skip if middleware isn't a function
			if(! (mw && (typeof mw === 'function')) ) {
				console.log('Warning! Loaded middleware was not a function: ' + k);
				return;
			}
			
			sql[k] = function() {
				var built_mw = mw.apply(sql, arguments);
				return function(options, next) {
					if(options && (typeof options === 'function') ) {
						next = options;
						options = undefined;
					}
					if(! (next && (typeof next === 'function')) ) {
						next = function(err) {
							if(err) {
								console.error('Error: '+err);
							}
						};
					}
					options = options || {};
					return built_mw.call(sql, options, next);
				};
			};
		});
	}
	
	// Set debug flag
	sql._debug = args.debug ? true : false;
	sql.debug = args.debug ? true : false;
	
	// Expose backend object outside too
	sql.backend = get_backend(type)(conf, {'debug':sql._debug});
	
	/* Load middlewares */
	sql.use = function() {
		foreach(arguments).each(function(mw) {
			if(mw && (typeof mw === 'function')) {
				load_middleware(mw);
			} else {
				load_middleware(require('./middlewares/'+mw+'.js'));
			}
		});
	};
	
	sql.use('connect', 'group', 'assign', 'query', 'transaction');
	
	return sql;
};

/* EOF */
