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
		
		formatSpellButton:function(spell,mp){
			return this.geti18n(spell)+' '+mp;
		},
		
		sortProfiles:function(n1,n2){
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			var profiles=mdl.getProperty('/battleInfo');
			var p1=profiles[n1.toLowerCase()]||profiles.boss;
			var p2=profiles[n2.toLowerCase()]||profiles.boss;
			if (p1.mob) return 1;
            if (p2.mob) return -1;
			if (p2.name==me) return 1;
            if (p1.name==me) return -1;
			if (p1.name!=me && p2.name < p1.name) return 1;
			if (p1.name!=me && p1.name < p2.name) return -1;
			return 0;
		},

		busyStates:["attack","cast","cooldown"],

		formatAssistButton:function(state,target,name,me,mob){
			// console.log("assist >> ",state,target,name,me,mob);
			return (state=='attack' && !mob && name!=me && target!=me);
		},

		formatDefendButton:function(attackers,name,me,mob){
			// console.log("defend >> ",attackers,name,me,mob);
			return ( attackers>0 && name!=me && !mob );
		},
		
		onChangeState:function(e){
			
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			
			for (var p in e.arg.profiles) {
				// if (e.arg.profiles[p].attackers>0) console.log(p,e.arg.profiles[p].attackers);
				mdl.setProperty("/battleInfo/"+p+"/attackers",e.arg.profiles[p].attackers);
			}
			var name=e.arg.profiles[e.arg.user]?e.arg.user:'boss';
			mdl.setProperty("/battleInfo/"+name,e.arg.profiles[name]);

			if (e.arg.user==me) {
				var busy=this.busyStates.indexOf(e.arg.state)>-1
				mdl.setProperty('/canHit',!busy);
			}

			if (e.arg.state=="active" || e.arg.state=="cooldown") return;
			
			e.arg.title=this.geti18n('game_userStateChange_'+e.arg.state,[e.arg.user,e.arg.val]);
			e.arg.descr=this.geti18n('game_userStateChange_'+e.arg.state+'_text',[e.arg.user,e.arg.val,e.arg.profiles[name].target||"self"]);
			
			mdl.setProperty("/battleInfo/"+name+"/event",e.arg.title);
			mdl.setProperty("/battleInfo/"+name+"/eventKey",'userStateChange_'+e.arg.state);
			
			if (e.arg.state=="attack"){
				var self=this;
				var commander=function(cmd){ self.processCommand.call(self,cmd); };
				var actions=[];
				if (e.arg.val==me){
					actions=[
						{_icon:"sap-icon://add",action:"~",callback:function(){commander("/evade"); }},
						{_icon:"sap-icon://add",action:"/",callback:function(){commander("/parry"); }} 
					];
				} else if( e.arg.user!=me) {
					if (e.arg.profile.mob) 
						actions.push({icon:"sap-icon://shield",action:"",callback:function(){commander("/defend "+e.arg.val); }}); 
					else 
						actions.push({icon:"sap-icon://add",action:"",callback:function(){commander("/assist "+e.arg.user); }});
				}
				e.arg.actions=actions;
			}
			this.addLogEntry(e.arg);
		},
		
		onUserDied:function(e){
			if (this.localGame) return;
			var me=this.getView().getModel().getProperty('/auth/user');
			this.showToast(this.geti18n(e.arg.user==me?'gameResultLocalLose':'gameUserDied',e.arg.user));
		},
		
		onUserLostLife:function(e){
			var mdl=this.getView().getModel();
			var livesLost=mdl.getProperty('/gameInfo/livesLost');
			livesLost[e.arg.user]=e.arg;
			mdl.setProperty('/gameInfo/livesLost',livesLost);
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
				{icon:"sap-icon://refresh",action:"1",callback:function(){commander("/ascend"); }},
				{icon:"sap-icon://navigation-down-arrow",action:e.arg.floor+1,callback:function(){ commander("/descend"); }}
				];
			e.arg.title=this.geti18n("game_completeFloor",e.arg.floor);
			var stash=[],res=8;
			while (res>0) {
				if (e.arg.loot[res]) stash.push({key:res, val:e.arg.loot[res], text:res+': '+e.arg.loot[res]});
				res--;
			}
			
			var mdl=this.getView().getModel();
			mdl.setProperty('/canFlee',false);
			mdl.setProperty('/canContinue',true);
			mdl.setProperty('/gameInfo/stash',stash);
			
			e.arg.descr=this.geti18n("game_completeFloor_text",stash.map(function(s){return s.text; }).join("\n"));
			if (e.arg.effect) e.arg.descr+=this.geti18n( 'game_completeFloor_text_recipe',this.geti18n('effect_'+e.arg.effect));
			e.arg.descr+=this.geti18n("game_completeFloor_text_ascend");
			this.addLogEntry(e.arg);
		},

		onStartGame: function (e) {
			if (e.arg.mode=="soloRPG" || e.arg.mode=="coopRPG" || e.arg.mode=="versusRPG")
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
				mdl.setProperty('/gameInfo',{ 
					mode:e.arg.mode, 
					coop:(e.arg.mode=='soloRPG' || e.arg.mode=='coopRPG'), 
					haveSpells:false,
					floor:1, 
					stash:null,
					livesLost:{} 
				});
			}
			mdl.setProperty('/canSteal',false);
			mdl.setProperty('/canFlee',false);
			mdl.setProperty('/canContinue',false);
			mdl.setProperty('/canHit',false);
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

		getTarget:function(e){
			var tgt=null,tabBar=this.getView().byId("gameTabBar");
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			var ctx=e && e.getSource().getBindingContext() && e.getSource().getBindingContext().getObject();
			if (tabBar) tgt=tabBar.getSelectedKey();
			else if(ctx && ctx.name!=me) tgt=ctx.name;
			else tgt=mdl.getProperty('/gameInfo/myTarget');
			return tgt;
		},

		changeTarget:function(e){
			if (e.getParameter("selected")) this.getView().getModel().setProperty(
				'/gameInfo/myTarget',
				e.getSource().getBindingContext().getProperty("name")
			);
		},		
		
		isPlayer:function(tgt){
			if (!tgt) return false;
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			var profiles=mdl.getProperty('/battleInfo');
			return (tgt!=me && profiles[tgt]);
		},

		performAction:function(e){
			var action=e.getSource().data().action;
			var cmd="/"+action;
			var mdl=this.getView().getModel();
			var tgt=this.getTarget(e);
			if (action=='assist' || action=="defend" ) {
				 if (this.isPlayer(tgt)) cmd+=" "+tgt;
				 else return;
			}
			var coopMode=mdl.getProperty('/gameInfo/coop');
			if ( action=="hit" && !coopMode) cmd+=" "+tgt;
			// console.log(cmd);
			this.processCommand(cmd);
		},

		castSpell:function(e){
			var ctx=e.getSource().getBindingContext().getObject();
			var cmd="/cast "+ctx.spell;
			var mdl=this.getView().getModel();
			var tgt=this.getTarget();
			var me=mdl.getProperty('/auth/user');
			if (tgt && tgt!=me) cmd+=" "+tgt;
			this.processCommand(cmd);
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
				mdl.setProperty( '/battleInfo/boss',e.arg.profiles.boss);
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


		onBattleLogEntry:function(e){
			// e.arg.priority='None';
			e.arg.title=this.geti18n('game_'+e.arg.eventKey,[e.arg.attack,e.arg.defense]);
			e.arg.descr=this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.attack,e.arg.defense]);
			this.addLogEntry(e.arg);
		},

		onResultCastSpell:function(e){
			var mdl=this.getView().getModel();
			var entry={
				eventKey:e.arg.eventKey,
				title: this.geti18n('game_'+e.arg.eventKey,[e.arg.source,e.arg.spell]),
				descr:this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.source,e.arg.target,e.arg.spell]),
				attack:e.arg.source, defense:e.arg.target,
				priority:'Medium',
				icon:this.formatLogIcon(e.arg.eventKey)
			};
			this.addLogEntry(entry);
			// mdl.setProperty( '/battleInfo',e.arg.profiles);
			var profiles=e.arg.profiles;
			var tgtsArr=[e.arg.source];
			if (e.arg.target) tgtsArr.push(e.arg.target);
			tgtsArr.forEach(function(name){
				if (!profiles[name]) name='boss';
				var profile=profiles[name];
				profile.event=entry.title;
				profile.eventKey=entry.eventKey;
				mdl.setProperty( '/battleInfo/'+name,profile);
			});
			this.battleInfo=e.arg;
		},
		
		onResultHitTarget:function(e){
			var mdl=this.getView().getModel();
			if ( e.arg.profiles.boss && e.arg.profiles.boss.wasHit) mdl.setProperty('/canSteal',false);
			var entry={
				eventKey:e.arg.eventKey,
				title: this.geti18n('game_'+e.arg.eventKey,[e.arg[e.arg.dmg?"attack":"defense"],this.formatChance(e.arg.chance)]),
				descr:this.geti18n('game_'+e.arg.eventKey+'_text',[e.arg.attack,e.arg.defense]),
				attack:e.arg.attack, defense:e.arg.defense, dmg:e.arg.dmg,
				priority:e.arg.dmg?'Medium':'None',
				icon:this.formatLogIcon(e.arg.eventKey)
			};
			this.addLogEntry(entry);
			// mdl.setProperty( '/battleInfo',e.arg.profiles);
			var profiles=e.arg.profiles;
			[e.arg.attack,e.arg.defense].forEach(function(name){
				if (!profiles[name]) name='boss';
				var profile=profiles[name];
				profile.event=entry.title;
				profile.eventKey=entry.eventKey;
				mdl.setProperty( '/battleInfo/'+name,profile);
			});
			this.battleInfo=e.arg;
		},

		refreshProfiles:function(profiles){
			var mdl=this.getView().getModel();
			var mySpells=profiles[mdl.getProperty('/auth/user')].spells;
			var spells=[];
			for (var s in mySpells) spells.push({spellName:this.geti18n('effect_'+s),spell:s,eft:mySpells[s]});
			for (var p in profiles) {
				profiles[p].spells=spells;
				profiles[p].haveSpells=spells.length>0;
			}
			mdl.setProperty( '/battleInfo',profiles);
		},

		onEndGame:function(){
			this.closeGame();
		},

		quitGame:function(){
			if (this.localGame){
				this.closeGame();
			} else this.processCommand("/quit");
		},
		
		quitGameConfirm:function(){
			var self=this;
			var mdl=this.getView().getModel();
			MessageBox.confirm(
				this.geti18n('gameInfoQuitGameConfirm'),
				function(action){ 
					if (action==MessageBox.Action.OK) {
						self.quitGame.call(self);
						mdl.setProperty('/showPane',false);
					}
				}
			);
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

		onShowResultRPGVersus:function(e){
			var mdl=this.getView().getModel();
			var me=mdl.getProperty('/auth/user');
			var won=e.arg.won==me;
			if (won) this.mergeResultToInventory(e.arg.loot);
			var msgs=[this.geti18n('gameResultVersus'+(won?'Win':'Lose'))];
			if (won) msgs.push(this.geti18n('gameResultLocalWin')); 
			this.showToast(msgs.join('\n'));
		},
		
		onShowResultRPGCoop:function(e){
			var msgs,prio="None";
			var mdl=this.getView().getModel();
			var resetLostLives=true;
			var resetStash=true;
			var floor=1;
			if (e.arg.result=="win") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalWin')];
				if (e.arg.floor>1) msgs.push(this.geti18n('gameResultLocalAscend'));
				this.mergeResultToInventory(e.arg.loot);
				if (e.arg.recipes) this.refreshKnownRecipes(e.arg.recipes);
			} else if (e.arg.result=="continue") {
				prio="Low";
				msgs=[this.geti18n('gameResultLocalContinue',e.arg.floor)];
				var resetStash=false;
				floor=e.arg.floor;
			} else if (e.arg.result=="flee") {
				prio="High";
				msgs=[this.geti18n('gameResultLocalFlee',[e.arg.floor,e.arg.lives])];
				resetLostLives=false;
				floor=e.arg.floor;
			} else {
				msgs=[this.geti18n('gameResultLocalLose')];
				prio="High";
				if (e.arg.eventKey=='endBattleLostAllLives') msgs.push(this.geti18n('gameResultTime',e.arg.time));
				if (e.arg.floor>1) msgs.push(this.geti18n('gameResultLocalAscend'));
			}
			var msg=msgs.join('\n');
			if (this.battleInfo) {
				this.addLogEntry({ 
					eventKey:e.arg.eventKey, descr:msg, title:this.geti18n('game_'+e.arg.eventKey),priority:prio
				});
			} else this.showToast(msg);
			this.battleInfo=null;
			if (resetLostLives) mdl.setProperty('/gameInfo/livesLost',{});
			if (resetStash) mdl.setProperty('/gameInfo/stash',null);
			mdl.setProperty('/gameInfo/floor',floor);
		},
		
		onStartBattle:function(e){

			this.battleInfo=e.arg;
			this.battleLog=[];
			var mdl=this.getView().getModel();
			
			var profiles=e.arg.profiles;
			mdl.setProperty( '/battleInfo',profiles);
			// this.refreshProfiles(e.arg.profiles);

			var me=mdl.getProperty('/auth/user');
			mdl.setProperty('/canSteal',true);
			mdl.setProperty('/canFlee',true);
			mdl.setProperty('/canHit',true);
			mdl.setProperty('/gameInfo/haveSpells',profiles[me].haveSpells||false);
			mdl.setProperty('/gameInfo/mySpells',profiles[me].spells);
			// if (profiles.boss) key=profiles.boss.name;
			// this.getView().byId("gameTabBar").setSelectedKey(key);
			
			var battlePage=this.getView().byId("battle");
			var navContainer=this.getView().byId("app");
			window.setTimeout(function(){ navContainer.to(battlePage,"flip"); }, 500);
		},

		onStartBattleCoop:function(e){
			e.arg.title=this.geti18n('game_startBattleCoop',[e.arg.floor,e.arg.time,e.arg.livesLost]);
			e.arg.descr=this.geti18n('game_startBattleCoop_text',e.arg.bossName);
			if (e.arg.knowledgePresence) e.arg.descr+=this.geti18n('game_startBattleCoop_text_knowledge');
			this.onStartBattle(e);
			this.addLogEntry(e.arg);
		},

		onStartBattleVersus:function(e){
			var names=[];
			for (var p in e.arg.profiles) names.push(e.arg.profiles[p].name);
			var stash=[],res=8;
			while (res>0) {
				if (e.arg.loot[res]) stash.push(res+': '+e.arg.loot[res]);
				res--;
			}
			e.arg.title=this.geti18n('game_startBattleVersus',names.join(" "));
			e.arg.descr=this.geti18n('game_startBattleVersus_text',stash.join("\n"));
			this.onStartBattle(e);
			this.addLogEntry(e.arg);
		},				
		
		addLogEntry:function(e){
			var log=this.getView().byId("battleLog")
			log.removeAllItems();
			this.battleLog.push(e);
			e.entryNumber=this.battleLog.length;
			var lastN=[],N=66,i;
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
		
		_formatBattleState:function(hp,state){
			var val=hp;
			var stateSymbols={attack:"!",cooldown:"x",evade:"~",parry:"/",assist:"+",defend:"^",active:""};
			if (stateSymbols[state]) val+=stateSymbols[state];
			return val;
		},
		
		formatBattleState:function(state){
			var keys={
				active:'Success',
				cooldown:'None',
				evade:'Warning',
				parry:'Warning',
				defend:'Success',
				assist:'Success',
				attack:'Error'
			};
			return keys[state];
		},
		
		formatBattleStateIcon:function(state){
			var keys={
				active:'log',
				cooldown:'pending',
				evade:'physical-activity',
				parry:'journey-change',
				defend:'shield',
				assist:'plus',
				attack:'scissors'
			};
			return 'sap-icon://'+(keys[state]);
		},
		
		formatLogIcon:function(eventKey){
			var keys={
				spellCast:'activate',
				hitDamage:'accept',
				hitDamageCrit:'warning',
				hitBlocked:'decline',
				hitPdefDecrease:'trend-down',
				hitEvaded:'move',
				hitParried:'move',
				startBattle:'scissors',
				endBattleLose:'unpaid-leave',
				endBattleWin:'lead',
				completeFloorDescend:'thumb-up'
			};
			if (!keys[eventKey]) { 
				// console.log(eventKey); 
				return '';
			}
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
	
