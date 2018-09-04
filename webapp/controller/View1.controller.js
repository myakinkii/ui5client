sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"libs/nowjs/now",
	"sap/m/Dialog","sap/m/Button"
], function (Controller,JSONModel,now,Dialog,Button) {
	"use strict";

	return Controller.extend("com.minesnf.ui5client.controller.View1", {
		
		onInit:function(){
			var mdl=new JSONModel({evts:{},msg:''});
			this.getView().setModel(mdl);
			var self=this;
			if (!window.now) window.now = nowInitialize("http://minesnf.com", {});
			window.now.dispatchEvent=function(e){ self.processEvent.call(self,e) };
			window.setTimeout(function(){ self.processCommand=window.now.processCommand; },500);
			this.getView().byId("input").attachBrowserEvent('keypress', function(e){
				if(e.which == 13){ self.sendMsg.call(self);
			}});
		},
		
		sendMsg:function(e){
			var mdl=this.getView().getModel();
			var msg=mdl.getProperty('/msg');
			this.processCommand(msg);
			mdl.setProperty('/msg','');
		},

		processEvent:function(e){
			var mdl=this.getView().getModel();
			e.ts=Date.now();
			e.argTxt=JSON.stringify(e.arg); 
			mdl.setProperty('/evts/'+e.ts,e);
			if (this['on'+e.func]) this['on'+e.func](e);
			// console.log(e);
		},

		onUpdateParties:function(e){
			console.log("parties",e.arg);
			this.getView().getModel().setProperty('/parties',e.arg);
		},

		onUpdatePlayers:function(e){
			var players=[];
			for (var p in e.arg) { e.arg[p].name=p; players.push(e.arg[p]); }
			console.log("players",players);
			this.getView().getModel().setProperty('/players',players);
		},

		startRank:function(e){
			var boardSize=e.getSource().data().boardSize;
			console.log(boardSize);
			this.processCommand('/create rank '+boardSize);
		},

		onStartGame: function (e) {
			var self = this;
			var title=e.arg.boardId+" ("+e.arg.c+"x"+e.arg.r+")";
			if (!this.pressDialog) {
				this.pressDialog = new Dialog({
					title: title,
					content: [],
					beginButton: new Button({
						text: '{i18n>genericClose}',
						press: function () { self.pressDialog.close(); self.processCommand("/quit"); }
					})
				});
				this.getView().addDependent(this.pressDialog);
			}
			this.pressDialog.setTitle(title);
			this.pressDialog.open();
		}

	});
});
