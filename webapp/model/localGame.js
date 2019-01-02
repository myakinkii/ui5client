sap.ui.define([], function () {
	"use strict";

	function Board(name, pars) {
		this.tabId = name;
		this.sizeX = pars.c;
		this.sizeY = pars.r;
		this.bombs = pars.b;
	}

	Board.prototype.init = function (Xinit, Yinit, r) {
		var maxDigit=0,curVal;
		this.board = [];
		this.mines = {};
		this.checked = {};
		this.empty = this.sizeX * this.sizeY - this.bombs;
		for (var i = 0; i < this.sizeY + 2; i++) {
			this.board[i] = [];
			for (var j = 0; j < this.sizeX + 2; j++)
				this.board[i][j] = 0;
		}
		var steps = this.bombs;
		while (steps > 0) {
			var x = Math.round(Math.random() * (this.sizeX - 1)) + 1;
			var y = Math.round(Math.random() * (this.sizeY - 1)) + 1;
			if (this.board[y][x] > 8 || (Math.abs(x - Xinit) < r && Math.abs(y - Yinit) < r)) continue
			else {
				this.mines[this.tabId + '_' + x + '_' + y] = -8;
				for (var n1 = -1; n1 < 2; n1++)
					for (var n2 = -1; n2 < 2; n2++){
						curVal=++this.board[y + n1][x + n2];
						if (curVal<9 && curVal>maxDigit) maxDigit=curVal;
					}
				this.board[y][x] = 9;
				steps--;
			}
		}
		return {board:this.board,maxDigit:maxDigit};
	};

	Board.prototype.checkCell = function (x, y, user) {
		if (!this.checked[x + '_' + y]) {
			var val = this.board[y][x] < 9 ? this.board[y][x] : -8;
			var re = {
				id: this.tabId,
				user: user,
				coords: [x, y],
				value: val,
				points: val,
				cells: {}
			};
			re.cells[this.tabId + '_' + x + '_' + y] = val;
			if (val >= 0) {
				this.empty--;
				this.checked[x + '_' + y] = 1;
				if (val == 0)
					this.addNeighbors(re, x, y);
			}
			re.flag = 'Cells'
			if (val == -8)
				re.flag = 'Bomb'
			if (this.empty == 0)
				re.flag = 'Complete'
			return re;
		}
	};

	Board.prototype.addNeighbors = function (re, x, y) {
		for (var ni = -1; ni < 2; ni++)
			for (var nj = -1; nj < 2; nj++) {
				var xCur = x + nj;
				var yCur = y + ni;
				if (xCur > 0 && xCur < this.sizeX + 1 && yCur > 0 && yCur < this.sizeY + 1) {
					if (this.checked[xCur + '_' + yCur]) continue
					else {
						this.checked[xCur + '_' + yCur] = 1;
						this.empty--;
						re.points += this.board[yCur][xCur];
						re.cells[this.tabId + '_' + xCur + '_' + yCur] = this.board[yCur][xCur];
						if (this.board[yCur][xCur] == 0)
							this.addNeighbors(re, xCur, yCur);
					}
				}
			}
	};

	function Game(pars) {
		if (pars) {
			this.profiles = {};
			for (var u in pars.profiles)
				this.profiles[u] = pars.profiles[u];
			this.multiThread = pars.multiThread;
			this.id = pars.id;
			this.mode = pars.mode;
			this.bSize = pars.board.bSize;
			this.name = pars.name;
			this.players = pars.users;
			this.minPlayers = pars.minPlayers;
			this.spectators = {};
			this.partyLeader = pars.leader;
			this.playersInGame = pars.curPlayers;
			this.penalty = {};
			this.resetScore();
			this.board = new Board(pars.name, pars.board);
		}
	}

	Game.prototype.dispatchEvent = function (e) {
		if (e.command == 'hitMob' && this.players[e.user])
			this.hitMob(e);
		if (e.command == 'checkCell' && this.players[e.user])
			this.checkCell(e);
		if (e.command == 'startBoard')
			this.startBoard();
		if (e.command == 'initGUI')
			this.initGUI(e.user);
		if (e.command == 'addSpectator')
			this.addSpec(e.user);
		if (e.command == 'quitGame')
			this.quitGame(e.user);
	};

	Game.prototype.addSpec = function (user) {
		this.spectators[user] = 1;
		this.emitEvent('party', this.id, 'system', 'Message',
			user + ' joined ' + this.name + ' as a spectator');
		this.initGUI(user);
		console.log(user + ' joined ' + this.name + ' as a spectator');
	};

	Game.prototype.initGUI = function (user) {
		this.emitEvent('client', user, 'game', 'StartGame', {
			boardId: this.name,
			r: this.board.sizeY,
			c: this.board.sizeX
		});
		this.emitEvent('client', user, 'game', 'OpenLog', this.log);
	};

	Game.prototype.startBoard = function () {
		this.pause = 0;
		this.logStart = 0;
		this.log = {};
		this.emitEvent('party', this.id, 'game', 'StartGame', {
			boardId: this.name,
			r: this.board.sizeY,
			c: this.board.sizeX
		});
		if (this.onStartBoard)
			this.onStartBoard();
	};

	Game.prototype.resetBoard = function (e) {
		this.pause = 1;
		if (this.onResetBoard)
			this.onResetBoard(e);
		if (!e.noRestart) {
			var self = this;
			setTimeout(function () {
				self.startBoard.call(self)
			}, 1000);
		}
	};

	Game.prototype.getGenericStat = function () {
		return {
			mode: this.mode,
			name: this.name,
			partyId: this.id,
			bSize: this.bSize,
			partyLeader: this.partyLeader,
			users: this.players,
			start: this.logStart,
			time: this.now / 1000,
			log: this.log,
			mines: this.board.mines
		};
	};

	Game.prototype.checkCell = function (e) {
		var x = parseInt(e.pars[0]) || 0;
		var y = parseInt(e.pars[1]) || 0;

		if (!(x < 1 || x > this.board.sizeX) && !(y < 1 || y > this.board.sizeY)) {
			if (this.logStart == 0)
				this.board.init(x, y, 2);
			if (!this.pause && !this.penalty[e.user])
				var re = this.board.checkCell(x, y, e.user);
		}
		if (re) {
			this.logEvent(re);
			this['on' + re.flag].call(this, re);
		}
	};

	Game.prototype.resetScore = function () {
		this.score = {};
		for (var p in this.players)
			this.score[p] = 0;
	};

	Game.prototype.addPoints = function (re) {
		this.score[re.user] += re.points,
			this.log[this.now].points = re.points;
	};

	Game.prototype.openCells = function (cells) {
		this.emitEvent('party', this.id, 'game', 'CellValues', cells);
	};

	Game.prototype.setUserPenalty = function (user, time) {
		this.penalty[user] = 1;
		var self = this;
		setTimeout(function () {
			self.penalty[user] = 0;
		}, time);
	};

	Game.prototype.logEvent = function (re) {
		var now = Date.now();
		if (this.logStart == 0) {
			this.logStart = now;
			this.now = 0;
		}
		this.now = now - this.logStart;
		this.log[this.now] = {
			user: re.user,
			cellCoord: re.coords,
			cellsOpened: re.cells,
			val: re.value
		};
	};

	Game.prototype.quitGame = function (user) {
		if (this.spectators[user]) {
			delete this.spectators[user];
			this.emitEvent('server', null, null, 'userExitGame', {
				partyId: this.id,
				name: this.name,
				user: user
			});
		} else {
			this.playersInGame--;
			if (this.playersInGame < this.minPlayers) {
				this.emitEvent('server', null, null, 'gameExit', {
					partyId: this.id,
					name: this.name,
					spectators: this.spectators,
					users: this.players
				});
				if (this.multiThread)
					process.exit(0);
			} else {
				delete this.players[user];
				for (var i in this.players) {
					this.partyLeader = i
					break;
				}
				this.emitEvent('server', null, null, 'userExitGame', {
					partyId: this.id,
					name: this.name,
					user: user
				});
			}
		}
	};

	Game.prototype.endGame = function () {
		for (var i in this.players)
			this.emitEvent('client', i, 'game', 'EndGame');
		this.emitEvent('server', null, null, 'childExit', {
			partyId: this.id,
			name: this.name,
			spectators: this.spectators,
			users: this.players
		});
		if (this.multiThread)
			process.exit(0);
	};

	function LocalGame(pars) {
		Game.call(this, pars);
		this.bestTime = this.profiles[this.partyLeader][this.bSize];
		this.gamesPlayed = 0;
		this.won = 0;
		this.lost = 0;
		this.winStreak = 0;
		this.loseStreak = 0;
	};

	LocalGame.prototype = new Game;

	LocalGame.prototype.onStartBoard = function () {
		this.resetScore();
		this.livesLost=0;
		this.lostCoords={};
		this.digitPocket={};
		this.bossLevel=1;
	};
	
	LocalGame.prototype.hitMob = function (re) {
		if (!this.inBattle) return;
		this.bossLevel--;
		this.livesLost++;
		var hitResult={bossLevel:this.bossLevel,livesLost:this.livesLost};
		if (this.bossLevel==0) {
			this.inBattle=false;
			re.win=1;
			this.resetBoard(re);
		} else if (this.livesLost==8){
			this.inBattle=false;
			this.resetBoard(re);
		} else {
			this.emitEvent('party', this.id, 'game', 'ResultHitMob', hitResult);
		}
	};

	LocalGame.prototype.onResetBoard = function (e) {
		var re = {};
		re.result = e.win ? 'win' : 'fail';
		if (e.win) re.digitPocket=this.digitPocket;
		else if (e.lostBeforeBossBattle){
			var stat=this.getGenericStat();
			re.time=stat.time;
		}
		this.emitEvent('party', this.id, 'game', 'ShowResultLocal', re);
	};

	LocalGame.prototype.onCells = function (re) {
		var i,n;
		for (i in re.cells) {
			n=re.cells[i];
			if(n>0) {
				if (!this.digitPocket[n]) this.digitPocket[n]=0;
				this.digitPocket[n]++;
				if (n>this.bossLevel) this.bossLevel=n;
			}
		}
		this.openCells(re.cells);
	};

	LocalGame.prototype.onBomb = function (re) {
		var coord=re.coords[0]+"_"+re.coords[1];
		if (!this.lostCoords[coord]){
			this.lostCoords[coord]=0;
			this.livesLost++;
		}
		if (this.livesLost==8){
			this.openCells(this.board.mines);
			re.lostBeforeBossBattle=true;
			this.resetBoard(re);
		} else {
			this.lostCoords[coord]++;
			this.openCells(re.cells);
		}
	};

	LocalGame.prototype.onComplete = function (re) {
		this.openCells(re.cells);
		this.openCells(this.board.mines);
		var stat=this.getGenericStat();
		var battle={bossLevel:this.bossLevel,livesLost:this.livesLost,time:stat.time};
		if (!this.inBattle) {
			this.inBattle=true;
			var self = this;
			setTimeout(function () {
				self.emitEvent.call(self,'party', this.id, 'game', 'StartBattleLocal', battle);
			}, 1000);
		}
	};
	
	LocalGame.Board=Board;

	return LocalGame;

});