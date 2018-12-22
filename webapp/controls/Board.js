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
		},
		
		attachMove:function(cbFn){
			this.attachBrowserEvent('touchmove', function(e){
				var touch,x,y;
				if (!e) e = event;
				if(e.touches && e.touches.length == 1) {
					touch = e.touches[0];
					x=touch.pageX;
					y=touch.pageY;
				}
				var elem;
				if (x&&y) elem=$(document.elementFromPoint(x,y)).control();
				if (cbFn && elem && elem[0]) {
					if (elem[0].getMetadata().getName()=='com.minesnf.ui5client.controls.Cell') cbFn(elem[0]);
				}
				e.preventDefault();
			});
		},
	});
});