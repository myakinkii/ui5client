sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/model/localGame",
	'sap/m/MessageBox',"sap/ui/model/json/JSONModel"
], function (Controller,LocalGame,MessageBox,JSONModel){
	"use strict";
	
	return Controller.extend("PartyMixin",{
		
		onUpdatePlayers:function(e){
			var players=[];
			for (var p in e.arg) { e.arg[p].name=p; players.push(e.arg[p]); }
			this.getView().getModel().setProperty('/players',players);
		},		
		
		onUpdateParties:function(e){
			var parties=e.arg||{};
			var partiesCount={
				s:{rank:0,coop:0,versus:0},
				m:{rank:0,coop:0,versus:0},
				b:{rank:0,coop:0,versus:0}
			};
			var i,p,u;
			for (i in parties) {
				p=parties[i];
				p.rpg=false;
				if (p.mode=="coopRPG"){ p.mode="coop"; p.rpg=true; }
				if (p.mode=="versusRPG"){ p.mode="versus"; p.rpg=true; }				
				partiesCount[p.bSize][p.mode]++;
				for (u in p.users) p.users[u]={user:u};
			}
			
			partiesCount.coop=partiesCount.s.coop+partiesCount.m.coop+partiesCount.b.coop;
			partiesCount.versus=partiesCount.s.versus+partiesCount.m.versus+partiesCount.b.versus;
			
			this.getView().getModel().setProperty('/partiesCount',partiesCount);
			this.getView().getModel().setProperty('/parties',parties);
		},
		
		pressParty:function(e){
			var ctx=e.getSource().getBindingContext();
			var party=ctx.getObject();
			var me=this.getView().getModel().getProperty('/auth/user');
			if (me==party.leader) {
				/*
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
				*/
				var self=this;
				MessageBox.confirm(this.geti18n('partyDismissConfirm'), function(action) {
					if (action == MessageBox.Action.OK) self.processCommand('/dismiss '+party.id);
				});
			} else this.processCommand('/join '+party.id);
		},
		
		showCreatePartyDlg:function(e){
			var mdl=this.getView().getModel();
			var iAmOnline=!mdl.getProperty('/offlineMode');
			var mode=mdl.getProperty('/quickMode');
			if (!iAmOnline) mode="solo";
			var partyMdl={
				me:mdl.getProperty('/auth/user'),
				bSize:e.getSource().data().boardSize,
				mode:mode,
				iAmOnline:iAmOnline,
				maxPlayers:2,
				rpg:true,
				// rpg:(mode=="versus"?false:true),
				online:(mode=="solo"?false:iAmOnline)
			};
			if (!this.partyDlg) {
				this.partyDlg=sap.ui.xmlfragment( "com.minesnf.ui5client.view.newPartyDlg", this );
				this.getView().addDependent(this.partyDlg);
			}
			this.partyDlg.setModel(new JSONModel(partyMdl));
			this.partyDlg.open();
			// console.log(partyMdl);
		},
		
		onPartyOnlineChange:function(e){
			var online=e.getParameter("state");
			if (!online) this.partyDlg.getModel().setProperty("/mode","solo");
		},
		
		onPartyRPGChange:function(e){
			var rpg=e.getParameter("state");
			var mode=this.partyDlg.getModel().getProperty("/mode");
			// if (rpg && mode=="versus") this.partyDlg.getModel().setProperty("/mode","coop");
		},		
		
		onPartyBsizeChange:function(e){
			var bSize=e.getParameter("key");
			var players=this.partyDlg.getModel().getProperty("/maxPlayers");
			var allowedPlayers={s:2,m:3,b:4};
			if (players>allowedPlayers[bSize]) this.partyDlg.getModel().setProperty("/maxPlayers",2);
		},
		
		createParty:function(){
			var partyMdl=this.partyDlg.getModel().getData();
			var mode=partyMdl.mode;
			if (partyMdl.rpg) mode+='RPG';
			if (mode=="solo") mode="rank";
			this.partyDlg.close();
			if (partyMdl.online) {
				this.processCommand('/create '+mode+' '+partyMdl.bSize+' '+partyMdl.maxPlayers);
			} else this.createLocalGame(mode,partyMdl.bSize);
		},

		serializeEquip:function(){
			return this.getView().getModel().getProperty('/equip').reduce(function(prev,cur){ 
				if (cur.equipped) prev.push(cur.rarity+"_"+cur.effect)
				return prev;
			},[]);
		},

		createLocalGame:function(mode,boardSize){
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			var pars={
				multiThread:false,
				id:"solo1",
				name:"solo1",
				board:LocalGame.boards[boardSize],
				mode:mode,
				minPlayers:1,
				users:{},
				profiles:{},
				leader:me
			};
			pars.users[me]={name:me,id:me};
			pars.profiles[me]={ "equip":this.serializeEquip() };
			// this.runTest3(pars,16,8); return;
			// this.runTest2(pars); return;
			// this.runTest(pars,8,8); return;
			this.localGame=new LocalGame.modes[mode].constr(pars);
			this.localGame.emitEvent = function (dst, dstId, contextId, func, arg) {
				sap.ui.getCore().getEventBus().publish('message', {
					dst: dst,
					dstId: dstId,
					contextId: contextId,
					func: func,
					arg: arg
				});
			};
			this.localGame.pauseOnBattleLost = function (){
				this.emitEvent('party', this.id, 'game', 'PauseOnBattleLost',{eventKey:'pauseOnBattleLost'});
			};
			this.localGame.resumeGame = function(){
				this.resetBoard({eventKey:'endBattleLose', floor:this.floor});
				this.resetFloor(); 
			};
			this.localGame.dispatchEvent({
				user:null,
				command:"startBoard",
				pars:null
			});
		},
		
		runTest:function(pars,x,y){
			var times=10000;
			var res={};
			var i,max,now=Date.now();
			for (i=0;i<times;i++){
				max=this.runBoard(pars,x,y).maxDigit;
				if (!res[max]) res[max]=1;
				else res[max]++;
			}
			console.log(Date.now()-now,res);
		},
		
		runTest2:function(pars){
			var times=10000;
			var res={};
			var i,b,now=Date.now();
			for (i=0;i<times;i++){
				// b=this.runBoard(board,board.c/2,board.r/2).board;
				b=this.runBoard(pars,1,1).board;
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
		
		runTest3:function(pars,x,y){
			var times=10000;
			var res={};
			var i,m,mines,now=Date.now();
			var summer=function(prev,cur){ return cur==9?prev+1:prev; }
			var reducer=function(prev,cur,i){ prev[i]=cur.reduce(summer,0); return prev;}
			for (i=0;i<times;i++){
				mines=this.runBoard(pars,x,y).board.reduce(reducer,{});
				for (m in mines ) if (m>0 && m<=pars.board.r) {
					if (!res[m]) res[m]=0;
					res[m]+=mines[m];
				}
			}
			console.log(Date.now()-now,res);
		},		
		
		runBoard:function(pars,x,y){
			var brd=new LocalGame.Board(pars.name,pars.board);
			brd.init(x,y,2);
			return {board:brd.board,maxDigit:brd.maxDigit};
		},

		kickUser:function(e){
			var user=e.getParameter("listItem").getBindingContext().getProperty("user");
			this.processCommand('/kick '+user);
		},

		dismissParty:function(){
			this.partyDlg.close();
			var partyId=this.partyDlg.getBindingContext().getProperty("id");
			this.processCommand('/dismiss '+partyId);
		}
	});
});
