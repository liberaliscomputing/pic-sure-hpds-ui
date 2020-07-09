define(["text!../settings/settings.json","common/spinner", "output/dataSelection", "text!output/outputPanel.hbs","picSure/resourceMeta", "picSure/ontology", "picSure/queryCache", "backbone", "handlebars", "overrides/outputPanel"],
		function(settings, spinner, dataSelection, outputTemplate, resourceMeta, ontology, queryCache, BB, HBS, overrides){
	var outputModelDefaults = {
			totalPatients : 0,
			spinnerClasses: "spinner-medium spinner-medium-center ",
			spinning: false,
			resources : {}
	};
	
	_.each(resourceMeta, (resource) => {
		outputModelDefaults.resources[resource.id] = {
				id: resource.id,
				name: resource.name,
				patientCount: 0,
				spinnerClasses: "spinner-center ",
				spinning: false
		};
	});
	var outputModel = BB.Model.extend({
		defaults: outputModelDefaults,
		spinAll: function(){
			this.set('spinning', true);
			this.set('queryRan', false);
		}
	});

	var outputView = BB.View.extend({
		ontology: ontology,
		initialize: function(){
			this.template = HBS.compile(outputTemplate);
			overrides.renderOverride ? this.render = overrides.renderOverride.bind(this) : undefined;
			overrides.update ? this.update = overrides.update.bind(this) : undefined;
			HBS.registerHelper("outputPanel_obfuscate", function(count){
				if(count < 10 && false){
					return "< 10";
				} else {
					return count;
				}
			});
		},
		events:{
			"click #select-btn": "select"
		},
		select: function(event){
			
			this.model.set('spinning', true);
			if(!this.dataSelection){
				var query = JSON.parse(JSON.stringify(this.model.get("query")));
				this.dataSelection = new dataSelection({query:query});
				$("#concept-tree-div",this.$el).append(this.dataSelection.$el);
				this.model.set("spinning", false);
				this.dataSelection.render();
			}
		},
		totalCount: 0,
		tagName: "div",
		update: function(incomingQuery){
			this.model.set("totalPatients",0);

			this.model.spinAll();
			this.render();

			// make a safe deep copy of the incoming query so we don't modify it
			var query = JSON.parse(JSON.stringify(incomingQuery));
			query.resourceUUID = JSON.parse(settings).picSureResourceId;
			query.resourceCredentials = {};
			query.query.expectedResultType="COUNT";
			this.model.set("query", query);

			if(this.dataSelection){
				this.dataSelection.updateQuery(query);
				this.dataSelection.render();
			}

			var dataCallback = function(result){
				this.model.set("totalPatients", parseInt(result));
				this.model.set("spinning", false);
				this.model.set("queryRan", true);
				this.render();
			}.bind(this);

			var errorCallback = function(message){
				this.model.set("spinning", false);
                                        this.model.set("queryRan", true);
                                        this.render();
				$("#patient-count").html(message);
			}.bind(this);

			$.ajax({
			 	url: window.location.origin + "/picsure/query/sync",
			 	type: 'POST',
			 	headers: {"Authorization": "Bearer " + JSON.parse(sessionStorage.getItem("session")).token},
			 	contentType: 'application/json',
			 	data: JSON.stringify(query),
			 	success: function(response){
			 		dataCallback(response);
			 	},
			 	error: function(response){
					if (response.status === 401) {
						sessionStorage.clear();
						window.location = "/";
					} else {
						response.responseText = "<h4>"
							+ overrides.outputErrorMessage ? overrides.outputErrorMessage : "There is something wrong when processing your query, please try it later, if this repeats, please contact admin."
							+ "</h4>";
				 		errorCallback(response.responseText);//console.log("error");console.log(response);
					}
				}
			});
		},
		render: function(){
			var context = this.model.toJSON();
			this.$el.html(this.template(Object.assign({},context , overrides)));
			if(this.dataSelection){
				this.dataSelection.setElement($("#concept-tree-div",this.$el));
				this.dataSelection.render();
			}
		}
	});
	
	
	return {
		View : new (overrides.viewOverride ? overrides.viewOverride : outputView)({
			model: new (overrides.modelOverride ? overrides.modelOverride : outputModel)()
		})
	}
});
