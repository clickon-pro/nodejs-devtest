"use strict";

const fs = require("fs");
const DbService	= require("moleculer-db");
const Sequelize = require("sequelize");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = function(collection) {
	const cacheCleanEventName = `cache.clean.${collection}`;

	const models = {
		promoCodeUser: {
			name: "user_promo_codes",
			define: {
				city: {type: Sequelize.STRING, primaryKey: true},
				user_id: {type: Sequelize.STRING, primaryKey: true},
				code: {type: Sequelize.STRING, primaryKey: true},
				timestamp: {
					type: 'TIMESTAMP'
				},
				usage_count: Sequelize.INTEGER,
			},
			options: {
				timestamps: false,
			},
		},
		promoCodes: {
			name: "promo_codes",
			define: {
				code: {
					type: Sequelize.STRING,
					primaryKey: true
				},
				description: Sequelize.STRING,
				creation_time: {
					type: 'TIMESTAMP'
				},
				expiration_time: {
					type: 'TIMESTAMP'
				},
				rules: 'JSONB'
			},
			options: {
				timestamps: false,
			},
		},
		users: {
			name: "users",
			define: {
				id: {
					type: Sequelize.UUID,
					primaryKey: true
				},
				city: Sequelize.STRING,
				name: Sequelize.STRING,
				address: Sequelize.STRING,
				credit_card: Sequelize.STRING,
			},
			options: {
				timestamps: false,
			},
		},
		vehicles: {
			name: "vehicles",
			define: {
				id: {
					type: Sequelize.UUID,
					primaryKey: true
				},
				city: Sequelize.STRING,
				type: Sequelize.STRING,
				owner_id: Sequelize.UUID,
				creation_time: {
					type: 'TIMESTAMP'
				},
				status: Sequelize.STRING,
				current_location: Sequelize.STRING,
				ext: 'JSONB'
			},
			options: {
				timestamps: false,
			},
		},
		rides: {
			name: "rides",
			define: {
				id: {
					type: Sequelize.UUID,
					primaryKey: true
				},
				city: Sequelize.STRING,
				vehicle_city: Sequelize.STRING,
				rider_id: Sequelize.UUID,
				vehicle_id: Sequelize.UUID,
				start_address: Sequelize.STRING,
				end_address: Sequelize.STRING,
				start_time: 'TIMESTAMP',
				end_time: 'TIMESTAMP',
				revenue: 'NUMERIC(10,2)'
			},
			options: {
				timestamps: false,
			},
		}
	};

	const schema = {
		mixins: [DbService],
		model: models[collection] || {},
		events: {
			/**
			 * Subscribe to the cache clean event. If it's triggered
			 * clean the cache entries for this service.
			 *
			 * @param {Context} ctx
			 */
			async [cacheCleanEventName]() {
				if (this.broker.cacher) {
					await this.broker.cacher.clean(`${this.fullName}.*`);
				}
			}
		},

		methods: {
			/**
			 * Send a cache clearing event when an entity changed.
			 *
			 * @param {String} type
			 * @param {any} json
			 * @param {Context} ctx
			 */
			async entityChanged(type, json, ctx) {
				ctx.broadcast(cacheCleanEventName);
			}
		},

		async started() {
			// Check the count of items in the DB. If it's empty,
			// call the `seedDB` method of the service.
			if (this.seedDB) {
				const count = await this.adapter.count();
				if (count == 0) {
					this.logger.info(`The '${collection}' collection is empty. Seeding the collection...`);
					await this.seedDB();
					this.logger.info("Seeding is done. Number of records:", await this.adapter.count());
				}
			}
		}
	};

	const sequelizeDbAdapter = require("moleculer-db-adapter-sequelize");

	const path = `${__dirname}/../keys/cc-ca.crt`;
	let opts = {
		dialect: "postgres",
		username: process.env.COCKROACH_LOGIN,
		password: process.env.COCKROACH_PASS,
		host: process.env.COCKROACH_HOST,
		port: process.env.COCKROACH_PORT,
		database: process.env.COCKROACH_DB,
		dialectOptions: {
			ssl: {
				rejectUnauthorized: false,
				// For secure connection:
				ca: fs.readFileSync(path)
					.toString()
			},
		},
		logging: false,
	};
	schema.adapter = new sequelizeDbAdapter(opts);

	schema.collection = collection;
	return schema;
};
