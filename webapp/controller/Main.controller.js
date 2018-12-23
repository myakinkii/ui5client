sap.ui.define([
	"libs/nowjs/now",
	"com/minesnf/ui5client/controller/BaseController",
	"com/minesnf/ui5client/controller/GameMixin",
	"com/minesnf/ui5client/controller/InventoryMixin",
	"com/minesnf/ui5client/controller/UserMixin",
	"com/minesnf/ui5client/controller/PartyMixin",
	"sap/ui/model/json/JSONModel"
], function (now, BaseController, GameMixin, InventoryMixin, UserMixin, PartyMixin, JSONModel) {
	"use strict";

	return BaseController.extend("com.minesnf.ui5client.controller.Main", {

		onInit:function(){
			// just patch controller with some stuff I ripped out of it due to lots of badly written code in controller
			jQuery.extend(this, GameMixin.prototype, InventoryMixin.prototype, UserMixin.prototype, PartyMixin.prototype);
			
			var self=this;
			
			this.forceOfflineMode=window.localStorage.getItem("forceOfflineMode")?true:false; // user wants only local game
			this.offlineMode=this.forceOfflineMode; // current state of offline/online mode
			var onlineModeAvailble=true; // not inside webide
			var onlineOnlyClient=typeof Connection == "undefined"; // web ui client
			var initData=this.getOwnerComponent().getComponentData();
			if (initData && initData.offlineMode) {
				this.offlineMode=true;
				onlineModeAvailble=false;
				onlineOnlyClient=false;
			} else if (!onlineOnlyClient && navigator.connection && navigator.connection.type==Connection.NONE) {
				this.offlineMode=true;
			}
			
			this.getView().setModel(new JSONModel({
				quickMode:"local",
				evts:{},
				msg:'',
				auth:{},
				altKeyMode:false,
				showPane:false,
				gameStarted:false,
				onlineModeAvailble:onlineModeAvailble,
				offlineMode:this.offlineMode,
				onlineOnlyClient:onlineOnlyClient
			}));
			
			// this.getView().byId("input").attachBrowserEvent('keypress', function(e){
			// 	if(e.which == 13) self.sendMsg.call(self);
			// });
			
			sap.ui.getCore().getEventBus().subscribe(
				"message",
				function(channel,evtId,evtData){
					self.processEvent.call(self,evtData); 
				}
			);
			
			this.initInventory();

			if (this.offlineMode) {
				this.onAuthorize({});
				this.onUpdateParties({});
			} else this.initNow();
			
			document.addEventListener("online", function(){self.deviceOnline.call(self);}, false);
			document.addEventListener("offline", function(){self.deviceOffline.call(self);}, false);
		},
		
		deviceOnline:function(){
			if (!this.forceOfflineMode) {
				this.getView().getModel().setProperty('/offlineMode', false);
				this.initNow();
			}
		},
		
		deviceOffline:function(){
			this.getView().getModel().setProperty('/offlineMode', true);
		},
		
		switchMode:function(){
			if (this.getView().getModel().getProperty('/offlineMode')){
				this.forceOfflineMode=true;
				window.localStorage.setItem("forceOfflineMode",'force');
			} else {
				this.forceOfflineMode=false;
				window.localStorage.removeItem("forceOfflineMode");
				if (navigator.connection.type==Connection.NONE) this.getView().getModel().setProperty('/offlineMode',true);
				else {
					this.getView().getModel().setProperty('/offlineMode', false);
					this.initNow();
				}
			}
		},
		
		formatMode:function(offline,onlineModeAvailble){
			if (this.forceOfflineMode || !onlineModeAvailble) return 'forced Offline';
			if (offline) return 'Offline';
			return 'Online';
		},
		
		handleAltToggle:function(e){
			var mdl=this.getView().getModel();
			mdl.setProperty('/altKeyMode',!mdl.getProperty('/altKeyMode'));
		},
		
		handleShowPane:function(e){
			var mdl=this.getView().getModel();
			mdl.setProperty('/showPane',!mdl.getProperty('/showPane'));
		},		
		
		initNow:function(){
			var self=this;
			this.setBusy(this.geti18n("initClient"));
			if (!window.now) {
				var srv="http://minesnf.com";
				$.ajax({ type: "GET", url: srv, async: false }); // just to init session
				window.now = nowInitialize(srv);
			}
			window.now.dispatchEvent=function(e){ self.processEvent.call(self,e) };
			window.now.ready(function(){
				self.clearBusy();
				self.nowReady=true;
			});
		},
		
		processCommand:function(s){
			// var localGame=this.getView().getModel().getProperty('/offlineMode');
			var cmd=s.split(" ");
			var me=this.getView().getModel().getProperty('/auth/user');
			if (this.localGame && cmd[0]=="/check"){
				this.localGame.dispatchEvent({ user:me, command:"checkCell", pars:[cmd[1],cmd[2]] });
			} else if (this.nowReady) window.now.processCommand(s); 
		},

		processEvent:function(e){
			var mdl=this.getView().getModel();
			e.ts=Date.now();
			e.argTxt=JSON.stringify(e.arg); 
			mdl.setProperty('/evts/'+e.ts,e);
			if (this['on'+e.func]) this['on'+e.func](e);
		},
		
		// sendMsg:function(e){
		// 	var mdl=this.getView().getModel();
		// 	var msg=mdl.getProperty('/msg');
		// 	this.processCommand(msg);
		// 	mdl.setProperty('/msg','');
		// },
		
		closeDlg:function(e){ e.getSource().getParent().close(); },
		
		// callbacks to events that are used in view and fragments must be declared explicitly
		// otherwise functions in "mixins" are not being called 
		// actually this is just "lazy refactoring" of bad code design pattern "MyControllerIsMyModel"
		handleShowAuthDlg:function(){ this.showAuthDlg(); },
		handleAuthUser:function(){ this.authUser(); },
		handleLogOff:function(){ this.logOff(); },
		handlePressParty:function(e){ this.pressParty(e); },
		handleStartParty:function(e){ this.startParty(e); },
		handleKickUser:function(e){ this.kickUser(e); },
		handleDismissParty:function(){ this.dismissParty(); },
		handleQuitGame:function(){ this.quitGame(); },
		handleFuseDigit:function(e){ this.fuseDigit(e); },

	});
});
