sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"libs/nowjs/now",
], function (Controller,JSONModel,now) {
	"use strict";

	return Controller.extend("com.minesnf.ui5client.controller.View1", {
		
		onInit:function(){
			var mdl=new JSONModel({evts:{},msg:''});
			this.getView().setModel(mdl);
			window.now.dispatchEvent=function(e){e.ts=Date.now(); e.argTxt=JSON.stringify(e.arg); console.log(e); mdl.setProperty('/evts/'+e.ts,e)};
			var self=this;
			window.setTimeout(function(){ self.processCommand=window.now.processCommand; },500);
this.getView().byId("input").attachBrowserEvent('keypress', function(e){
     if(e.which == 13){
         self.sendMsg.call(self);
     }
});
		},
		
		sendMsg:function(e){
			var mdl=this.getView().getModel();
			var msg=mdl.getProperty('/msg');
			this.processCommand(msg);
			mdl.setProperty('/msg','');
		}

	});
});
