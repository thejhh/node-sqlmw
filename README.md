Middleware Framework for SQL
============================

Description
-----------

This is a simple framework to combine multiple async SQL operations into usable 
callback functions.

Installation for Node.js
------------------------

Simplest way to install is to use [npm](http://npmjs.org/), just simply `npm install sqlmw`.

License
-------

MIT-style license, see [INSTALL.txt](http://github.com/jheusala/node-sqlmw/blob/master/LICENSE.txt).

Backends
--------

* [mysql](https://github.com/felixge/node-mysql)
* [pg](https://github.com/brianc/node-postgres)

Examples for MySQL
------------------

Initializing the `sql` object for MySQL:

	var config = {'host': 'localhost', 'user': 'user', 'password': 'hello', 'database': 'dbname'},
	    sql = require('sqlmw')('mysql', config);

You can create saved callback functions like this:

	var delete_player = sql.query('DELETE FROM player WHERE game_id=:game_id AND number=:number LIMIT 1');

And use `delete_player` like this:

	var connect = sql.connect();
	connect(function(err) {
		if(err) {
			console.log('Failed to connect: ' + err);
		} else {
			delete_player({'game_id':1,'number':1}, function(err) {
				if(err) console.log('Failed to add player: ' + err);
				else console.log('Successfully added player');
			});
		}
	});

Middleware `sql.connect()` can be executed more than once. It creates new connections only if connection is disconnected.

You can also group multiple middlewares into one single callback function this way:

	var insert_player = sql.group(
		sql.connect(),
		sql.query('SELECT COUNT(number)+1 AS number FROM player WHERE game_id=:game_id'),
		sql.query('INSERT INTO player (number, game_id) VALUES (:number, :game_id)'),
		sql.disconnect()
	);

And use `insert_player` simply like this:

	insert_player({'game_id':1}, function(err) {
		if(err) console.log('Failed to add player: ' + err);
		else console.log('Successfully added player');
	});

You can also use groups like `insert_player` as a middleware when grouping:

	var useless_operation = sql.group(insert_player, delete_player);
	useless_operation(function(err) {
		if(err) console.log('Failed: ' + err);
		else console.log('Successfully added AND removed a player');
	});

Examples for PostgreSQL
-----------------------

Initializing the `sql` object for PostgreSQL:

	var config = 'tcp://postgres:1234@localhost/postgres',
	    sql = require('sqlmw')('pg', config);

Interface for sqlmw with PostgreSQL is the same as with MySQL except obviously 
actual query strings might not be always compatible for both backends.

See more from [unit tests](https://github.com/jheusala/node-sqlmw/tree/master/test) and 
[examples/](https://github.com/jheusala/node-sqlmw/tree/master/examples).

Calling middlewares
-------------------

Every returned callable middleware works the same way and can be called in the following standard ways.

### With options:

	var fn = sql.query('INSERT INTO table (a,b) VALUES (:a, :b)');
	fn({'a':1, 'b':2}, function(err) {
		if(err) console.log('Error: ' + err);
	});

### Without options:

	var fn = sql.query('DELETE FROM table');
	fn(function(err) {
		if(err) console.log('Error: ' + err);
	});

### Without user defined callback (errors are printed to stderr):

	var fn = sql.query('DELETE FROM table');
	fn();

### With options but without user defined callback (errors are printed to stderr):

	var fn = sql.query('DELETE FROM table WHERE id = :id');
	fn({'id':2});

Built-in Middlewares
--------------------

### `sql.connect()`

Returns callable middleware to connect our backend to the server if disconnected.

### `sql.disconnect()`

Returns callable middleware to disconnect our backend from the server.

### `sql.query(str)`

Returns callable middleware for generic SQL query.

### `sql.group(a[, b[, ...]])`

Returns set of middlewares grouped as one callable middleware. You can group other groups, too.

### `sql.assign(key, value)`

Returns middleware to assign `key` in the current state object as `value`.

User-defined Middlewares
------------------------

Create a file named `ourMiddleware.js`:

	module.exports = function(sql) {
		sql.insertArticle = function() {
			var sql = this,
			    insert = sql.query('INSERT INTO article (title, text, created) VALUES (:title, :text, :created)')
			return function(options, next) {
				insert({'title':'Hello world', 'text':'This is a test article.', 'created':new Date()}, next);
			};
		};
	};

And use it like this:

	var ourMiddleware = require('./ourMiddleware.js');
	sql.use(ourMiddleware);
	
	var cb = sql.insertArticle();
	cb(function(err, state) {
		if(err) console.log('Failed to insert row: ' + err);
	});

`sql` object members
--------------------

### `sql.debug`

Debug flag. If set to true middlewares are allowed to output debug messages 
with `console.log()`.

### `sql.use(mw [, ...])`

Loads new user-defined middlewares.

### `sql.backend`

Current backend object in use.

#### `sql.backend.type`

Returns backend type as `String`:

* `pg` for PostgreSQL
* `mysql` for MySQL

Middlewares in TODO
-------------------

These middlewares are NOT IMPLEMENTED but might be in the future. You can also 
implement your own middlewares.

### `sql.create(name)`

Returns middleware to create a new database. This should be portable for all 
backends.

### `sql.insert(table)`

Returns middleware to insert values to a table. This should be portable for all 
backends.

### `sql.del(table)`

Returns middleware to remove rows from a table. This should be portable for all 
backends.

### `sql.update(table)`

Returns middleware to update row(s) in table. This should be portable for all 
backends.

Running lint and unit tests
---------------------------

To run our [lint](https://github.com/jpolo/node-lint) test just execute command `./run-lint.sh`:

	+ node-lint --no-colors --config=lint.json lib/
	✓ Valid » 7 files ∙ 0 error

To run our [nodeunit](https://github.com/caolan/nodeunit) tests just execute command `npm test`:

	> sqlmw@0.1.1 test /home/users/jhh/git/node-sqlmw
	> ./run-test.sh
	
	+ node test/run.js
	
	test-mysql.js
	✔ backend
	✔ query_insert_with_callback
	✔ query_select_with_empty_options_callback
	✔ query_select_without_options_with_callback
	✔ query_select_single_with_options_callback
	✔ query_delete
	✔ query_update
	✔ query_delete_with_options_without_callback
	✔ query_delete_without_options_callback
	
	test-pg.js
	✔ backend
	✔ query_insert_with_options_callback
	✔ query_select_with_emptyoptions_callback
	✔ query_select_single_with_options_callback
	✔ query_delete_with_options_callback
	✔ query_update_with_options_callback
	✔ query_select_without_options_with_callback
	✔ query_select_single_without_options_callback
	
	OK: 305 assertions (901ms)

