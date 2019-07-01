sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"com/minesnf/ui5client/lib/qrcode"
], function (Controller,JSONModel,MessageBox){
	"use strict";
	
	return Controller.extend("UserMixin",{
		
		onAuthorize:function(e){
			var mockUser={
				"user":"user1","type":"temp",
				"profile":{"score":0,"rankTotal":0,"muted":{},"rank":{},"coop":{},"versus":{}}
			};
			var user=e.arg||mockUser;
			user.profile.level=8;
			this.getView().getModel().setProperty('/auth',user);
		},

		onAuthFail:function(e){
			var msg=e.arg;
			this.showToast(msg);
		},

		onReauth:function(){
			window.location.reload(true);
		},

		showAuthDlg:function(){
			if (!this.authDlg) {
				this.authDlg=sap.ui.xmlfragment( "com.minesnf.ui5client.view.authDlg", this );
				this.getView().addDependent(this.authDlg);
			}
			/*
			var authFn=function(e){ 
				if(e.which == 13) this.authUser(); 
			}.bind(this);
			sap.ui.getCore().byId("authUser").attachBrowserEvent('keypress', authFn);
			sap.ui.getCore().byId("authPwd").attachBrowserEvent('keypress', authFn);
			var authMdl=new JSONModel({user:'',pwd:''});
			this.authDlg.setModel(authMdl,"auth");
			*/
			this.authDlg.open();
			var mdl=this.getView().getModel().getData();
			this.exportProfile(mdl.inv,mdl.equip);
		},

		authUser:function(){
			var auth=this.authDlg.getModel("auth").getData()
			this.processCommand('/login '+auth.user+' '+auth.pwd);
		},

		logOff:function(){
			this.processCommand('/logoff');
		},
		
		clearProfile:function(){
			var self=this;
			MessageBox.confirm(this.geti18n('authClearProfile'), function(action) {
				if (action == MessageBox.Action.OK) {
					window.localStorage.removeItem("importUsed");
					window.localStorage.removeItem("knownRecipes");
					window.localStorage.removeItem('myInventory');
					window.localStorage.removeItem('myEquipment');
					self.initInventory.call(self);
					self.exportProfile.call(self,{},[]);
				}
			});
		},
		
		exportProfile: function(mdlInv,mdlEquip) {
			var inv=[],i;
			for (i in mdlInv) inv.push(mdlInv[i].val);
			var equip=mdlEquip.map(function(gem){return gem.rarity+"_"+gem.effect; });
			var recipes=JSON.parse(window.localStorage.getItem("knownRecipes")||"[]");
			var cheated=window.localStorage.getItem("importUsed")?true:false;
			$('#qrcode')[0].innerHTML=''; // clear div
			new QRCode("qrcode", {
				text: JSON.stringify({ inv:inv, equip:equip,recipes:recipes,cheated:cheated}),
				width: 250,
				height: 250,
				colorDark: "#000000",
				colorLight: "#ffffff",
				correctLevel: QRCode.CorrectLevel.H
			});
		},
		
		importProfile:function(){
			var mdl=this.getView().getModel();
			var self=this;
			if (cordova && cordova.plugins) cordova.plugins.barcodeScanner.scan(function(result){
				if (result.text) try {
					var res = JSON.parse(result.text);
					self.refreshKnownRecipes.call(self,res.recipes);
					var inv={},equip=[];
					if (res.inv) {
						inv=res.inv.reduce(function(prev,cur,ind){ 
							var key=ind+1;
							prev[key]={key:key,val:cur};
							return prev; 
						},{});
						self.syncInv.call(self,mdl,inv);
					}
					if (res.equip) {
						equip=res.equip.map(function(val){
							var gem=val.split('_');
							return {rarity:gem[0],effect:gem[1],eqiupped:false};
						});
						self.syncEquip.call(self,mdl,equip);
					}
					self.showToast(self.geti18n('authProfileImported'));
					window.localStorage.setItem("importUsed","x");
					self.exportProfile(inv,equip);
				} catch (e) {
					self.showToast(self.geti18n('authProfileImportFailed'));
					console.log(e);
				}
			}, function(err){
				console.log(err);
			}, {
				preferFrontCamera: false, // iOS and Android
				showFlipCameraButton: true, // iOS and Android
				showTorchButton: true, // iOS and Android
				torchOn: true, // Android, launch with the torch switched on (if available)
				prompt: "Place a barcode inside the scan area", // Android
				resultDisplayDuration: 500, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
				formats: "QR_CODE", // default: all but PDF_417 and RSS_EXPANDED
				orientation: "landscape", // Android only (portrait|landscape), default unset so it rotates with the device
				disableAnimations: true // iOS
			});
		}
		
	});
});
