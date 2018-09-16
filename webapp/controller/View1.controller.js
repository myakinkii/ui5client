sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"libs/nowjs/now",
	"sap/m/Dialog","sap/m/FlexBox","sap/m/Panel","sap/m/Button","sap/m/ToggleButton",
	"sap/m/BusyDialog","sap/m/MessageToast",
	'sap/ui/core/theming/Parameters'
], function (Controller,JSONModel,now,Dialog,FlexBox,Panel,Button,ToggleButton,BusyDialog,MessageToast,Parameters) {
	"use strict";

	var CELL_SIZE=24;

	sap.ui.core.Control.extend("MyCell", {
		metadata : {
			properties : {
				"altKeyMode":"boolean",
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
			var color=oControl.getVal()==''?oControl.getParent().getBoxColor():'#fff';
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

	sap.ui.core.Control.extend("MyBoard", {
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

	return Controller.extend("com.minesnf.ui5client.controller.View1", {

		onInit:function(){
			this.ideTestMode=false;
			var initData=this.getOwnerComponent().getComponentData();
			if (initData && initData.ideTestMode) this.ideTestMode=true;
			this.getView().setModel(new JSONModel({
				quickMode:"rank",
				evts:{},
				msg:'',
				auth:{},
				altKeyMode:false,
				ideTestMode:this.ideTestMode
			}));
			this.getView().byId("input").attachBrowserEvent('keypress', function(e){
				if(e.which == 13) self.sendMsg.call(self);
			});
			if (this.ideTestMode) {
				this.onAuthorize({});
				this.onUpdateParties({});
				this.processCommand=function(s){console.log(s);};
			} else this.initNow();
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
				self.processCommand=window.now.processCommand; 
			});
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

		onAuthorize:function(e){
			var mockUser={
				"user":"user1","type":"temp",
				"profile":{"level":0,"score":0,"rankTotal":0,"muted":{},"rank":{},"coop":{},"versus":{}}
			};
			var user=e.arg||mockUser;
			this.getView().getModel().setProperty('/auth',user);
		},

		onAuthFail:function(e){
			var msg=e.arg;
			this.showToast(msg);
		},

		onReauth:function(){
			window.location.reload(true);
		},

		showAuthDlg:function(){
			if (!this.authDlg) {
				this.authDlg=sap.ui.xmlfragment( "com.minesnf.ui5client.view.authDlg", this );
				this.getView().addDependent(this.authDlg);
			}
			var authFn=function(e){ 
				if(e.which == 13) this.authUser(); 
			}.bind(this);
			sap.ui.getCore().byId("authUser").attachBrowserEvent('keypress', authFn);
			sap.ui.getCore().byId("authPwd").attachBrowserEvent('keypress', authFn);
			var authMdl=new JSONModel({user:'',pwd:''});
			this.authDlg.setModel(authMdl,"auth");
			this.authDlg.open();
		},

		authUser:function(){
			var auth=this.authDlg.getModel("auth").getData()
			this.processCommand('/login '+auth.user+' '+auth.pwd);
		},

		logOff:function(){
			this.processCommand('/logoff');
		},

		closeDlg:function(e){
			e.getSource().getParent().close();
		},

		onUpdateParties:function(e){
			var mockParties={
				"10":{
					"id":10,"name":"coop10","mode":"coop","bSize":"s","leader":"user1",
					"maxPlayers":2,"minLevel":0,"maxLevel":8,"curPlayers":1,"users":{"user1":1,"user2":2}
				},
				"11":{
					"id":10,"name":"coop11","mode":"coop","bSize":"s","leader":"user1",
					"maxPlayers":2,"minLevel":0,"maxLevel":8,"curPlayers":1,"users":{"user1":1,"user2":2}
				},
				"12":{
					"id":10,"name":"coop12","mode":"coop","bSize":"s","leader":"user1",
					"maxPlayers":2,"minLevel":0,"maxLevel":8,"curPlayers":1,"users":{"user1":1,"user2":2}
				},
				"13":{
					"id":10,"name":"coop13","mode":"coop","bSize":"s","leader":"user1",
					"maxPlayers":2,"minLevel":0,"maxLevel":8,"curPlayers":1,"users":{"user1":1,"user2":2}
				},
				"14":{
					"id":10,"name":"coop14","mode":"coop","bSize":"s","leader":"user1",
					"maxPlayers":2,"minLevel":0,"maxLevel":8,"curPlayers":1,"users":{"user1":1,"user2":2}
				},
				
			};
			var parties=e.arg||mockParties;
			var partiesCount={
				s:{rank:0,coop:0,versus:0},
				m:{rank:0,coop:0,versus:0},
				b:{rank:0,coop:0,versus:0}
			};
			var i,p,u;
			for (i in parties) {
				p=parties[i];
				partiesCount[p.bSize][p.mode]++;
				for (u in p.users) p.users[u]={user:u};
			}
			this.getView().getModel().setProperty('/partiesCount',partiesCount);
			this.getView().getModel().setProperty('/parties',parties);
		},

		onUpdatePlayers:function(e){
			var players=[];
			for (var p in e.arg) { e.arg[p].name=p; players.push(e.arg[p]); }
			this.getView().getModel().setProperty('/players',players);
		},

		pressParty:function(e){
			var ctx=e.getSource().getBindingContext();
			var party=ctx.getObject();
			var me=this.getView().getModel().getProperty('/auth/user');
			if (me==party.leader) {
				if (!this.partyDlg) {
					this.partyDlg=sap.ui.xmlfragment( "com.minesnf.ui5client.view.partyDlg", this );
					this.getView().addDependent(this.partyDlg);
				}
				sap.ui.getCore().byId("partyUsersList").getBinding("items").filter([new sap.ui.model.Filter({
					path:"user",
					test:function(user){return user.toLowerCase()!=me;}
				})]);
				this.partyDlg.bindElement(ctx.getPath());
				this.partyDlg.open();
			} else this.processCommand('/join '+party.id);
		},

		startParty:function(e){
			var boardSize=e.getSource().data().boardSize;
			var mode=this.getView().getModel().getProperty('/quickMode');
			if (this.ideTestMode && mode=='rank') {
				var mockGames={
					s:{"boardId":"rank1","r":8,"c":8},
					m:{"boardId":"rank1","r":16,"c":16},
					b:{"boardId":"rank1","r":16,"c":30}
				};
				this.onStartGame({arg:mockGames[boardSize]});
				var mockCells={
					"rank1_5_4":0,"rank1_4_3":2,"rank1_5_3":1,"rank1_6_3":0,"rank1_5_2":1,"rank1_6_2":0,"rank1_5_1":1,"rank1_6_1":0,
					"rank1_7_1":0,"rank1_8_1":0,"rank1_7_2":0,"rank1_8_2":0,"rank1_7_3":0,"rank1_8_3":0,"rank1_7_4":0,"rank1_6_4":0,
					"rank1_5_5":1,"rank1_6_5":1,"rank1_7_5":1,"rank1_8_4":0,"rank1_8_5":1,"rank1_4_4":1,"rank1_4_5":3
				};
				this.onCellValues({arg:mockCells});
			} else this.processCommand('/create '+mode+' '+boardSize);
		},

		kickUser:function(e){
			var user=e.getParameter("listItem").getBindingContext().getProperty("user");
			this.processCommand('/kick '+user);
		},

		dismissParty:function(){
			this.partyDlg.close();
			var partyId=this.partyDlg.getBindingContext().getProperty("id");
			this.processCommand('/dismiss '+partyId);
		},

		onStartGame: function (e) {
			var self = this;
			var cols=e.arg.c;
			var rows=e.arg.r;
			var width=(CELL_SIZE+4)*(cols+2)+'px'; // dunno how to calculate that stuff correctly
			var title=e.arg.boardId+" ("+cols+"x"+rows+")";
			var mdlData={altKeyMode:false};
			var cells=[],coord;
			for (var r=1;r<=rows;r++) {
				for (var c=1;c<=cols;c++) {
					coord=e.arg.boardId+"_"+c+"_"+r;
					// mdlData[coord]=c;
					mdlData[coord]="";
					cells.push( new MyCell({
						altKeyMode:"{/altKeyMode}",
						row:r, col:c, 
						val:"{board>/"+coord+"}",
						openCell:function(e){
							var row=e.getSource().getRow();
							var col=e.getSource().getCol();
							self.processCommand("/check "+col+" "+row);
						 }
					}));
				}
			}
			if (!this.gameDialog) {
				this.gameDialog = new Dialog({
					showHeader:false,
					_title: title+", {i18n>gameBestTime}:{/bestTime}s",
					content: [ 
						new Panel({ width:width, content:[ new MyBoard({ rows:rows, cols:cols, content:cells }) ]}) 
					],
					beginButton: new ToggleButton({
						visible:"{device>/system/desktop}",
						text: '{i18n>altKeyMode}',
						pressed:"{/altKeyMode}"
					}),
					endButton: new Button({
						text: '{i18n>genericClose}',
						press: [this.quitGame,this]
					}),
					afterClose:function(e){ 
						e.getSource().destroy(); 
						self.gameDialog=null;
					}
				});
				this.getView().addDependent(this.gameDialog);
			}
			var boardMdl=new JSONModel(mdlData);
			this.gameDialog.setModel(boardMdl,"board");
			this.gameDialog.open();
		},

		onEndGame:function(){
			this.getView().getModel().setProperty('/bestTime','');
			this.gameDialog.close();
		},

		quitGame:function(){
			this.getView().getModel().setProperty('/bestTime','');
			this.gameDialog.close(); 
			this.processCommand("/quit");
		},

		onCellValues:function(e){
			if (this.gameDialog){
				var mdl=this.gameDialog.getModel("board");
				for (var i in e.arg) mdl.setProperty("/"+i,e.arg[i]);
			}
		},

		onOpenLog:function(e){
			if (this.gameDialog){
				var mdl=this.gameDialog.getModel("board");
				for (var i in e.arg) for (var c in e.arg[i].cellsOpened) 
					mdl.setProperty("/"+c,e.arg[i].cellsOpened[c]);
			}
		},

		onShowResultRank:function(e){
			var msgs=[
				'time:'+ e.arg.time+'s',
				'wins/loss ratio:'+e.arg.winPercentage,
				'won:'+e.arg.won,
				'streak:'+e.arg.streak
			]
			this.showToast(msgs.join('\n'));
			this.getView().getModel().setProperty('/bestTime',e.arg.bestTime);
		},

// generic funcs

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
