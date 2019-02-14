sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"sap/m/FlexBox","sap/m/ScrollContainer","sap/m/Panel",
	"sap/ui/model/json/JSONModel",
	"sap/m/NotificationListItem","sap/m/MessageBox","sap/m/Button"
], function (Controller, Board, Cell, FlexBox, ScrollContainer, Panel, JSONModel, NotificationListItem, MessageBox, Button) {
	"use strict";
	
	var CELL_SIZE=parseInt(Cell.getMetadata().getProperty("size").defaultValue.replace("px",""),10);
	
	return Controller.extend("GameMixin",{
		
		onUserDied:function(e){
			if (this.localGame) return;
			var me=this.getView().getModel().getProperty('/auth/user');
			this.showToast(this.geti18n(e.arg.user==me?'gameResultLocalLose':'gameUserDied',e.arg.user));
		},
		
		onGameUserVote:function(e){
			if (this.localGame) return;
			e.arg.title=this.geti18n('game_userVote_'+e.arg.eventKey);
			e.arg.descr=this.geti18n('game_userVote_text',e.arg.user);
			this.addLogEntry(e.arg);
		},
		
		onCompleteFloor:function(e){
			var self=this;
			var commander=function(cmd){ self.processCommand.call(self,cmd); };
			e.arg.actions=[
				{icon:"sap-icon://navigation-up-arrow",action:"1",callback:function(){commander("/ascend"); }},
				{icon:"sap-icon://navigation-down-arrow",action:e.arg.floor+1,callback:function(){ commander("/descend"); }}
				];
			e.arg.title=this.geti18n("game_completeFloor",e.arg.floor);
			var stash=[''];
			for (var i in e.arg.loot) stash.push(i+': '+e.arg.loot[i]);
			e.arg.descr=this.geti18n("game_completeFloor_text",stash.join("\n"));
			this.addLogEntry(e.arg);
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
			mdl.setProperty('/canFlee',true);
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
				mdl.setProperty('/canFlee',false);
				mdl.setProperty( '/battleInfo',e.arg.profiles);
			}
			e.arg.descr=this.geti18n('game_stealFailed'+(e.arg.spotted?'Spotted':'')+'_text',e.arg.user);
			e.arg.title=this.geti18n('game_stealFailed',this.formatChance(e.arg.chance));
			this.addLogEntry(e.arg);
		},
		
		onStealSucceeded:function(e){
			e.arg.priority='Medium';
			e.arg.title=this.geti18n('game_stealSucceeeded',this.formatChance(e.arg.chance));
			e.arg.descr=this.geti18n('game_stealSucceeeded_text',e.arg.user);
			this.addLogEntry(e.arg);
		},	
		
		formatChance:function(chance){ return (chance*100).toFixed(2)+"%"; },
		
		onResultHitMob:function(e){
			var mdl=this.getView().getModel();
			if (e.arg.profiles.boss.wasHit) mdl.setProperty('/canSteal',false);
			var msg=this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.attack,e.arg.defense]);
			this.addLogEntry({
				eventKey:e.arg.eventKey, descr:msg, 
				title: this.geti18n('game_'+e.arg.eventKey,[e.arg[e.arg.dmg?"attack":"defense"],this.formatChance(e.arg.chance)]),
				attack:e.arg.attack, defense:e.arg.defense, dmg:e.arg.dmg,
				priority:e.arg.dmg?'Medium':'None',
				icon:this.formatLogIcon(e.arg.eventKey)
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
			var msgs,prio="None";
			if (e.arg.result=="win") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalWin')];
				if (e.arg.floor>1) msgs.push(this.geti18n('gameResultLocalAscend'));
				this.mergeResultToInventory(e.arg.loot);
			} else if (e.arg.result=="continue") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalContinue',e.arg.floor)];
			} else if (e.arg.result=="flee") {
				prio="High";
				msgs=[this.geti18n('gameResultLocalFlee',[e.arg.floor,e.arg.lives])];
			} else {
				msgs=[this.geti18n('gameResultLocalLose')];
				prio="High";
				if (e.arg.lostBeforeBossBattle) msgs.push(this.geti18n('gameResultTime',e.arg.time));
				if (e.arg.floor>1) msgs.push(this.geti18n('gameResultLocalAscend'));
			}
			var msg=msgs.join('\n');
			if (this.battleInfo) {
				this.addLogEntry({ 
					eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey),priority:prio
				});
			} else this.showToast(msg);
			this.battleInfo=null;
		},
		
		onStartBattleLocal:function(e){
			this.battleInfo=e.arg;
			this.battleLog=[];
			var mdl=this.getView().getModel();
			mdl.setProperty( '/battleInfo',e.arg.profiles);
			this.getView().byId("gameTabBar").setSelectedKey(this.getView().getModel().getProperty('/auth/user'));
			var battlePage=this.getView().byId("battle");
			var navContainer=this.getView().byId("app");
			window.setTimeout(function(){ navContainer.to(battlePage,"flip"); }, 500);
			this.addLogEntry({
				eventKey:'startBattle',priority:'None',sorter:-1,
				descr:this.geti18n('game_startBattle_text',e.arg.bossName),
				title:this.geti18n('game_startBattle',[e.arg.floor,e.arg.time,e.arg.livesLost])
			});
		},
		
		addLogEntry:function(e){
			var log=this.getView().byId("battleLog")
			log.removeAllItems();
			this.battleLog.push(e);
			e.entryNumber=this.battleLog.length;
			var lastN=[],N=6,i;
			for (i=this.battleLog.length-1;i>=0;i--){
				if (N==0) break;
				// lastN.push(this.battleLog[i]);
				log.addItem(this.createLogItem(this.battleLog[i]));
				N--;
			}
			// this.getView().getModel().setProperty("/battleLog",lastN);
		},
		
		createLogItem:function(e){
			var item=new NotificationListItem({
				showCloseButton:false, priority:e.priority, type:"Inactive",
				title:e.title, description:e.descr, authorPicture:this.formatLogIcon(e.eventKey)
			});
			if (e.actions) e.actions.forEach(function(act){
				item.addButton(new Button({text:act.action,icon:act.icon,press:act.callback}));
			});
			return item;
		},
		
		callBattleActionCb:function(e){
			var src=e.getSource();
			var battleEventCtx=src.getParent().getBindingContext().getObject();
			var cb=src.getBindingContext().getProperty("callback");
			cb(battleEventCtx);
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
				endBattleWin:'lead',
				completeFloorDescend:'thumb-up'
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
	
