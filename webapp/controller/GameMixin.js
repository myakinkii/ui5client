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
			if (!this.gameDialog) {
				var board=new Board({ rows:rows, cols:cols, content:cells });
				board.attachMove(function(cellMoved){ self.checkCell.call(self,cellMoved); });
				var panel=new Panel({ width:width, content:[ board ]});
				this.gameDialog=new ScrollContainer({height:"100%",width:"100%",horizontal:false,vertical:true,
					content:[ new FlexBox({ width:"100%", justifyContent:"Center", items:[ panel ] }) ]
				});
				var boardPage=this.getView().byId("board");
				boardPage.destroyContent();
				boardPage.addContent(this.gameDialog);
				var navContainer=this.getView().byId("app");
				navContainer.to(boardPage,"flip");
				
				this.getView().getModel().setProperty('/gameStarted',true);
			}
			this.gameDialog.setModel(new JSONModel(mdlData),"board");
		},
		
		checkCell:function(cell){
			// if (cell.getChecked()) return;
			// cell.setChecked(true);
			// var self=this;
			// window.setTimeout(function(){ self.processCommand("/check "+cell.getCol()+" "+cell.getRow()); },0);
			this.processCommand("/check "+cell.getCol()+" "+cell.getRow());
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
			if (e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=[
				'time:'+ e.arg.time+'s',
				// 'wins/loss ratio:'+e.arg.winPercentage,
				// 'won:'+e.arg.won,
				// 'streak:'+e.arg.streak
			];
			this.showToast(msgs.join('\n'));
		},
		
		onShowResultCoop:function(e){
			if (e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=[ 'time:'+ e.arg.time+'s' ];
			this.showToast(msgs.join('\n'));
		},
		
		onShowResultVersus:function(e){
			var scores=[];
			for (var s in e.arg.score) scores.push({user:s,score:e.arg.score[s]});
			scores.sort(function(s1,s2){ return s2.score-s1.score; });
			var me=this.getView().getModel().getProperty('/auth/user');
			var result='lost :(';
			if (scores[0].user==me) {
				this.mergeResultToInventory(this.digitPocket);
				result='won!';
			}
			this.digitPocket=null;
			var msgs=[ 'time:'+ e.arg.time+'s', result];
			msgs=msgs.concat(scores.map(function(s){ return s.user+":"+s.score; }));
			this.showToast(msgs.join(', '),2000);
		},			
		
		onShowResultLocal:function(e){
			if (e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=['time:'+ e.arg.time+'s'];
			if (e.arg.livesLost) msgs.push("lives lost: "+e.arg.livesLost);
			this.showToast(msgs.join(', '));
		}		
	});
});
	
