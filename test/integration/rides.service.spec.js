"use strict";
process.env.PORT = 8888; // Use random ports during tests
require('dotenv').config();

const { ServiceBroker, Context } = require("moleculer");
const { ValidationError } = require("moleculer").Errors;
const RidesService = require("../../services/rides.service");
const VehicleService = require("../../services/vehicles.service");
const APISchema = require("../../services/api.service");
const UserService = require("../../services/user.service");
const PromoCodeService = require("../../services/promoCodes.service");
const PromoCodeUserService = require("../../services/promoCodeUser.service");

describe("Test 'rides' service", () => {

	describe("Test rides",() => {
		const broker = new ServiceBroker({ logger: false });
		const ridesService = broker.createService(RidesService);
		const vehicleService = broker.createService(VehicleService);
		const apiService = broker.createService(APISchema);
		const userService = broker.createService(UserService);
		broker.createService(PromoCodeService);
		broker.createService(PromoCodeUserService);
		const requestCreateRide = require("supertest");
		const requestUpdateRide = require("supertest");

		const vehicleId = "00000000-0000-4000-8000-000000000000";
		let storage = {};
		beforeEach(() => broker.start());
		afterEach(() => broker.stop());
		beforeAll(() => {
			storage = {};
		});
		let authCredentials = 'Basic NjY2NjY2NjYtNjY2Ni00NDAwLTgwMDAtMDAwMDAwMDAwMDBmOjEyMzQ1Ng==';

		it("create ride", () => {
			return requestCreateRide(apiService.server)
				.post("/v1/ride")
				.send({
					vehicleId: vehicleId,
					city: "new york",
					promoCode: "0_explain_theory_something",
				})
				.set('Authorization', authCredentials)
				.then(res => {
					expect(res.statusCode).toBe(200);
					storage = res.body;
				});
		});

		it('broke vehicle', () => {
			return requestUpdateRide(apiService.server)
				.put("/v1/ride")
				.send({
					riderId: storage.rideId,
					endAddress: "some address",
					status: "broken"
				})
				.set('Authorization', authCredentials)
				.then(async updateRes => {
					let rideId = storage.rideId;
					expect(updateRes.statusCode).toBe(200);
					const vehicle = await vehicleService.adapter.findById(vehicleId);
					expect(vehicle.dataValues.status).toBe('broken');

					const ride = await ridesService.adapter.findById(rideId);
					expect(parseFloat(ride.dataValues.revenue)).toBe(0);
					console.log({
						rideId,
						vehicle: vehicle.dataValues,
						ride: ride.dataValues,
					})
				})
		});
	});

});

