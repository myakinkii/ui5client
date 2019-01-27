sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"sap/m/FlexBox","sap/m/ScrollContainer","sap/m/Panel",
	"sap/ui/model/json/JSONModel"
], function (Controller, Board, Cell, FlexBox, ScrollContainer, Panel, JSONModel) {
	"use strict";
	
	var CELL_SIZE=parseInt(Cell.getMetadata().getProperty("size").defaultValue.replace("px",""),10);
	
	return Controller.extend("GameMixin",{

		onStartGame: function (e) {
			var self = this;
			var cols=e.arg.c;
			var rows=e.arg.r;
			var width=(CELL_SIZE+4)*cols+32+'px'; // panel has 16px margin
			var mdlData={};
			var cells=[],coord;
			for (var r=1;r<=rows;r++) {
				for (var c=1;c<=cols;c++) {
					coord=e.arg.boardId+"_"+c+"_"+r;
					mdlData[coord]="";
					if (!this.gameDialog){
						var cell=new Cell({
							altKeyMode:"{/altKeyMode}",
							row:r, col:c, 
							val:"{board>/"+coord+"}",
							openCell: function(evt){self.checkCell.call(self,evt.getSource()); }
						});
						cells.push(cell);
					}
				}
			}
			var boardPage=this.getView().byId("board");
			if (!this.gameDialog) {
				var board=new Board({ rows:rows, cols:cols, content:cells });
				board.attachMove(function(cellMoved){ self.checkCell.call(self,cellMoved); });
				var panel=new Panel({ width:width, content:[ board ]});
				this.gameDialog=new ScrollContainer({height:"100%",width:"100%",horizontal:false,vertical:true,
					content:[ new FlexBox({ width:"100%", justifyContent:"Center", items:[ panel ] }) ]
				});
				boardPage.destroyContent();
				boardPage.addContent(this.gameDialog);
				this.getView().getModel().setProperty('/gameStarted',true);
			}
			this.getView().byId("app").to(boardPage,"flip");
			this.gameDialog.setModel(new JSONModel(mdlData),"board");
		},
		
		checkCell:function(cell){
			// if (cell.getChecked()) return;
			// cell.setChecked(true);
			// var self=this;
			// window.setTimeout(function(){ self.processCommand("/check "+cell.getCol()+" "+cell.getRow()); },0);
			this.processCommand("/check "+cell.getCol()+" "+cell.getRow());
		},
		
		hitMob:function(e){
			this.processCommand("/hit");
		},
		
		onResultHitMob:function(e){
			var mdl=this.getView().getModel();
			var log=mdl.getProperty('/log')||[];
			var msg=this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.user,e.arg.mob]);
			log.push({
				eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey,e.arg.dmg),
				attack:e.arg.user, defense:e.arg.mob, dmg:e.arg.dmg,
				sorter:log.length, priority:'Medium'
			});
			mdl.setProperty( '/log',log);
			mdl.setProperty( '/battleInfo/userHp',e.arg.userHp);
			mdl.setProperty( '/battleInfo/bossHp',e.arg.bossHp);
			this.battleInfo=e.arg;
			// this.showToast(msg);
		},
		
		formatLogIcon:function(eventKey){
			var keys={
				hitDamage:'accept',
				hitBlocked:'decline',
				hitEvaded:'move',
				startBattle:'scissors',
				endBattleLose:'unpaid-leave',
				endBattleWin:'lead'
			};
			return 'sap-icon://'+(keys[eventKey]||'employee');
		},

		onEndGame:function(){
			this.closeGame();
		},

		quitGame:function(){
			if (this.localGame){
				this.closeGame();
			} else this.processCommand("/quit");
		},
		
		closeGame:function(){
			var mdl=this.getView().getModel();
			mdl.setProperty('/gameStarted',false);
			var navContainer=this.getView().byId("app");
			var gamePage=this.getView().byId("game");
			navContainer.to(gamePage,"flip");
			this.gameDialog=null;
			this.localGame=null;
		},

		onCellValues:function(e){
			if (this.gameDialog){
				var mdl=this.gameDialog.getModel("board");
				if (!this.digitPocket) this.digitPocket={};
				var i,n;
				for (i in e.arg) {
					n=e.arg[i];
					if(n>0) {
						if (!this.digitPocket[n]) this.digitPocket[n]=0;
						this.digitPocket[n]++;
					}
					mdl.setProperty("/"+i,n);
				}
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
			if (e.arg.result=="win") this.mergeResultToInventory(e.arg.digitPocket);
			this.digitPocket=null;
			var msgs=[
				this.geti18n('gameResultRank'+(e.arg.result=="win"?'Win':'Lose')),
				this.geti18n('gameResultTime',e.arg.time),
				// 'wins/loss ratio:'+e.arg.winPercentage,
				// 'won:'+e.arg.won,
				// 'streak:'+e.arg.streak
			];
			this.showToast(msgs.join('\n'));
		},
		
		onShowResultCoop:function(e){
			if (e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=[ 
				this.geti18n('gameResultCoop'+(e.arg.result=="win"?'Win':'Lose')),
				this.geti18n('gameResultTime',e.arg.time)
			];
			this.showToast(msgs.join('\n'));
		},
		
		onShowResultVersus:function(e){
			var scores=[];
			for (var s in e.arg.score) scores.push({user:s,score:e.arg.score[s]});
			scores.sort(function(s1,s2){ return s2.score-s1.score; });
			var me=this.getView().getModel().getProperty('/auth/user');
			var result=this.geti18n('gameResultVersusLose');
			if (scores[0].user==me) {
				this.mergeResultToInventory(this.digitPocket);
				result=this.geti18n('gameResultVersusWin');
			}
			this.digitPocket=null;
			var msgs=[
				result,
				this.geti18n('gameResultTime',e.arg.time)
			];
			msgs=msgs.concat(scores.map(function(s){ return s.user+":"+s.score; }));
			this.showToast(msgs.join('\n'),2000);
		},
		
		onShowResultLocal:function(e){
			if (e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs,prio;
			if (e.arg.result=="win") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalWin')];
				for (var i in e.arg.digitPocket) msgs.push(i+': '+e.arg.digitPocket[i]);
			} else {
				msgs=[this.geti18n('gameResultLocalLose')];
				prio="High";
				if (e.arg.lostBeforeBossBattle) msgs.push(this.geti18n('gameResultTime',e.arg.time));
			}
			var mdl=this.getView().getModel();
			var log=mdl.getProperty('/log')||[];
			var msg=msgs.join('\n');
			log.push({ 
				eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey),
				sorter:log.length, priority:prio
			});
			mdl.setProperty( '/log',log);
			if (this.battleInfo) mdl.setProperty( '/log',log);
			else this.showToast(msg);
			this.battleInfo=null;
		},
		
		onStartBattleLocal:function(e){
			var msgs=[
				this.geti18n('gameResultTime',e.arg.time),
				this.geti18n('gameStartBattle',[8-e.arg.livesLost,e.arg.bossLevel]),
			];
			this.battleInfo=e.arg;
			var mdl=this.getView().getModel();
			mdl.setProperty( '/battleInfo',e.arg);
			this.showToast(msgs.join('\n'));
			var battlePage=this.getView().byId("battle");
			var navContainer=this.getView().byId("app");
			window.setTimeout(function(){ navContainer.to(battlePage,"flip"); }, 500);
			mdl.setProperty('/log',[{
				eventKey:'startBattle',priority:'None',sorter:-1,
				descr:this.geti18n('game_startBattle_text',[e.arg.userName,e.arg.bossName]), title:this.geti18n('game_startBattle')
			}]);
		}
	});
});
	
