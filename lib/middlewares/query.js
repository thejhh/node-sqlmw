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
module.exports = function(sql) {
	
	var sys = require('sys'),
		foreach = require('snippets').foreach;
	
	/* Returns middleware for SQL query */
	sql.query = function(q) {
		var sql = this;
		return function(options, next) {
			
			var q_keys = [],
			    q_values = [],
			    q_str,
			    is_select,
			    is_insert,
			    i;
			
			if(sql._debug) {
				console.log('sql.query:');
				console.log('  q = ' + sys.inspect(q) );
				console.log('  options = ' + sys.inspect(options) );
			}
			
			i = 0;
			q_str = q.replace(/:([a-zA-Z0-9_]+)/g, function(match, contents, offset, s) {
				var key = ""+contents;
				if(!options[key]) {
					return ':'+key;
				}
				q_keys.push(key);
				q_values.push(options[key]);
				i = i + 1;
				return sql.backend.placeholder(i);
			});
			
			if(sql._debug) {
				console.log('  q_str = ' + sys.inspect(q_str) );
				console.log('  q_keys = ' + sys.inspect(q_keys) );
				console.log('  q_values = ' + sys.inspect(q_values) );
			}
			
			is_select = q_str.match(/^select/i) ? true : false;
			is_insert = q_str.match(/^insert/i) ? true : false;
			
			sql.backend.query(
				q_str,
				q_values,
				function(err, results) {
					if(err) {
						next(err);
						return;
					}
					if(is_insert && results && results.insertId) {
						options._insertId = results.insertId;
					}
					if(is_select) {
						if(sql._debug) {
							console.log('  results = ' + sys.inspect(results));
						}
						if(results.length === 1) {
							foreach(results).each(function(row) {
								foreach(row).each(function(v, k) {
									if(sql._debug) {
										console.log('  Setting ' + k + ' = ' + v);
									}
									options[k] = v;
								});
							});
						}
						options._rows = results || [];
						if(!options._results) {
							options._results = [];
						}
						options._results.push(results);
					}
					next(undefined, options);
				}
			);
		};
	};
	
};

/* EOF */
