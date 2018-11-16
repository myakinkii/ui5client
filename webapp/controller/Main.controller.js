sap.ui.define([
	"libs/nowjs/now",
	"com/minesnf/ui5client/controller/BaseController",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"com/minesnf/ui5client/model/localGame",
	"sap/ui/model/json/JSONModel",
	"sap/m/Dialog","sap/m/FlexBox","sap/m/Panel","sap/m/Button","sap/m/ToggleButton"
], function (
	now,BaseController,Board,Cell,LocalGame,
	JSONModel,
	Dialog,FlexBox,Panel,Button,ToggleButton) {
	"use strict";

	var CELL_SIZE=24;

	return BaseController.extend("com.minesnf.ui5client.controller.Main", {

		onInit:function(){
			var self=this;
			this.ideTestMode=false;
			var initData=this.getOwnerComponent().getComponentData();
			if (initData && initData.ideTestMode) this.ideTestMode=true;
			this.getView().setModel(new JSONModel({
				quickMode:"rank",
				evts:{},
				msg:'',
				auth:{},
				altKeyMode:false,
				localGame:true,
				ideTestMode:this.ideTestMode
			}));
			this.getView().byId("input").attachBrowserEvent('keypress', function(e){
				if(e.which == 13) self.sendMsg.call(self);
			});
			sap.ui.getCore().getEventBus().subscribe(
				"message",
				function(channel,evtId,evtData){
					self.processEvent.call(self,evtData); 
				}
			);			
			if (this.ideTestMode) {
				this.onAuthorize({});
				this.onUpdateParties({});
			} else this.initNow();
		},
		
		processCommand:function(s){
			if (this.localGame){
				var me=this.getView().getModel().getProperty('/auth/user');
				var cmd=s.split(" ");
				if (cmd[0]=="/check")
					this.localGame.dispatchEvent({
						user:me,
						command:"checkCell",
						pars:[cmd[1],cmd[2]]
					});
			} else if (this.nowReady) window.now.processCommand(s); 
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
				// self.processCommand=window.now.processCommand; 
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
			var me=this.getView().getModel().getProperty('/auth/user');
			var boardSize=e.getSource().data().boardSize;
			var mode=this.getView().getModel().getProperty('/quickMode');
			if (this.ideTestMode && mode=='rank') {
				var mockGames={
					s:{"boardId":"rank1","r":8,"c":8,b:10},
					m:{"boardId":"rank1","r":16,"c":16,b:40},
					b:{"boardId":"rank1","r":16,"c":30,b:99}
				};
				// this.runTest2(mockGames[boardSize]); return;
				// this.runTest(mockGames[boardSize],8,8); return;
				var pars={
					multiThread:false,
					id:mockGames[boardSize].boardId,
					name:mockGames[boardSize].boardId,
					board:{},
					mode:mode,
					minPlayers:1,
					users:{},
					profiles:{},
					leader:me
				};
				pars.users[me]={name:me,id:me};
				pars.profiles[me]={s:{},m:{},b:{}};
				pars.board=mockGames[boardSize];
				pars.board.bSize=boardSize;
				this.localGame=new LocalGame(pars);
				this.localGame.emitEvent = function (dst, dstId, contextId, func, arg) {
					sap.ui.getCore().getEventBus().publish('message', {
						dst: dst,
						dstId: dstId,
						contextId: contextId,
						func: func,
						arg: arg
					});
				};
				this.localGame.dispatchEvent({
					user:null,
					command:"startBoard",
					pars:null
				});
			} else this.processCommand('/create '+mode+' '+boardSize);
		},
		
		runTest:function(board,x,y){
			var times=10000;
			var res={};
			var i,max,now=Date.now();
			for (i=0;i<times;i++){
				max=this.runBoard(board,x,y).maxDigit;
				if (!res[max]) res[max]=1;
				else res[max]++;
			}
			console.log(Date.now()-now,res);
		},
		
		runTest2:function(board){
			var times=10000;
			var res={};
			var i,b,now=Date.now();
			for (i=0;i<times;i++){
				// b=this.runBoard(board,board.c/2,board.r/2).board;
				b=this.runBoard(board,1,1).board;
				b.forEach(function(row,indY){
					if (indY==0 || indY==b.length-1) return;
					row.forEach(function(val,indX){
						if (indX==0 || indX==row.length-1) return;
						if (val==0 || val>8) return;
						if (!res[val]) res[val]=1;
						else res[val]++;
					});
				});
			}
			for (i in res) res[i]/=times;
			console.log(Date.now()-now,res);
		},		
		
		runBoard:function(board,x,y){
			return LocalGame.Board.prototype.init.call({bombs:board.b,sizeX:board.c,sizeY:board.r},x,y,2);
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
		
		attachMove:function(element,cbFn){
			// element.attachBrowserEvent('touchstart', function(e){
			// 	var elem=$(e.target).control();
			// 	if (cbFn && elem && elem[0]) cbFn(elem[0]);
			// 	e.preventDefault();
			// });
			element.attachBrowserEvent('touchmove', function(e){
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
					var cell=new Cell({
						altKeyMode:"{/altKeyMode}",
						row:r, col:c, 
						val:"{board>/"+coord+"}",
						openCell:function(e){
							var row=e.getSource().getRow();
							var col=e.getSource().getCol();
							self.processCommand("/check "+col+" "+row);
						 }
					});
					cells.push(cell);
				}
			}
			if (!this.gameDialog) {
				var board=new Board({ rows:rows, cols:cols, content:cells });
				var panel=new Panel({ width:width, content:[ board ]});
				this.attachMove(board,function(elem){
					if (!elem.getChecked()){
						elem.setChecked(true);
						var row=elem.getRow();
						var col=elem.getCol();
						// console.log("check",col,row);
						self.processCommand("/check "+col+" "+row);
					}
				});
				this.gameDialog = new Dialog({
					showHeader:false,
					content: [ panel ],
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

	});
});
