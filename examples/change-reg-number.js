
var config = require('/path/to/config.js'),
    sql = require('sqlmw')('mysql', config.sql);

/* Replaces original player with a spare player
 * Required game_id: Game ID
 * Required target_player_number: Player number to be replaced with spare player
 * Required spare_player_number: Spare player number (original reg will be removed from DB)
 */
var replace_player = sql.group(
	sql.connect(),
	sql.query('SELECT user_id AS target_user_id                        FROM reg WHERE number=:target_player_number AND game_id=:game_id'),
	sql.query('SELECT user_id AS spare_user_id, reg_id AS spare_reg_id FROM reg WHERE number=:spare_player_number AND game_id=:game_id'),
	sql.query('DELETE FROM player WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM reg    WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM auth   WHERE game_id=:game_id AND user_id=:spare_user_id LIMIT 1'),
	sql.query('UPDATE reg SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id'),
	sql.query('UPDATE auth SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id')
);

/* Use replace_player */
replace_player({'game_id':1, 'target_player_number':3, 'spare_player_number':4}, function(err) {
	if(err) console.log('Failed to move player: ' + err);
	else console.log('Successfully moved players');
});

/* EOF */
