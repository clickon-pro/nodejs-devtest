"use strict";

const DbMixin = require("../mixins/db.mixin");
const ApiGateway = require("moleculer-web");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "rides",

	mixins: [DbMixin("rides")],

	/**
	 * Settings
	 */
	settings: {

	},

	/**
	 * Dependencies
	 */
	dependencies: [],

	/**
	 * Actions
	 */
	actions: {

		/**
		 * @returns
		 */
		create: {
			params: {
				vehicleId: 'string',
			},
			async handler(ctx) {
				const vehicle = await ctx.broker.call('vehicles.getById', ctx.params.vehicleId)
				if(!vehicle){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', 'Vehicle is not found');
				}

				if(vehicle.dataValues.status !== 'available'){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', 'Vehicle is unavailable');
				}

				const city = ctx.params.city || ctx.meta.user.dataValues.city;
				if(city !== vehicle.dataValues.city){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', 'Vehicle is unavailable in your city');
				}

				if(ctx.params.promoCode){
					const promoCode = await ctx.broker.call('promoCodes.getByCode', {
						code: ctx.params.promoCode
					});
					if(promoCode){
						await ctx.broker.call('promoCodeUser.setForUser', {
							code: ctx.params.promoCode,
							userId: ctx.meta.user.id,
							city
						});
					}
				}

				/*const updateRes = await ctx.broker.call('vehicles.setStatus', {
					id: vehicle.id,
					status: 'in_use'
				});*/
				const tryRes = await ctx.broker.call('vehicles.tryUse', {
					id: vehicle.id
				});
				if(!tryRes){
					throw new ApiGateway.Errors.ServiceUnavailableError('SERVER_ERROR', 'Error race condition - Vehicle is unavailable');
				}

				let rideId = this.broker.generateUid();
				await this.adapter.insert({
					city,
					vehicle_city: city,
					rider_id: ctx.meta.user.dataValues.id,
					vehicle_id: vehicle.id,
					start_address: ctx.params.startAddress || vehicle.current_location,
					id: rideId,
					start_time: new Date(),
				});

				return {
					rideId
				};
			},
		},

		/**
		 * @returns
		 */
		update: {
			params: {
				riderId: "string",
				endAddress: "string",
				status: "string",
			},
			async handler(ctx) {
				let rideId = ctx.params.riderId;
				let status = ctx.params.status;
				let availableStatuses = ['finished', 'broken'];
				if(availableStatuses.indexOf(status) === -1){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', `Invalid status. Correct statuses: ${availableStatuses.join(', ')}`);
				}

				const ride = await this.adapter.findById(rideId);
				if(!ride){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', 'Ride is not found');
				}

				if(ride.dataValues.end_time){
					throw new ApiGateway.Errors.BadRequestError('INVALID_DATA', 'Ride already finished');
				}

				let coefficient = 100;
				let revenue = 0;
				if(status === 'finished'){
					revenue = Math.ceil((new Date().getTime() - ride.dataValues.start_time.getTime()) / 1000 / 60 / 60) * coefficient;
					if(revenue < coefficient){
						revenue = coefficient;
					}

					const promoCode = await ctx.broker.call('promoCodeUser.findOne', {
						userId: ctx.meta.user.id,
						city: ride.city
					})
					if(promoCode){
						await ctx.broker.call('promoCodeUser.markUse', {
							code: promoCode.dataValues.code,
							userId: ctx.meta.user.id,
							city: ride.city
						})
						switch (promoCode.dataValues.rules.type){
							case 'percent_discount':
								revenue = Math.ceil(((100 - parseFloat(promoCode.dataValues.rules.value)) / 100) * revenue);
								break;
						}
					}
				}

				let endAddress = ctx.params.endAddress;
				const updateResult = await this.adapter.db.model('rides').update({
					end_address: endAddress,
					end_time: new Date(),
					revenue,
				}, {
					where: {
						id: rideId
					}
				});

				if(updateResult[0] === 0){
					throw new ApiGateway.Errors.BadRequestError('SERVER_ERROR', 'Error while ride update');
				}

				await ctx.broker.call('vehicles.update', {
					id: ride.dataValues.vehicle_id,
					status: status === 'finished' ? 'available' : 'broken',
					current_location: endAddress
				})

				return true;
			}
		},
	},

	/**
	 * Events
	 */
	events: {

	},

	/**
	 * Methods
	 */
	methods: {

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
