"use strict";

const DbMixin = require("../mixins/db.mixin");
const ApiGateway = require("moleculer-web");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "promoCodeUser",

	mixins: [DbMixin("promoCodeUser")],

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
		markUse: {
			params: {
				code: 'string',
				userId: 'string',
				city: 'string'
			},
			async handler(ctx) {
				const updateResult = await this.adapter.db.model('user_promo_codes').update({
					usage_count: 1,
				}, {
					where: {
						code: ctx.params.code,
						user_id: ctx.params.userId,
						city: ctx.params.city,
					}
				});
				return updateResult[0] > 0;
			}
		},

		/**
		 * @returns
		 */
		setForUser: {
			params: {
				code: 'string',
				userId: 'string',
				city: 'string'
			},
			async handler(ctx) {
				try {
					await this.adapter.insert({
						code: ctx.params.code,
						user_id: ctx.params.userId,
						city: ctx.params.city,
						timestamp: new Date(),
						usage_count: 0,
					})
					return true;
				} catch (e) {
					return false;
				}
			},
		},

		/**
		 * @returns
		 */
		findOne: {
			params: {
				userId: 'string',
				city: 'string'
			},
			async handler(ctx) {
				const userCode = await this.adapter.db.model('user_promo_codes').findOne({
					where: {
						user_id: ctx.params.userId,
						city: ctx.params.city,
					},
					sort: {
						timestamp: 'desc'
					}
				});
				if(!userCode){
					return null;
				}
				if(Number(userCode.dataValues.usage_count) > 0){
					return null;
				}
				return await ctx.broker.call('promoCodes.getByCode', {
					code: userCode.dataValues.code,
				});
			},
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
