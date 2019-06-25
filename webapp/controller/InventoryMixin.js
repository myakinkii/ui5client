sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"com/minesnf/ui5client/model/localGame",
	"sap/m/MessageBox",
	"sap/m/Dialog","sap/m/Button","sap/ui/model/Sorter","sap/ui/model/Filter","sap/ui/model/FilterOperator",
	"sap/m/List","sap/m/ObjectListItem","sap/m/GroupHeaderListItem"
	], function (Controller,LocalGame,MessageBox,Dialog,Button,Sorter,Filter,FilterOperator,List,ObjectListItem,GroupHeaderListItem){
	"use strict";
	
	return Controller.extend("InventoryMixin",{
				
		initInventory:function(){
			var inv=JSON.parse(window.localStorage.getItem("myInventory"));
			if (!inv) inv=Array(8).fill(1).reduce(function(prev,cur,i){
				prev[++i]={key:i,val:0};
				return prev;
			},{});
			var mdl=this.getView().getModel();
			mdl.setProperty('/inv',inv);

			this.recipes=this.checkSeedRecipes().reduce(function(prev,cur){
				var rec=cur.split("_");
				prev[rec[1]]={effect:rec[0],recipe:rec[1]};
				return prev;
			},{});
			this.modifiers={6:'common',7:'rare',8:'epic'};
			this.refreshKnownRecipes(["mana"]);
			this.resetForge();
			var equip=JSON.parse(window.localStorage.getItem("myEquipment")||"[]");
			mdl.setProperty('/equip',equip);
		},
		
		refreshKnownRecipes:function(effects){
			var knownRecipes=JSON.parse(window.localStorage.getItem("knownRecipes")||"[]");
			var knownHash=knownRecipes.reduce(function(prev,cur){
				prev[cur]=cur;
				return prev;
			},{});
			if (effects) {
				effects.forEach(function(eff){
					if(!knownHash[eff]) {
						knownHash[eff]=eff;
						knownRecipes.push(eff);
					}
				});
				window.localStorage.setItem("knownRecipes",JSON.stringify(knownRecipes));
			}
			var gameRecipes=JSON.parse(window.localStorage.getItem("gameRecipes"));
			var recipes=gameRecipes.map(function(r){
				var rcp=r.split("_");
				return {effect:rcp[0],recipe:rcp[1]};
			}).filter(function(rec){
				return knownHash[rec.effect]?true:false;
			});
			var mdl=this.getView().getModel();
			mdl.setProperty('/recipesKnown',recipes.length>0);
			mdl.setProperty('/recipes',recipes);
		},
		
		addKnownRecipe:function(effect){
			this.refreshKnownRecipes(effect);
		},
		
		checkSeedRecipes:function(){
			
			var gems=LocalGame.RPGMechanics.gems;
			var seededRecipes=JSON.parse(window.localStorage.getItem("gameRecipes")||"[]");
			if (seededRecipes.length==gems.length) return seededRecipes;
			
			var seededHash=seededRecipes.reduce(function(prev,cur){ 
				var arr=cur.split("_"),eft=arr[0],rec=arr[1];
				prev[eft]=rec;
				return prev;
			},{});
			
			var recipesMaxDigit=gems.reduce(function(prev,cur){
				if (cur.rarity==0) prev[cur.eft]=5; // buff/debuff gems
				else prev[cur.eft]=cur.rarity+3;
				return prev;
			},{});
			
			var uniq={};
			function genRecipe(eft,index){
				if (seededHash[eft]) {
					uniq[seededHash[eft]]=seededHash[eft];
					return seededHash[eft];
				}
				var recipe='', nextDigit, haveMaxDigit=false, maxDigitCount=0;
				for (var i=0;i<8;i++) {
					nextDigit=Math.floor(Math.random()*recipesMaxDigit[eft])+1;
					if (nextDigit==recipesMaxDigit[eft]) {
						maxDigitCount++;
						if (!haveMaxDigit) haveMaxDigit=true;
						if (maxDigitCount>2) nextDigit--; // to have not more than two max digits
					}
					if (i==7 && !haveMaxDigit) recipe+=recipesMaxDigit[eft]; // to have at least one max digit
					else recipe+=nextDigit;
				}
				if (uniq[recipe]) return genRecipe(eft,index);
				uniq[recipe]=recipe;
				return recipe;
			}
			var recipes=gems.map(function(gem,index){ return gem.eft+"_"+genRecipe(gem.eft,index); });
			window.localStorage.setItem("gameRecipes",JSON.stringify(recipes));
			return recipes;
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
		
		applyKnownRecipe:function(e){
			this.resetForge();
			var mdl=this.getView().getModel();
			var recipe=e.getSource().getBindingContext().getProperty("recipe");
			var forgeInv=mdl.getProperty('/forge/inv');
			var map=[1,2,3,6,9,8,7,4];
			for (var i=0,dig; i<recipe.length; i++) {
				dig=recipe.charAt(i);
				if (forgeInv[dig].val==0) break;
				forgeInv[dig].val--;
				mdl.setProperty('/forge/buttons/'+map[i]+'/digit',dig);
			}
			mdl.setProperty('/forge/inv',forgeInv);
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
				this.showToast(this.geti18n('inventoryForgeSuccess',[this.geti18n('rarity_'+rarity),this.geti18n('effect_'+gem.effect)]));
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
			this.resetForge();
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
		},
		
		getInvGroupHeader:function(oGroup) {
			return new GroupHeaderListItem({ title : this.geti18n('rarity_'+oGroup.key), upperCase : false });
		},
		
		formatGemEffect:function(eff){
			return this.geti18n('effect_'+eff);
		},
		
		equipSorter:{COMMON:1,RARE:2,EPIC:3},
		sortEquip:function(r1,r2){ return this.equipSorter[r2]-this.equipSorter[r1]; }

	});
});
