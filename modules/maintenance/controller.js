// Maintenance Controller

// Load required modules
const cmd = require('node-cmd');

/**
 * Clean log
 * @param {Object} req
 * @param {Object} res
 */
module.exports.clean = (req, res) => {
	cmd.runSync('rm -rf /root/.pm2/logs/*');
	res.out({"message": "Application logs have been cleaned"});
};

/**
 * Restart app
 * @param {Object} req
 * @param {Object} res
 */
module.exports.restart = (req, res) => {
	cmd.runSync('pm2 restart all');
	res.out({"message": "Application has been restarted"});
};
