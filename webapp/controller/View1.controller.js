sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"libs/nowjs/now",
	"sap/m/Dialog","sap/m/FlexBox","sap/m/Panel","sap/m/Button"
], function (Controller,JSONModel,now,Dialog,FlexBox,Panel,Button) {
	"use strict";

	var CELL_SIZE=24;

	sap.ui.core.Control.extend("MyCell", {
		metadata : {
			properties : {
				"row":"int",
				"col":"int",
				"val" : "string",
				"size" : {type: "sap.ui.core.CSSSize", defaultValue: CELL_SIZE+"px"}
			},
			events: {
				"openCell" : {}
			}
		},
		renderer : function(oRm, oControl) {

			oRm.write("<div"); 
			oRm.writeControlData(oControl);
			oRm.addStyle("width", oControl.getSize());
			oRm.addStyle("height", oControl.getSize());
			oRm.addStyle("text-align","center");
			if (oControl.getVal()=='')  oRm.addStyle("background-color", oControl.calcColor("0"));
			oRm.writeStyles();
			oRm.addClass("myCell");
			oRm.writeClasses();
			oRm.write(">");

			var val=oControl.getVal();
			var color=oControl.calcColor(val);
			oRm.write('<span style="vertical-align:middle;display:inline-block;color:'+color+'">');
			oRm.writeEscaped(val=='0'?'':val=="-8"?'*':val);
			oRm.write("</span>");

			oRm.write("</div>");
		},

		calcColor:function(val){
			return ['#aaa','#00f','#390','#f00','#309','#930','#099','#939','#000'][val];
		},

		onclick : function(evt) {
			this.fireOpenCell();
		}
	});

	sap.ui.core.Control.extend("MyBoard", {
		metadata : {
			properties : {
				"boxColor" : "string",
				"rows":"int",
				"cols":"int",
			},
			aggregations: { 
				content: {singularName: "content"}
			}
		},
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.writeClasses();
			oRm.write(">");

			oControl.getContent().forEach(function(child){
				oRm.write("<div");
				oRm.addStyle("display", "inline-block");
				oRm.addStyle("border", "1px solid " + oControl.getBoxColor());
				oRm.addStyle("margin", "1px");
				oRm.writeStyles();
				oRm.write(">");
				oRm.renderControl(child);
				oRm.write("</div>");
			});
			oRm.write("</div>");
		}
	});	

	return Controller.extend("com.minesnf.ui5client.controller.View1", {
		
		onInit:function(){
			var mdl=new JSONModel({evts:{},msg:''});
			this.getView().setModel(mdl);
			var self=this;
			if (!window.now) window.now = nowInitialize("http://minesnf.com", {});
			window.now.dispatchEvent=function(e){ self.processEvent.call(self,e) };
			window.setTimeout(function(){ self.processCommand=window.now.processCommand; },500);
			this.getView().byId("input").attachBrowserEvent('keypress', function(e){
				if(e.which == 13){ self.sendMsg.call(self);
			}});
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
			console.log(e);
		},

		onUpdateParties:function(e){
			console.log("parties",e.arg);
			this.getView().getModel().setProperty('/parties',e.arg);
		},

		onUpdatePlayers:function(e){
			var players=[];
			for (var p in e.arg) { e.arg[p].name=p; players.push(e.arg[p]); }
			console.log("players",players);
			this.getView().getModel().setProperty('/players',players);
		},

		startRank:function(e){
			var boardSize=e.getSource().data().boardSize;
			console.log(boardSize);
			this.processCommand('/create rank '+boardSize);
		},

		onStartGame: function (e) {
			var self = this;
			var cols=e.arg.c;
			var rows=e.arg.r;
			var width=50+(CELL_SIZE+4)*cols+'px';
			var title=e.arg.boardId+" ("+cols+"x"+rows+")";
			var mdlData={};
			var cells=[],coord;
			for (var r=1;r<=rows;r++) {
				for (var c=1;c<=cols;c++) {
					coord=e.arg.boardId+"_"+c+"_"+r;
					// mdlData[coord]=c;
					mdlData[coord]="";
					cells.push(new MyCell({
						row:r, col:c, 
						val:"{board>/"+coord+"}",
						openCell:function(e){ 
							var row=e.getSource().getRow();
							var col=e.getSource().getCol();
							self.processCommand("/check "+col+" "+row);
						 }
					}));
				}
			}
			if (!this.pressDialog) {
				this.pressDialog = new Dialog({
					title: title,
					contentWidth:"100%",
					content: [
						new FlexBox({ width:"100%", alignItems:"Center", justifyContent:"Center",
							items:[ new Panel({width:width, content:[
								new MyBoard({ 
									rows:rows, cols:cols, boxColor: "#000", 
									content:cells 
								}) 
							]}) ]
						})
					],
					beginButton: new Button({
						text: '{i18n>genericClose}',
						press: function () { self.pressDialog.close(); self.processCommand("/quit"); }
					}),
					afterClose:function(e){ 
						e.getSource().destroy(); 
						self.pressDialog=null;
					}
				});
				this.getView().addDependent(this.pressDialog);
			}
			var boardMdl=new JSONModel(mdlData);
			this.pressDialog.setModel(boardMdl,"board");
			this.pressDialog.setTitle(title);
			this.pressDialog.open();
		},

		onCellValues:function(e){
			if (this.pressDialog){
				var mdl=this.pressDialog.getModel("board");
				for (var i in e.arg) mdl.setProperty("/"+i,e.arg[i]);
			}
		},

		onOpenLog:function(e){
			if (this.pressDialog){
				var mdl=this.pressDialog.getModel("board");
				console.log(e)
				for (var i in e.arg) for (var c in e.arg[i].cellsOpened) 
					mdl.setProperty("/"+c,e.arg[i].cellsOpened[c]);
			}
		}

	});
});
