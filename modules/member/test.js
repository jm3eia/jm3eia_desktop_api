// Load required modules
const path = require('path');
const app = require(path.resolve('app'));
const config = require(path.resolve('libraries/config'));
const request = require('supertest')(app);
const chai = require('chai');
const expect = chai.expect;

let Id = null;
let token = null;
const appId = process.env.APP_ID_KEY || config.appId;
const appSecret = process.env.APP_SECRET_KEY || config.appSecret;


/**
 * Products api test
 */
describe('Products', () => {

    /**
     * runs before all tests in this block
     * @param {function} done
     */
	before(function (done) {
		request
			.post("/v1/auth/login")
			.send({
				"appId": appId,
				"appSecret": appSecret,
				"username": config.test.username,
				"password": config.test.password,
			})
			.expect(200)
			.end(function (err, res) {
				token = `Bearer ${res.body.token}`;
				done();
			});
	});

    /**
     * Test Products insert
     */
	it("Responds Admin Products Insert", function (done) {
		request
			.post("/v1/product")
			.set('Authorization', token)
			.send({
				"soft_code": "tst123456",
				"barcode": "tst123456",
				"category_id": "000000000000000000000071",
				"brand_id": "000000000000000000000006",
				"old_price": 0,
				"price": 0.875,
				"weight": 2,
				"picture": "Media/Images/2017/12/07/1512670622.png",
				"featured": parseInt(Math.random() * 1000),
				"status": true,
				"name": {
					"ar": "آي بي سي - مياه معدنيه 330مل"
				},
				"alias": {
					"ar": "آي-بي-سي---مياه-معدنيه-330مل-(20حبة)"
				},
				"contents": {
					"ar": "<p>آي بي سي - مياه معدنيه 330مل (20حبة)</p>"
				},
				"description": {
					"ar": "آي بي سي - مياه معدنيه 330مل (20حبة)"
				},
				"keywords": {
					"ar": "آي بي سي - مياه معدنيه 330مل (20حبة)"
				}
			})
			.expect(200)
			.end(function (err, res) {
				expect(typeof res.body.insertedId).to.equal('string');
				Id = res.body.insertedId;
				done();
			});
	});

    /**
     * Test Products update
     */
	it("Responds Admin Products Update", function (done) {
		request
			.put(`/v1/product/${Id}`)
			.set('Authorization', token)
			.send({
				"soft_code": "tst123456",
				"barcode": "tst123456",
				"category_id": "000000000000000000000071",
				"brand_id": "000000000000000000000006",
				"old_price": 0,
				"price": 0.875,
				"weight": 1,
				"picture": "Media/Images/2017/12/07/1512670622.png",
				"featured": parseInt(Math.random() * 1000),
				"status": true,
				"name": {
					"ar": "آي بي سي - مياه معدنيه 330مل"
				},
				"alias": {
					"ar": "آي-بي-سي---مياه-معدنيه-330مل-(20حبة)"
				},
				"contents": {
					"ar": "<p>آي بي سي - مياه معدنيه 330مل (20حبة)</p>"
				},
				"description": {
					"ar": "آي بي سي - مياه معدنيه 330مل (20حبة)"
				},
				"keywords": {
					"ar": "آي بي سي - مياه معدنيه 330مل (20حبة)"
				}
			})
			.expect(200)
			.end(function (err, res) {
				done();
			});
	});

    /**
     * Test Products list
     */
	it("Responds Products List", function (done) {
		request
			.get("/v1/product")
			.set('Authorization', token)
			.expect(200)
			.end(function (err, res) {
				expect(Array.isArray(res.body.data)).to.equal(true);
				const elm = Math.floor(Math.random() * (res.body.data.length - 1)) + 0;
				Id = res.body.data[elm]['_id'];
				done();
			});
	});

    /**
     * Test get one Product
     */
	it("Responds Products One", function (done) {
		request
			.get(`/v1/product/${Id}`)
			.set('Authorization', token)
			.expect(200)
			.end(function (err, res) {
				expect(typeof res.body.data).to.equal('object');
				done();
			});
	});

    /**
     * Test Products delete
     */
	it("Responds Admin Products Delete", function (done) {
		request
			.delete(`/v1/product/${Id}`)
			.set('Authorization', token)
			.expect(200)
			.end(function (err, res) {
				done();
			});
	});
});