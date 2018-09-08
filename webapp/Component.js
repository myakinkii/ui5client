sap.ui.define([
	"com/minesnf/ui5client/model/models",
	"sap/ui/core/UIComponent"
], function (models,UIComponent) {
	"use strict";
	return UIComponent.extend("com.minesnf.ui5client.Component", {
		metadata: { manifest: "json" },
		init: function () {
            UIComponent.prototype.init.apply(this, arguments);
			this.setModel(models.createDeviceModel(), "device");
		}
	});
});
