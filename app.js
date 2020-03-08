// Load required modules
require('dotenv').config();
const config = require('./libraries/config');
const createError = require('http-errors');
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

const middleware = require('./libraries/middleware');
app.use(middleware);

app.use(logger('tiny'));
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());

if (config.env === 'development') {
	const cors = require('cors')
	const corsOptions = {
		origin: '*'
	}
	app.use(cors(corsOptions));
}

const all_modules = fs.readdirSync(path.join(__dirname, `modules`));
for (const moduleName of all_modules) {
	// api
	const moduleRouter = require(`./modules/${moduleName}/route`);
	app.use(`/v1/${moduleName}`, moduleRouter);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	// render the error page
	res.status(err.status || 500);
	console.log({
		error: err
	});
	res.json({
		error: err
	});
});

module.exports = app;