sap.ui.define([], function () {
	"use strict";
	// wrapper for nodejs modules created with
	// cd minesNF && browserify Modes.js --standalone minesNF > ../ui5client/webapp/lib/minesNF.js 
	// and added to index.html <script src="lib/minesNF.js"></script>
	return minesNF;
});