sap.ui.define([
	"sap/ui/core/ws/WebSocket",
	"sap/ui/core/routing/HashChanger",
	"com/minesnf/ui5client/controller/BaseController",
	"com/minesnf/ui5client/controller/GameMixin",
	"com/minesnf/ui5client/controller/InventoryMixin",
	"com/minesnf/ui5client/controller/UserMixin",
	"com/minesnf/ui5client/controller/PartyMixin",
	"sap/ui/model/json/JSONModel"
], function (WebSocket, HashChanger, BaseController, GameMixin, InventoryMixin, UserMixin, PartyMixin, JSONModel) {
	"use strict";

	var ws;

	return BaseController.extend("com.minesnf.ui5client.controller.Main", {
		
		knownExternalCommands:{
			'join':'/join ',
			'spec':'/spec '
		},
		
		onHashChanged:function(extCmd,arg1){
			if (this.knownExternalCommands[extCmd]) this.processCommand(this.knownExternalCommands[extCmd]+arg1);
		},

		onInit:function(){
			// just patch controller with some stuff I ripped out of it due to lots of badly written code in controller
			jQuery.extend(this, GameMixin.prototype, InventoryMixin.prototype, UserMixin.prototype, PartyMixin.prototype);
			
			var self=this;
			
			var hasher=new HashChanger(); // use this guy to process external commands for web client or maybe on mobile as well
			hasher.attachEvent("hashChanged",function(){
				setTimeout(function(){ 
					self.onHashChanged.apply(self,hasher.getHash().split("/"));
				},100);
			});
			hasher.init();
			
			var forceOfflineMode=window.localStorage.getItem("forceOfflineMode")?true:false; // user wants only local game
			var offlineMode=forceOfflineMode; // current state of offline/online mode
			var onlineModeAvailble=true; // not inside webide
			var initData=this.getOwnerComponent().getComponentData();
			var onlineOnlyClient=initData && initData.localSrv; // web ui client
			if (initData && initData.offlineMode) {
				offlineMode=true;
				onlineModeAvailble=false;
				onlineOnlyClient=false;
			} else if (!onlineOnlyClient && navigator.connection && typeof Connection != 'undefined' && navigator.connection.type==Connection.NONE) {
				offlineMode=true;
			}
			
			var srvs={};
			var srv=window.localStorage.getItem("srv")||'global.minesnf.com';
			if (onlineOnlyClient) srv="/";
			var customSrv=(srv!='global.minesnf.com');
			if (!srvs[srv]) srvs[srv]={url:srv,name:srv};

			var cellSize = parseInt(window.localStorage.getItem("cellSize")||30);
			
			var mdl=new JSONModel({
				quickMode:"solo",
				evts:{},
				msg:'',
				auth:{},
				altKeyMode:false,
				showPane:false,
				page:'game',
				gameStarted:false,
				srvs:srvs,
				srv:srv,
				cellSize:cellSize,
				customSrv:customSrv,
				offlineMode:offlineMode,
				forceOfflineMode:forceOfflineMode,
				showOfflineButton:!onlineOnlyClient&&onlineModeAvailble
			});
			this.getView().setModel(mdl);
			
			if (!onlineOnlyClient && !offlineMode) {
				$.getJSON("http://minesnf.com/srv.json").then(function(re){
					srvs=re.reduce(function(prev,cur){prev[cur.url]=cur; return prev;},{});
					if (!srvs[srv]) srvs[srv]={url:srv,name:srv};
					mdl.setProperty("/srvs",srvs);
				});
			}
			
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

			this.partyDlg = this.getView().byId("party");
			this.partyDlg.setModel(new JSONModel(this.makePartyModel()));
			
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
		
		openUsersPopover:function(e){
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("com.minesnf.ui5client.view.Users", this);
				this.getView().addDependent(this._oPopover);
			}
			this._oPopover.openBy(e.getSource());
		},
		
		spectateUser:function(e){
			var user=e.getSource().getBindingContext().getProperty('name');
			var inGame=this.getView().getModel().getProperty('/gameStarted');
			if (inGame) this.showToast(this.geti18n('userCannotSpectateInGame'));
			else this.processCommand('/spec '+user);
		},
		
		initNow:function(defSrv){
			var self=this;
			this.setBusy(this.geti18n("initClient"));
			var host=(defSrv||this.getView().getModel().getProperty("/srv"));
			var srv;
			if (defSrv!="/"){
				srv="ws://"+host;
				createWS()
				// $.ajax({ type: "GET", url: 'http://'+host}).then(createWS);
			} else {
				srv=defSrv+"be";
				createWS();
			}
			function createWS(){
				ws = new WebSocket(srv);
				ws.attachMessage(function(e) {
					var json=JSON.parse(e.getParameter("data"));
					// console.log(json);
					self.processEvent.call(self,json);
				});
				self.clearBusy();
			}
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
			
		changeCellSize:function(e){
			var size = e.getParameter("value")
			window.localStorage.setItem("cellSize",size);
			this.showToast(this.geti18n('cellSizeChanged',[size]));
		},

		rpgCmds:{
			"/hit":'hitTarget',
			"/cast":'castSpell',
			"/assist":"assistAttack",
			"/defend":"defendPlayer",
			"/parry":"setParryState",
			"/evade":"setEvadeState",
			"/cancel":"cancelAction",
			"/steal":'stealLoot',
			"/flee":'fleeBattle',
			"/ascend":'ascendToFloor1',
			"/descend":'descendToNextFloor',
			"/equip":"equipGear",
			"/check":"checkCell"
		},
		
		processCommand:function(s){
			var me=this.getView().getModel().getProperty('/auth/user');
			if (this.localGame){
				var pars=s.split(" ");
				var cmd=pars.shift();
				if (this.rpgCmds[cmd]) this.localGame.dispatchEvent({ user:me, command:this.rpgCmds[cmd], pars:pars });
			} else ws.send(s);
			// } else if (this.nowReady) window.now.processCommand(s); 
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
		handleClearProfile:function(e){ this.clearProfile(e); },
		handleExportProfile:function(e){ this.exportProfile(e); },
		handlePressParty:function(e){ this.pressParty(e); },
		handleStartParty:function(e){ this.showCreatePartyDlg(e); },
		handleKickUser:function(e){ this.kickUser(e); },
		handleCreateParty:function(){ this.createParty(); },
		handleNewPartyOnlineChange:function(e){ this.onPartyOnlineChange(e); },
		handleNewPartyRPGChange:function(e){ this.onPartyRPGChange(e); },
		handleNewPartyBsizeChange:function(e){ this.onPartyBsizeChange(e); },
		handleNewPartyModeChange:function(e){ this.onPartyModeChange(e); },
		handleNewPartyPlayersChange:function(e){ this.onPartyPlayersChange(e); },
		handleDismissParty:function(){ this.dismissParty(); },
		handleQuitGame:function(){ this.quitGame(); },
		handleConfirmQuitGame:function(){ this.quitGameConfirm(); },
		handleFuseDigit:function(e){ this.fuseDigit(e); },
		handleForgeDigitButton:function(e){ this.changeForgeDigit(e); },
		handleForgeStart:function(e){ this.startForge(e); },
		handleForgeReset:function(e){ this.resetForge(e); },
		handleEquipGem:function(e){ this.equipGem(e); },
		handlePerformAction:function(e){ this.performAction(e); },
		handleSortProfiles:function(){ return this.sortProfiles.apply(this,[].slice.call(arguments)); },
		handleSortEquip:function(){ return this.sortEquip.apply(this,[].slice.call(arguments)); },
		handleGemEffectFormatter:function(){ return this.formatGemEffect.apply(this,[].slice.call(arguments)); },
		handleInvGroupHeader:function(oGroup){ return this.getInvGroupHeader(oGroup); },
		handleInvTabChange:function(){ },
		handleApplyRecipe:function(e){ this.applyKnownRecipe(e); }

	});
});
