sap.ui.define(["sap/ui/core/mvc/Controller","sap/m/MessageBox"], function (Controller,MessageBox){
	"use strict";
	
	return Controller.extend("InventoryMixin",{
				
		initInventory:function(){
			var inv=JSON.parse(window.localStorage.getItem("myInventory"));
			if (!inv) inv=Array(8).fill(1).reduce(function(prev,cur,i){
				prev[++i]={key:i,val:0};
				return prev;
			},{});
			this.getView().getModel().setProperty('/inv',inv);
		},
		
		mergeResultToInventory:function(result){
			var mdl=this.getView().getModel();
			var inv=mdl.getProperty('/inv');
			for (var i in result) inv[i].val+=result[i];
			this.syncInv(mdl,inv);
		},
		
		fuseDigit:function(e){
			var ctx=e.getSource().getBindingContext().getObject();
			if (ctx.val>=8 && ctx.key<8){
				var mdl=this.getView().getModel();
				var inv=mdl.getProperty('/inv');
				var fusedAmt=Math.floor(ctx.val/8);
				var leftAmt=ctx.val%8;
				var self=this;
				MessageBox.confirm(
					this.geti18n('inventoryFuseConfirm',[ctx.val,ctx.key,fusedAmt,ctx.key+1]),
					function(action){
						if (action==MessageBox.Action.OK){
							inv[ctx.key+1].val+=fusedAmt;
							inv[ctx.key].val=leftAmt;
							self.syncInv(mdl,inv);
						}
					}
				);
			}
		},
		
		syncInv:function(mdl,inv){
			mdl.setProperty('/inv',inv);
			window.localStorage.setItem('myInventory',JSON.stringify(inv));
		},
	

	});
});
