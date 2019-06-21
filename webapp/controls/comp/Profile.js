sap.ui.define(["sap/ui/core/XMLComposite","com/minesnf/ui5client/model/localGame"], function(XMLComposite,LocalGame) {
	"use strict";
	var myProfile = XMLComposite.extend("com.minesnf.ui5client.controls.comp.Profile", {
		metadata: {
			properties: {
				level: { type: "string", defaultValue: "0" },
				curAP: { type: "int", defaultValue: 0 },
				maxAP: { type: "int", defaultValue: 0 },
				hp: { type: "string", defaultValue: "8" },
				patk: { type: "int", defaultValue: 0 },
				pdef: { type: "int", defaultValue: 0 },
				maxhp: { type: "int", defaultValue: 0 },
				speed: { type: "int", defaultValue: 0 },
				attackers: { type: "int", defaultValue: 0 },
				name: { type: "string", defaultValue: "me" },
				self: { type: "string", defaultValue: "me" },
				selfAP: { type: "int", defaultValue: 0 },
				selfState: { type: "string", defaultValue: "cool" },
				state: { type: "string", defaultValue: "cool" },
				selfTarget: { type: "string", defaultValue: "boss" },
				target: { type: "string", defaultValue: "boss" },
				currentEventKey: { type: "string", defaultValue: "" },
				currentEventText: { type: "string", defaultValue: "" },
				coopFlag: { type: "boolean", defaultValue: false },
				meFlag: { type: "boolean", defaultValue: false },
				mobFlag: { type: "boolean", defaultValue: false }
			},
			events: {
				performAction: { parameters: { action: {type: "string"}, target: {type:"string"} }}
			}
		},
		performAction:function(e){
			var action=e.getSource().data().action;
			var ctx=e.getSource().getBindingContext().getObject();
			this.fireEvent("performAction", {action: action, target: ctx.name});
		},
		formatCanHit:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.hit;
		},
		formatCanParryEvade:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.parry;
		},
		formatCanDefend:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.defend;
		},
		formatCanAssist:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.assist;
		},
		formatNotBusy:function(state){
			return ["attack","assist","cast","cooldown"].indexOf(state)<0;
		},
		formatHitButton:function(coopFlag,self,name,mobFlag){
			return coopFlag ? mobFlag : self!=name;
		},
		formatParryEvadeButton:function(attackers,self,name){
			return self==name && attackers>0;
		},
		formatDefendButton:function(attackers,self,name,mobFlag,selfTarget){
			return attackers>0 && self!=name && !mobFlag && selfTarget!=name;
		},
		formatAssistButton:function(state,target,self,name,mobFlag){
			return state=='attack' && !mobFlag && self!=name && target!=self;
		},		
		formatHP:function(hp){ return hp>3?'Success':hp>0?'Warning':'None'; },
		formatBattleStateText:function(state){ return this._geti18n('state_'+state); },
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
		formatBattleLogIcon:function(eventKey){
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
		_geti18n: function(prop, arr) {
			return this.getResourceBundle().then(function(bndl){ return bndl.getText(prop, arr); });
		}
	});
	return myProfile;
}, /* bExport= */ true);