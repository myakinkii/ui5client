sap.ui.define(['sap/ui/core/XMLComposite'], function(XMLComposite) {
	"use strict";
	var myProfile = XMLComposite.extend("com.minesnf.ui5client.controls.comp.Profile", {
		metadata: {
			properties: {
				level: { type: "string", defaultValue: "0" },
				hp: { type: "string", defaultValue: "8" },
				patk: { type: "int", defaultValue: 0 },
				pdef: { type: "int", defaultValue: 0 },
				maxhp: { type: "int", defaultValue: 0 },
				speed: { type: "int", defaultValue: 0 },
				name: { type: "string", defaultValue: "boss" },
				attackers: { type: "int", defaultValue: 0 },
				self: { type: "string", defaultValue: "me" },
				state: { type: "string", defaultValue: "active" },
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
		formatNotBusy:function(state){
			return ["attack","cast","cooldown"].indexOf(state)<0;
		},
		formatHitButton:function(coopFlag,mobFlag){
			var meFlag=this.getSelf()==this.getName();
			return coopFlag ? (mobFlag ? true : meFlag) : !meFlag;
			return coopFlag ? (this.getMobFlag() ? true : meFlag) : !meFlag;
		},
		formatParryEvadeButton:function(attackers){
			var meFlag=this.getSelf()==this.getName();
			return meFlag && attackers>0;
		},
		formatAssistButton:function(state,target){
			var meFlag=this.getSelf()==this.getName();
			return state=='attack' && !this.getMobFlag && !meFlag && target!=this.getSelf();
		},
		formatDefendButton:function(attackers,mobFlag){
			var meFlag=this.getSelf()==this.getName();
			return attackers>0 && !this.getMobFlag() && !meFlag;
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
		},
	});
	return myProfile;
}, /* bExport= */ true);