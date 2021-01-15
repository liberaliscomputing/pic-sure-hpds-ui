define(["jquery", "handlebars", "backbone", "picSure/resourceMeta", "picSure/queryCache"], function ($, HBS, BB, resourceMeta, queryCache) {
	return {
		/*
		 * This should be a function that returns the name of a Handlebars partial
		 * that will be used to render the count. The Handlebars partial should be
		 * registered at the top of this module.
		 */
		countDisplayOverride : undefined,
		/*
		 * This is a function that if defined replaces the normal render function
		 * from outputPanel.
		 */
		renderOverride : undefined,
		/*
		 * If you want to replace the entire Backbone.js View that is used for
		 * the output panel, define it here.
		 */
		viewOverride : undefined,
		/*
		 * If you want to replace the entire Backbone.js Model that is used for
		 * the output panel, define it here.
		 */
		modelOverride : undefined,
		/*
		 * In case you want to change the update logic, but not the rendering or
		 * anything else, you can define a function that takes an incomingQuery
		 * and dispatches it to the resources you choose, and handles registering
		 * callbacks for the responses and error handling.
		 */
		update: function (incomingQuery) {
			this.model.set("totalPatients", 0);
			
			this.model.spinAll();
			this.render();

			_.each(resourceMeta, function (picsureInstance) {
				// make a safe deep copy of the incoming query so we don't modify it
				var query = JSON.parse(JSON.stringify(incomingQuery));

				var dataCallback = function (result) {
					if (result === undefined || result.status === "ERROR") {
						this.model.get("resources")[picsureInstance.id].patientCount = 0;
					} else {
						var count = parseInt(result.data[0][0].patient_set_counts);
						this.model.get("resources")[picsureInstance.id].queryRan = true;
						this.model.get("resources")[picsureInstance.id].patientCount = count;
						this.model.set("totalPatients", this.model.get("totalPatients") + count);
					}

					this.model.get("resources")[picsureInstance.id].spinning = false;
					if (_.every(this.model.get("resources"), function (resource) { return resource.spinning === false; })) {
						this.model.set("spinning", false);
						this.model.set("queryRan", true);
					}
					this.render();
				}.bind(this);

				queryCache.submitQuery(
					picsureInstance,
					query,
					picsureInstance.id,
					dataCallback
				);
			}.bind(this));
		},
		/*
		 * If you want to show your customized error message, please override this
		 */
		outputErrorMessage: undefined,
		/*
		 * A function to make any necessary updates to the query before submitting
		 */
		updateConsentFilters : undefined
	};
});
