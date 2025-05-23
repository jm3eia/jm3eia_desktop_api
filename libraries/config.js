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
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASS
    },
    test: {
        username: process.env.TEST_USERNAME,
        password: process.env.TEST_PASSWORD
    },
    desktop: {
        app_id: process.env.DESKTOP_APP_ID,
        app_secret: process.env.DESKTOP_APP_SECRET,
        email: process.env.DESKTOP_EMAIL,
        password: process.env.DESKTOP_PASSWORD,
        base_url: process.env.DESKTOP_BASE_URL,
    },
    refresh_juice: {
        app_id: process.env.REFRESH_JUICE_APP_ID,
        app_secret: process.env.REFRESH_JUICE_APP_SECRET,
        email: process.env.REFRESH_JUICE_EMAIL,
        password: process.env.REFRESH_JUICE_PASSWORD,
        base_url: process.env.REFRESH_JUICE_BASE_URL,
    },
    env: process.env.APP_ENV,
    denied_agents: process.env.DENIED_AGENTS,
    secret: process.env.APP_SECRET,
    local: process.env.APP_LOCAL,
    base_media_dir: process.env.APP_BASE_MEDIA_DIR,
    media_url: process.env.MEDIA_URL,
    base_url_level: process.env.APP_BASE_URL_LEVEL,
    sms: {
        api_key: process.env.SMS_API_KEY,
    },
    cm: {
        product_token: process.env.CM_PRODUCT_TOKEN,
        sender_id: process.env.CM_SENDER_ID
    },
    webengage: {
        license_code: process.env.WEBENGAGE_LICENSE_CODE,
        api_key: process.env.WEBENGAGE_API_KEY,
    }
};
