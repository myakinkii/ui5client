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
			
			var forceOfflineMode=window.localStorage.getItem("forceOfflineMode")?true:false; // user wants only local game
			var offlineMode=forceOfflineMode; // current state of offline/online mode
			var onlineModeAvailble=true; // not inside webide
			var onlineOnlyClient=typeof Connection == "undefined"; // web ui client
			var initData=this.getOwnerComponent().getComponentData();
			if (initData && initData.offlineMode) {
				offlineMode=true;
				onlineModeAvailble=false;
				onlineOnlyClient=false;
			} else if (!onlineOnlyClient && navigator.connection && navigator.connection.type==Connection.NONE) {
				offlineMode=true;
			}
			
			var srvs={};
			if (!onlineOnlyClient && !offlineMode) {
				var syncRequest=$.ajax({url:"http://minesnf.com/srv.json",async:false});
				if (syncRequest.readyState==4 && syncRequest.status==200){
					srvs=JSON.parse(syncRequest.responseText).reduce(function(prev,cur){prev[cur.url]=cur; return prev;},{});
				}
			}
			var srv=window.localStorage.getItem("srv")||'global.minesnf.com';
			var customSrv=(srv!='global.minesnf.com');
			if (!srvs[srv]) srvs[srv]={url:srv,name:srv};
			
			this.getView().setModel(new JSONModel({
				quickMode:"local",
				evts:{},
				msg:'',
				auth:{},
				altKeyMode:false,
				showPane:false,
				page:'game',
				gameStarted:false,
				srvs:srvs,
				srv:srv,
				customSrv:customSrv,
				offlineMode:offlineMode,
				forceOfflineMode:forceOfflineMode,
				showOfflineButton:!onlineOnlyClient&&onlineModeAvailble
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

			if (offlineMode) {
				this.onAuthorize({});
				this.onUpdateParties({});
			} else this.initNow(srv);
			
			document.addEventListener("online", function(){self.deviceOnline.call(self);}, false);
			document.addEventListener("offline", function(){self.deviceOffline.call(self);}, false);
		},
		
		deviceOnline:function(){
			var mdl=this.getView().getModel();
			var forceOffline=mdl.getProperty('/forceOfflineMode');
			if (!forceOffline) {
				mdl.setProperty('/offlineMode', false);
				this.initNow();
			}
		},
		
		deviceOffline:function(){
			this.getView().getModel().setProperty('/offlineMode', true);
		},
		
		switchMode:function(){
			var mdl=this.getView().getModel();
			var forceOffline=mdl.getProperty('/forceOfflineMode');
			if (!forceOffline){
				window.localStorage.setItem("forceOfflineMode",'force');
				mdl.setProperty('/offlineMode',true);
				mdl.setProperty('/forceOfflineMode',true);
			} else {
				window.localStorage.removeItem("forceOfflineMode");
				mdl.setProperty('/forceOfflineMode',false);
				if (navigator.connection.type==Connection.NONE) {
					mdl.setProperty('/offlineMode',true);
				} else {
					mdl.setProperty('/offlineMode', false);
					this.initNow();
				}
			}
		},
		
		formatModeIcon:function(offline){
			return 'sap-icon://'+(offline?'dis':'')+'connected';
		},
		
		switchPage:function(){
			var mdl=this.getView().getModel();
			var page=mdl.getProperty('/page');
			page=(page=='game'?'inv':'game');
			mdl.setProperty('/page',page);
			this.getView().byId("app").to(this.getView().byId(page),"flip");
		},
		
		formatPageIcon:function(page){
			return "sap-icon://"+(page=='game'?'lab':'home');
		},		
		
		handleAltToggle:function(e){
			var mdl=this.getView().getModel();
			mdl.setProperty('/altKeyMode',!mdl.getProperty('/altKeyMode'));
		},
		
		handleShowPane:function(e){
			var mdl=this.getView().getModel();
			mdl.setProperty('/showPane',!mdl.getProperty('/showPane'));
		},		
		
		initNow:function(defSrv){
			var self=this;
			var srv="http://"+(defSrv||this.getView().getModel().getProperty("/srv"));
			this.setBusy(this.geti18n("initClient"));
			if (!window.now) {
				$.ajax({ type: "GET", url: srv, async: false }); // just to init session
				window.now = nowInitialize(srv);
			}
			window.now.dispatchEvent=function(e){ self.processEvent.call(self,e) };
			window.now.ready(function(){
				self.clearBusy();
				self.nowReady=true;
			});
		},
		
		changeSrv:function(e){
			var srv=e.getSource().getSelectedKey()||e.getSource().getValue();
			this.getView().getModel().setProperty("srv",srv);
			window.localStorage.setItem("srv",srv);
			this.showToast(this.geti18n('genericOK')+'\n'+this.geti18n('genericAppRestartRequired'));
		},
		
		resetSrv:function(){
			window.localStorage.removeItem("srv");
			this.showToast(this.geti18n('genericOK')+'\n'+this.geti18n('genericAppRestartRequired'));
		},
		
		processCommand:function(s){
			// var localGame=this.getView().getModel().getProperty('/offlineMode');
			var cmd=s.split(" ");
			var me=this.getView().getModel().getProperty('/auth/user');
			if (this.localGame){
				if (cmd[0]=="/check") this.localGame.dispatchEvent({ user:me, command:"checkCell", pars:[cmd[1],cmd[2]] });
				else if (cmd[0]=="/hit") this.localGame.dispatchEvent({ user:me, command:"hitMob" });
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
		handleImportProfile:function(e){ this.importProfile(e); },
		handleExportProfile:function(e){ this.exportProfile(e); },
		handlePressParty:function(e){ this.pressParty(e); },
		handleStartParty:function(e){ this.startParty(e); },
		handleKickUser:function(e){ this.kickUser(e); },
		handleDismissParty:function(){ this.dismissParty(); },
		handleQuitGame:function(){ this.quitGame(); },
		handleFuseDigit:function(e){ this.fuseDigit(e); },
		handleForgeDigitButton:function(e){ this.changeForgeDigit(e); },
		handleForgeStart:function(e){ this.startForge(e); },
		handleForgeReset:function(e){ this.resetForge(e); },
		handleEquipGem:function(e){ this.equipGem(e); },
		handleHitMob:function(e){ this.hitMob(e); },
		handleFormatBattleLogIcon:function(){ return this.formatLogIcon.apply(this,[].slice.call(arguments)); },
		handleFormatBattleIconColor:function(){ return this.formatBattleIconColor.apply(this,[].slice.call(arguments)); },
		handleGemEffectFormatter:function(){ return this.formatGemEffect.apply(this,[].slice.call(arguments)); },
		handleInvGroupHeader:function(oGroup){ return this.getInvGroupHeader(oGroup); },
		handleInvTabChange:function(){ this.resetForge(); }

	});
});
