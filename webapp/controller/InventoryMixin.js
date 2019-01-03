sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/Dialog","sap/m/Button","sap/ui/model/Sorter","sap/ui/model/Filter","sap/ui/model/FilterOperator","sap/m/List","sap/m/ObjectListItem"
	], function (Controller,MessageBox,Dialog,Button,Sorter,Filter,FilterOperator,List,ObjectListItem){
	"use strict";
	
	return Controller.extend("InventoryMixin",{
				
		initInventory:function(){
			var inv=JSON.parse(window.localStorage.getItem("myInventory"));
			if (!inv) inv=Array(8).fill(1).reduce(function(prev,cur,i){
				prev[++i]={key:i,val:0};
				return prev;
			},{});
			this.getView().getModel().setProperty('/inv',inv);
			this.recipes={
				'33333333':{effect:'maxhp'},
				'44444444':{effect:'pdef'},
				'55555555':{effect:'patk'}
			};
			this.modifiers={6:'common',7:'rare',8:'epic'};
			this.resetForge();
			
			var equip=JSON.parse(window.localStorage.getItem("myEquipment")||"[]");
			this.getView().getModel().setProperty('/equip',equip);
		},
		
		resetForge:function(){
			var forge={
				buttons:{
					1:{key:1, digit:'X'},
					2:{key:2, digit:'X'},
					3:{key:3, digit:'X'},
					4:{key:8, digit:'X'},
					5:{key:0, special:true, digit:'X'},
					6:{key:4, digit:'X'},
					7:{key:7, digit:'X'},
					8:{key:6, digit:'X'},
					9:{key:5, digit:'X'}
				},
				inv:JSON.parse(JSON.stringify(this.getView().getModel().getProperty('/inv')))
			};
			this.getView().getModel().setProperty('/forge',forge);
		},
		
		mergeResultToInventory:function(result){
			var mdl=this.getView().getModel();
			var inv=mdl.getProperty('/inv');
			for (var i in result) inv[i].val+=result[i];
			this.syncInv(mdl,inv);
		},
		
		changeForgeDigit:function(evt){
			var mdl=this.getView().getModel();
			var forgeDigitCtx=evt.getSource().getBindingContext();
			var filters=[new Filter('val',FilterOperator.GT,0)];
			if (forgeDigitCtx.getProperty('key')==0) filters.push(new Filter('key',FilterOperator.GT,5));
			var forgeDialog = new Dialog({
				showHeader:false,
				content:[
					new List({
						items:{ 
							path: '/forge/inv', 
							sorter: new Sorter('key',true),
							filters:filters,
							template: new ObjectListItem({ title:"{key}", number:"{val}", type:'Active' })
						},
						itemPress:function(e){
							var ctx = e.getParameter("listItem").getBindingContext();
							var oldVal=forgeDigitCtx.getProperty('digit');
							mdl.setProperty('digit',ctx.getProperty('key'),forgeDigitCtx);
							mdl.setProperty('val',ctx.getProperty('val')-1,ctx);
							if (oldVal!='X') {
								mdl.setProperty('/forge/inv/'+oldVal+'/val',mdl.getProperty('/forge/inv/'+oldVal+'/val')+1);
							}
							e.getSource().getParent().close();
						}						
					})
				],
				endButton: new Button({ text:this.geti18n("genericClose"), press:function(e){e.getSource().getParent().close(); } }),
				afterClose:function(){ this.destroy(); }
			});
			forgeDialog.setModel(mdl);
			forgeDialog.open();
		},
		
		startForge:function(){
			var mdl=this.getView().getModel();
			var digits=mdl.getProperty('/forge/buttons');
			var cost={};
			var recipe=[];
			var modifier;
			var d,res;
			for (d in digits){
				res=digits[d];
				if (res.digit=='X') continue;
				if (res.key==0) modifier=res.digit;
				else recipe[res.key]=res.digit;
				if (!cost[res.digit]) cost[res.digit]=0;
				cost[res.digit]--;
			}
			var recipeFilledDigits=recipe.reduce(function(prev,cur){if (cur) prev++; return prev;},0);
			var rarity=this.modifiers[modifier];
			if (recipeFilledDigits<8) this.showToast(this.geti18n('inventoryForgeRecipeNotComplete'));
			else if (!rarity) this.showToast(this.geti18n('inventoryForgeRecipeAddModifier'));
			else {
				var self=this;
				MessageBox.confirm(
					this.geti18n('inventoryForgeConfirm'),
					function(action){
						if (action==MessageBox.Action.OK){
							self.tryCraftGem.call(self,recipe,rarity,cost);
						}
					}
				);
			}
		},
		
		tryCraftGem:function(recipe,rarity,cost){
			var gem=this.recipes[recipe.join('')];
			if(gem && rarity) {
				this.showToast(this.geti18n('inventoryForgeSuccess',[rarity,gem.effect]));
				this.mergeGemToEquipment(gem,rarity);
			} else this.showToast(this.geti18n('inventoryForgeFail'));
			this.mergeResultToInventory(cost);
			this.resetForge();
		},
		
		mergeGemToEquipment:function(gem,rarity){
			var mdl=this.getView().getModel();
			var equip=mdl.getProperty('/equip');
			equip.push({effect:gem.effect,rarity:rarity,equipped:false});
			this.syncEquip(mdl,equip);
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
	
		syncEquip:function(mdl,equip){
			mdl.setProperty('/equip',equip);
			window.localStorage.setItem('myEquipment',JSON.stringify(equip));
		},
		
		equipGem:function(e){
			var mdl=this.getView().getModel();
			var equip=mdl.getProperty('/equip');
			var equippedCount=equip.reduce(function(prev,cur){ if(cur.equipped) prev++; return prev;},0);
			var level=mdl.getProperty('/auth/profile/level');
			var src=e.getSource();
			if(src.getState()==true){
				if (level<equippedCount) {
					this.showToast(this.geti18n('inventoryEquipLevelNotEnough',[level]));
					src.setState(!src.getState());
				}
			}
			this.syncEquip(mdl,equip);
		}

	});
});
