sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"sap/m/FlexBox","sap/m/ScrollContainer","sap/m/Panel",
	"sap/ui/model/json/JSONModel","sap/m/NotificationListItem",
	"sap/m/MessageBox"
], function (Controller, Board, Cell, FlexBox, ScrollContainer, Panel, JSONModel, NotificationListItem,MessageBox) {
	"use strict";
	
	var CELL_SIZE=parseInt(Cell.getMetadata().getProperty("size").defaultValue.replace("px",""),10);
	
	return Controller.extend("GameMixin",{
		
		onCompleteFloor:function(e){
			var self=this;
			var cmd='/descend';
			MessageBox.confirm(
				this.geti18n('gameConfirmDescendFloor',e.arg.floor+1),
				function(action){
					if (action!=MessageBox.Action.OK) cmd='/ascend';
					self.processCommand.call(self,cmd);
				}
			);
		},

		onStartGame: function (e) {
			if (e.arg.mode=="coopRPG") 
				this.processCommand('/equip '+this.serializeEquip().join(" ")); // not so good, but will do for now
			var self = this;
			var cols=e.arg.c;
			var rows=e.arg.r;
			var width=(CELL_SIZE+4)*cols+32+'px'; // panel has 16px margin
			var mdl=this.getView().getModel();
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
				mdl.setProperty('/gameStarted',true);
			}
			mdl.setProperty('/canSteal',true);
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
		
		stealLoot:function(e){
			this.processCommand("/steal");
		},
		
		fleeBattle:function(e){
			this.processCommand("/flee");
		},
		
		onStealFailed:function(e){
			if (e.arg.spotted){
				var mdl=this.getView().getModel();
				mdl.setProperty('/canSteal',false);
				mdl.setProperty( '/battleInfo',e.arg.profiles);
			}
			this.addLogEntry({
				eventKey:'stealFailed',priority:'None',
				descr:this.geti18n('game_stealFailed'+(e.arg.spotted?'Spotted':'')+'_text',e.arg.user), 
				title:this.geti18n('game_stealFailed')
			});			
		},
		
		onResultHitMob:function(e){
			var mdl=this.getView().getModel();
			if (e.arg.profiles.boss.wasHit) mdl.setProperty('/canSteal',false);
			var msg=this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.attack,e.arg.defense]);
			this.addLogEntry({
				eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey,e.arg.dmg),
				attack:e.arg.attack, defense:e.arg.defense, dmg:e.arg.dmg,
				priority:'Medium',icon:this.formatLogIcon(e.arg.eventKey)
			});
			mdl.setProperty( '/battleInfo',e.arg.profiles);
			this.battleInfo=e.arg;
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
			var msgs,prio;
			if (e.arg.result=="win") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalWin')];
				for (var i in e.arg.loot) msgs.push(i+': '+e.arg.loot[i]);
				this.mergeResultToInventory(e.arg.loot);
			} else {
				msgs=[this.geti18n('gameResultLocalLose')];
				prio="High";
				if (e.arg.lostBeforeBossBattle) msgs.push(this.geti18n('gameResultTime',e.arg.time));
			}
			var msg=msgs.join('\n');
			if (this.battleInfo) this.addLogEntry({ 
				eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey),priority:prio
			});
			else this.showToast(msg);
			this.battleInfo=null;
		},
		
		onStartBattleLocal:function(e){
			this.battleInfo=e.arg;
			var mdl=this.getView().getModel();
			// e.arg.profiles.mob2=e.arg.profiles.boss;
			// e.arg.profiles.mob3=e.arg.profiles.boss;
			mdl.setProperty( '/battleInfo',e.arg.profiles);
			var battlePage=this.getView().byId("battle");
			var navContainer=this.getView().byId("app");
			window.setTimeout(function(){ navContainer.to(battlePage,"flip"); }, 500);
			this.getView().byId("battleLog").removeAllItems();
			// this.getView().byId("gameTabBar").destroyContent();
			// this.getView().byId("gameTabBar").insertContent(new sap.m.List({id:"battleLog"}));
			this.addLogEntry({
				eventKey:'startBattle',priority:'None',sorter:-1,
				descr:this.geti18n('game_startBattle_text',[e.arg.userName,e.arg.bossName,e.arg.time,e.arg.livesLost,e.arg.floor]), 
				title:this.geti18n('game_startBattle')
			});
		},
		
		addLogEntry:function(e){
			this.getView().byId("battleLog").insertItem(new NotificationListItem({
				showCloseButton:false, priority:e.priority, type:"Inactive",
				title:e.title,description:e.descr,
				authorPicture:this.formatLogIcon(e.eventKey)
			}),0);
		},
		
		formatLogIcon:function(eventKey){
			var keys={
				hitDamage:'accept',
				hitDamageCrit:'warning',
				hitBlocked:'decline',
				hitEvaded:'move',
				hitParried:'move',
				startBattle:'scissors',
				endBattleLose:'unpaid-leave',
				endBattleWin:'lead'
			};
			return 'sap-icon://'+(keys[eventKey]||'employee');
		},	
		
		formatBattleIconColor:function(hp,name,me,mob){
			var color='Default';
			if (name!=me) color='Positive';
			if (mob) color='Negative';
			if (hp==0) color='Neutral';
			return color;
		}
	});
});
	
