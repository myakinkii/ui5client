sap.ui.define([
	'sap/ui/core/Control',
	'sap/ui/core/theming/Parameters'
], function (Control,Parameters){
		"use strict";

	return Control.extend("com.minesnf.ui5client.controls.Board", {
		metadata : {
			properties : {
				"boxColor" :  {type: "sap.ui.core.CSSColor", defaultValue: Parameters.get("sapUiBrand")},
				"rows":"int",
				"cols":"int",
			},
			aggregations: { 
				content: {singularName: "content"}
			}
		},
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.writeClasses();
			oRm.write(">");

			oControl.getContent().forEach(function(child){
				oRm.write("<div");
				oRm.addStyle("display", "inline-block");
				// oRm.addStyle("border", "1px solid " + oControl.getBoxColor());
				oRm.addStyle("margin", "1px");
				oRm.writeStyles();
				oRm.write(">");
				oRm.renderControl(child);
				oRm.write("</div>");
			});
			oRm.write("</div>");
		}	
	});
});