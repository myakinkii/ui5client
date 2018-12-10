sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"sap/m/FlexBox","sap/m/ScrollContainer","sap/m/Panel",
	"sap/ui/model/json/JSONModel"
], function (Controller, Board, Cell, FlexBox, ScrollContainer, Panel, JSONModel) {
	"use strict";
	
	var CELL_SIZE=parseInt(Cell.getMetadata().getProperty("size").defaultValue.replace("px",""),10);
	var MEASURE_TS; // to measure renderer performance
	
	return Controller.extend("GameMixin",{
					
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
			var width=(CELL_SIZE+4)*cols+32+'px'; // panel has 16px margin
			var title=e.arg.boardId+" ("+cols+"x"+rows+")";
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
							openCell:function(e){
								var row=e.getSource().getRow();
								var col=e.getSource().getCol();
								self.processCommand("/check "+col+" "+row);
							 }
						});
						// cell.addEventDelegate({
						// 	onAfterRendering:function(){
						// 		var delta=Date.now()-MEASURE_TS;
						// 		console.log(delta);
						// 	}
						// });
						cells.push(cell);
					}
				}
			}
			if (!this.gameDialog) {
				var crsl=this.getView().byId("crsl");
				var board=new Board({ rows:rows, cols:cols, content:cells });
				var panel=new Panel({ width:width, content:[ board ]});
				this.gameDialog=new ScrollContainer({height:"100%",width:"100%",horizontal:false,vertical:true,
					content:[ new FlexBox({ width:"100%", justifyContent:"Center", items:[ panel ] }) ]
				});
				crsl.insertPage(this.gameDialog,1);
				window.setTimeout(function(){crsl.next();},300);
				this.getView().getModel().setProperty('/gameStarted',true);
			}
			this.gameDialog.setModel(new JSONModel(mdlData),"board");
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
			this.getView().byId("crsl").removePage(1);
			this.gameDialog=null;
		},

		onCellValues:function(e){
			MEASURE_TS=Date.now();
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
			if ( this.localGame && e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
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
			if ( this.localGame && e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=[ 'time:'+ e.arg.time+'s' ];
			this.showToast(msgs.join('\n'));
		},		
		
		onShowResultLocal:function(e){
			if ( this.localGame && e.arg.result=="win") this.mergeResultToInventory(this.digitPocket);
			this.digitPocket=null;
			var msgs=['time:'+ e.arg.time+'s'];
			if (e.arg.livesLost) msgs.push("lives lost: "+e.arg.livesLost);
			this.showToast(msgs.join(', '));
		}		
	});
});
	
