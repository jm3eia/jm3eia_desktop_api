/**
 * Load Required Modules
 */

/**
 * Application Config.
 */
module.exports = {
    db: {
        name: process.env.DB_NAME,
        url: process.env.DB_URL,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        admindb: process.env.DB_ADMIN_DB,
        limit: parseInt(process.env.DB_LIMIT)
    },
    test: {
        username: process.env.TEST_USERNAME,
        password: process.env.TEST_PASSWORD
    },
    env: process.env.APP_ENV,
    denied_agents: process.env.DENIED_AGENTS,
    secret: process.env.APP_SECRET,
    local: process.env.APP_LOCAL,
    base_media_dir: process.env.APP_BASE_MEDIA_DIR,
    media_url: process.env.MEDIA_URL,
    base_url_level: process.env.APP_BASE_URL_LEVEL,
};