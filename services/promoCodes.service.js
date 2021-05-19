"use strict";

const DbMixin = require("../mixins/db.mixin");
const ApiGateway = require("moleculer-web");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "promoCodes",

	mixins: [DbMixin("promoCodes")],

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
		getByCode: {
			params: {
				code: 'string'
			},
			async handler(ctx) {
				const { Op } = require("sequelize");
				let now = new Date();
				return  await this.adapter.db.model('promo_codes').findOne({
					where: {
						code: ctx.params.code,
						expiration_time: {
							[Op.gt]: now,
						},
						creation_time: {
							[Op.lte]: now,
						}
					}
				})
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
