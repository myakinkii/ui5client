sap.ui.define(["sap/ui/core/XMLComposite","com/minesnf/ui5client/model/localGame"], function(XMLComposite,LocalGame) {
	"use strict";
	var myProfile = XMLComposite.extend("com.minesnf.ui5client.controls.comp.Profile", {
		metadata: {
			properties: {
				castMode:{ type: "boolean", defaultValue: false },
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
				selfHP: { type: "int", defaultValue: 0 },
				selfAP: { type: "int", defaultValue: 0 },
				selfMP: { type: "int", defaultValue: 0 },
				selfState: { type: "string", defaultValue: "active" },
				state: { type: "string", defaultValue: "active" },
				selfTarget: { type: "string", defaultValue: "boss" },
				target: { type: "string", defaultValue: "boss" },
				currentEventKey: { type: "string", defaultValue: "" },
				currentEventText: { type: "string", defaultValue: "" },
				coopFlag: { type: "boolean", defaultValue: false },
				meFlag: { type: "boolean", defaultValue: false },
				mobFlag: { type: "boolean", defaultValue: false }
			},
			events: {
				performAction: { parameters: { action: {type: "string"}, target: {type:"string"}, arg: {type:"string"} }}
			}
		},
		performAction:function(e){
			var action=e.getSource().data().action;
			var ctx=e.getSource().getBindingContext().getObject();
			if (action=="cast") this.setCastMode(true);
			else this.fireEvent("performAction", {action: action, target: ctx.name});
		},
		performCast:function(e){
			this.setCastMode(false);
			var spell=e.getSource().data().spell;
			var ctx=e.getSource().getBindingContext().getObject();
			this.fireEvent("performAction", {action: "cast", target: ctx.name, arg: spell});
		},
		formatCanCast:function(selfState,selfMP){
			return this.formatNotBusy(selfState) && selfMP>0;
		},		
		formatCanHit:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.hit;
		},
		formatCanParryEvade:function(selfState,selfAP){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.parry;
		},
		formatCanDefend:function(selfState,selfAP,attackers,selfTarget,name){
			return this.formatNotBusy(selfState) && attackers>0 && selfTarget!=name && selfAP>=LocalGame.RPGMechanics.actionCostAP.defend;
		},
		formatCanAssist:function(selfState,selfAP,state,target,self){
			return this.formatNotBusy(selfState) && selfAP>=LocalGame.RPGMechanics.actionCostAP.assist && state=='attack' && target!=self;
		},
		formatNotBusy:function(state){
			return ["attack","assist","defend","cast"].indexOf(state)<0;
		},
		formatBusyState:function(state){
			return !this.formatNotBusy(state);
		},
		formatCastButton:function(self,name){
			return self==name;
		},
		formatHitButton:function(coopFlag,self,name,mobFlag){
			return coopFlag ? mobFlag : self!=name;
		},
		formatParryEvadeButton:function(attackers,self,name){
			return self==name && attackers>0;
		},
		formatDefendButton:function(self,name,mobFlag){
			return self!=name && !mobFlag;
			return attackers>0 && self!=name && !mobFlag && selfTarget!=name;
		},
		formatAssistButton:function(self,name,mobFlag){
			return self!=name && !mobFlag;
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
				attack:'scissors',
				cast:'activate',
			};
			return 'sap-icon://'+(keys[state]);
		},
		formatBattleEventState:function(state,target,self,eventKey){
			if (eventKey=='userStateChange_attack_me') return 'Warning';
			return 'None';
		},
		_geti18n: function(prop, arr) {
			return this.getResourceBundle().then(function(bndl){ return bndl.getText(prop, arr); });
		}
	});
	return myProfile;
}, /* bExport= */ true);