/* MySQL backend tests */

var config = require('./config.js'),
    testCase = require('nodeunit').testCase,
	sqlmw = require('../lib/sqlmw.js'),
	sys = require('sys');

module.exports = testCase({
	setUp: function (callback) {
		var mytestcase = this;
		mytestcase.table = 'test_table';
		mytestcase.sql = sqlmw('mysql', config.mysql);
		mytestcase.sql.group(
			mytestcase.sql.connect(),
			mytestcase.sql.query('CREATE TEMPORARY TABLE '+mytestcase.table+' (id INT(11) AUTO_INCREMENT, title VARCHAR(255), text TEXT, created DATETIME, PRIMARY KEY (id))')
		)({}, function(err) {
			callback(err);
		});
	},
	tearDown: function (callback) {
		var mytestcase = this;
		mytestcase.sql.group(
			mytestcase.sql.query('DROP TABLE '+mytestcase.table),
			mytestcase.sql.disconnect()
		)({}, function(err) {
			callback(err);
		});
	},
	/* Test for backend interface */
	backend: function(test){
		var mytestcase = this;
		var backend = mytestcase.sql.backend;
		test.expect(6);
		test.ok(backend, "backend invalid");
		test.strictEqual(backend.type, 'mysql');
		test.strictEqual(typeof backend.placeholder, 'function', "Missing .placeholder");
		test.strictEqual(typeof backend.connect, 'function', "Missing .connect");
		test.strictEqual(typeof backend.query, 'function', "Missing .query");
		test.strictEqual(typeof backend.disconnect, 'function', "Missing .disconnect");
		test.done();
	},
	/* Test for INSERT with user defined callback function */
	query_insert_with_callback: function(test){
		var mytestcase = this;
		test.expect(5);
		var cb = mytestcase.sql.query('INSERT INTO '+mytestcase.table+' (title, text, created) VALUES (:title, :text, :created)');
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'title':'Hello world', 'text':'This is a test article.', 'created':new Date()}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state, "state invalid");
			test.strictEqual(state._insertId, 1, "state._insertId failed");
			test.done();
		});
	},
	/* Test for SELECT with empty options and user defined callback function */
	query_select_with_empty_options_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 3);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 3);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2);
			test.strictEqual( state._rows[1].title, 'Second title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3);
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test for SELECT without options and with user defined callback function */
	query_select_without_options_with_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb(function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 3);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 3);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2);
			test.strictEqual( state._rows[1].title, 'Second title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3);
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test for SELECT + LIMIT with selected options and user defined callback function */
	query_select_single_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(20);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' WHERE id=:id LIMIT 1')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':1}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 1);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 1);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state.id, 1);
			test.strictEqual( state.title, 'Hello World');
			test.strictEqual( state.text, 'Test article #1');
			test.strictEqual( sys.inspect(state.created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.done();
		});
	},
	/* Test for DELETE with selection (options) and user defined callback function */
	query_delete_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(19);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('DELETE FROM '+mytestcase.table+' WHERE id=:id LIMIT 1'),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':2}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 2);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 2);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 3);
			test.strictEqual( state._rows[1].title, 'Third title');
			test.strictEqual( state._rows[1].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test for UPDATE with options and user defined callback function */
	query_update_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('UPDATE '+mytestcase.table+' SET title=:new_title WHERE id=:id LIMIT 1'),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':2, 'new_title':'Modified title'}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 3, "state._rows.length failed");
			test.strictEqual( state._results.length, 1, "state._results.length failed");
			test.strictEqual( state._results[0].length, 3, "state._results[0].length failed");
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2);
			test.strictEqual( state._rows[1].title, 'Modified title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3);
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test for DELETE with selection (options) but no user defined callback */
	query_delete_with_options_without_callback: function(test){
		var mytestcase = this;
		test.expect(21);
		var del = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('DELETE FROM '+mytestcase.table+' WHERE id=:id LIMIT 1')
		);
		test.ok(del, "Failed to create callback: del");
		test.strictEqual(typeof del, 'function', "Failed to create callback: del");
		var select = mytestcase.sql.query('SELECT * FROM '+mytestcase.table);
		test.ok(select, "Failed to create callback: select");
		test.strictEqual(typeof select, 'function', "Failed to create callback: select");
		del({'id':2});
		setTimeout(function() { // DO NOT USE CODE LIKE THIS IN REAL SOFTWARE :-)
			select(function(err, state) {
				test.ok(!err, "Error: " + err);
				test.ok(state);
				test.ok(state._rows);
				test.ok(state._results);
				test.strictEqual( state._rows.length, 2);
				test.strictEqual( state._results.length, 1);
				test.strictEqual( state._results[0].length, 2);
				test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
				test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
				
				test.strictEqual( state._rows[0].id, 1);
				test.strictEqual( state._rows[0].title, 'Hello World');
				test.strictEqual( state._rows[0].text, 'Test article #1');
				test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
				
				test.strictEqual( state._rows[1].id, 3);
				test.strictEqual( state._rows[1].title, 'Third title');
				test.strictEqual( state._rows[1].text, 'Test article #3');
				test.strictEqual( sys.inspect(state._rows[1].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
				
				test.done();
			});
		}, 250);
	},
	/* Test for DELETE without selection and no user defined callback */
	query_delete_without_options_callback: function(test){
		var mytestcase = this;
		test.expect(21);
		var del = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('DELETE FROM '+mytestcase.table+' WHERE id = 2 LIMIT 1')
		);
		test.ok(del, "Failed to create callback: del");
		test.strictEqual(typeof del, 'function', "Failed to create callback: del");
		var select = mytestcase.sql.query('SELECT * FROM '+mytestcase.table);
		test.ok(select, "Failed to create callback: select");
		test.strictEqual(typeof select, 'function', "Failed to create callback: select");
		del();
		setTimeout(function() { // DO NOT USE CODE LIKE THIS IN REAL SOFTWARE :-)
			select(function(err, state) {
				test.ok(!err, "Error: " + err);
				test.ok(state);
				test.ok(state._rows);
				test.ok(state._results);
				test.strictEqual( state._rows.length, 2);
				test.strictEqual( state._results.length, 1);
				test.strictEqual( state._results[0].length, 2);
				test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
				test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
				
				test.strictEqual( state._rows[0].id, 1);
				test.strictEqual( state._rows[0].title, 'Hello World');
				test.strictEqual( state._rows[0].text, 'Test article #1');
				test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
				
				test.strictEqual( state._rows[1].id, 3);
				test.strictEqual( state._rows[1].title, 'Third title');
				test.strictEqual( state._rows[1].text, 'Test article #3');
				test.strictEqual( sys.inspect(state._rows[1].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
				
				test.done();
			});
		}, 250);
	},
	/* Test for sql.use and user defined middlewares */
	sql_use_userdefined_middleware: function(test){
		var mytestcase = this;
		test.expect(5);
		
		function ourMiddleware(sql) {
			sql.insertArticle = function() {
				var sql = this;
				var insert = sql.query('INSERT INTO '+mytestcase.table+' (title, text, created) VALUES (:title, :text, :created)')
				return function(options, next) {
					insert({'title':'Hello world', 'text':'This is a test article.', 'created':new Date()}, next);
				};
			};
		}
		
		mytestcase.sql.use(ourMiddleware);
		
		var cb = mytestcase.sql.insertArticle();
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb(function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state, "state invalid");
			test.strictEqual(state._insertId, 1, "state._insertId failed");
			test.done();
		});
	}
});

/* EOF */
