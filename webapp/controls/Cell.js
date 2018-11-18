sap.ui.define([
	'sap/ui/core/Control'
], function (Control){
	"use strict";
	
	var CELL_SIZE=28;
		
	return Control.extend("com.minesnf.ui5client.controls.Cell", {
		metadata : {
			properties : {
				"altKeyMode":"boolean",
				"checked":{type: "boolean", defaultValue: false},
				"row":"int",
				"col":"int",
				"val" : "string",
				"size" : {type: "sap.ui.core.CSSSize", defaultValue: CELL_SIZE+"px"}
			},
			events: {
				"openCell" : {}
			}
		},
		renderer : function(oRm, oControl) {

			oRm.write("<div"); 
			oRm.writeControlData(oControl);
			oRm.addStyle("width", oControl.getSize());
			oRm.addStyle("height", oControl.getSize());
			oRm.addStyle("text-align","center");
			var bgcolor="#fafafa";
			// var bgcolor="#fff'";
			var color=oControl.getVal()==''?oControl.getParent().getBoxColor():bgcolor;
			oRm.addStyle("border", "1px solid " + color);
			oRm.writeStyles();
			oRm.writeClasses();
			oRm.write(">");

			var val=oControl.getVal();
			var color=oControl.calcColor(val);
			oRm.write('<span style="vertical-align:middle;display:inline-block;color:'+color+'">');
			oRm.writeEscaped(val=='0'?'':val=="-8"?'*':val);
			oRm.write("</span>");

			oRm.write("</div>");
		},

		calcColor:function(val){
			return ['#aaa','#00f','#390','#f00','#309','#930','#099','#939','#000'][val];
		},

		onclick : function(evt) {
			this.fireOpenCell();
		},

		onmouseover : function(e) {
			if ( this.getAltKeyMode() && !e.altKey) this.fireOpenCell();
		}
	});
});	