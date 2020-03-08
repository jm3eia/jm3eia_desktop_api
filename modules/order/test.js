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
 * Orders api test
 */
describe('Orders', () => {

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
     * Test Orders list
     */
    it("Responds Orders List", function (done) {
        request
            .get("/v1/order")
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
     * Test get one Order
     */
    it("Responds Orders One", function (done) {
        request
            .get(`/v1/order/${Id}`)
            .set('Authorization', token)
            .expect(200)
            .end(function (err, res) {
                expect(typeof res.body.data).to.equal('object');
                done();
            });
    });

    /**
     * Test Orders delete
     */
    it("Responds Admin Orders Delete", function (done) {
        request
            .delete(`/v1/order/${Id}`)
            .set('Authorization', token)
            .expect(200)
            .end(function (err, res) {
                done();
            });
    });
});