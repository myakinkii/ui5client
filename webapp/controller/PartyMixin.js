sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/model/localGame",
], function (Controller,LocalGame){
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
			var localGame=(mode=='local'||this.getView().getModel().getProperty('/offlineMode'));
			if (localGame) {
				mode="rank";
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
		}
	});
});
