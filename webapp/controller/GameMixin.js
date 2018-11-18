sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/controls/Board",
	"com/minesnf/ui5client/controls/Cell",
	"sap/m/ScrollContainer","sap/m/Dialog","sap/m/Panel","sap/m/Button","sap/m/ToggleButton",
	"sap/ui/model/json/JSONModel"
], function (Controller, Board, Cell, ScrollContainer, Dialog, Panel, Button, ToggleButton, JSONModel) {
	"use strict";
	
	var CELL_SIZE=28;
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
					// cell.addEventDelegate({
					// 	onAfterRendering:function(){
					// 		var delta=Date.now()-MEASURE_TS;
					// 		console.log(delta);
					// 	}
					// });
					cells.push(cell);
				}
			}
			if (!this.gameDialog) {
				var board=new Board({ rows:rows, cols:cols, content:cells });
				var panel=new Panel({ width:width, content:[ board ]});
				/*
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
				*/
				var crsl=this.getView().byId("crsl");
				this.gameDialog= new ScrollContainer({height:"100%",width:"100%",horizontal:false,vertical:true,content:[panel]});
				crsl.insertPage(this.gameDialog,1);
				window.setTimeout(function(){crsl.next();},1000);
				
			}
			var boardMdl=new JSONModel(mdlData);
			this.gameDialog.setModel(boardMdl,"board");
			// this.gameDialog.open();
		},

		onEndGame:function(){
			this.getView().getModel().setProperty('/bestTime','');
			this.gameDialog.close();
		},

		quitGame:function(){
			this.getView().getModel().setProperty('/bestTime','');
			// this.gameDialog.close();
			if (this.localGame){
				this.getView().byId("crsl").removePage(1);
				this.gameDialog=null;
			} else this.processCommand("/quit");
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
			]
			this.showToast(msgs.join('\n'));
			this.getView().getModel().setProperty('/bestTime',e.arg.bestTime);
		}
	});
});
	
