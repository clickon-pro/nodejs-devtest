"use strict";

const DbMixin = require("../mixins/db.mixin");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "vehicles",

	mixins: [DbMixin("vehicles")],

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
		 * Say a 'Hello' action.
		 *
		 * @returns
		 */
		list: {
			rest: {
				method: "GET",
				path: "/"
			},
			async handler() {
				const res = await this.adapter.db.query(`SELECT * FROM vehicles WHERE status = 'available'`);
				return res[0];
			}
		},
		getById: {
			async handler(ctx) {
				const id = ctx.params;
				return await this.adapter.findById(id);
			},
		},
		setStatus: {
			params: {
				id: 'string',
				status: 'string',
			},
			async handler(ctx) {
				return await ctx.broker.call('vehicles.update', {
					id: ctx.params.id,
					status: ctx.params.status,
				})
			},
		},
		tryUse: {
			params: {
				id: 'string'
			},
			async handler(ctx) {
				const res = await this.adapter.db.query(`
					WITH checkVehicle AS (
						SELECT id, status
						FROM vehicles
						WHERE
							id = '${ctx.params.id}'
					), upd AS (
						UPDATE vehicles
						SET status = 'in_use'
						FROM checkVehicle
						WHERE checkVehicle.status = 'available'
						AND vehicles.id = checkVehicle.id
						RETURNING vehicles.id
					)
					SELECT * FROM upd
				`);
				let resId	=	undefined;
				if(res[0] && res[0][0]){
					resId	=	res[0][0].id;
				}
				return resId;
			},
		},
		update: {
			params: {
				id: 'string',
				status: 'string',
			},
			async handler(ctx) {
				const updateResult = await this.adapter.db.model('vehicles').update({
					status: ctx.params.status,
					current_location: ctx.params.current_location,
				}, {
					where: {
						id: ctx.params.id
					}
				});
				return updateResult[0] !== 0;
			},
		}
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
