sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/BusyDialog","sap/m/MessageToast"
], function (Controller,BusyDialog,MessageToast){
	"use strict";
	
	return Controller.extend("com.minesnf.ui5client.controller.BaseController",{

		geti18n: function(prop, arr) {
			if (!this._i18nbndl) this._i18nbndl = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			return this._i18nbndl.getText(prop, arr);
		},

		showToast: function(text, time) {
			MessageToast.show(text, {
				autoClose: true,
				width: '50%',
				duration: time || 1000,
				at: sap.ui.core.Popup.Dock.CenterCenter
			});
		},

		setBusy: function(msg) {
			if (!this._busyDialog) this._busyDialog = new BusyDialog({
				title: this.geti18n('genericBusyTitle')
			});
			this._busyDialog.setText(msg || this.geti18n('genericBusyText'));
			this._busyDialog.open();
		},

		clearBusy: function(msg, time) {
			if (this._busyDialog) this._busyDialog.close();
			if (msg) this.showToast(msg, time || 500);
		}
	});
});