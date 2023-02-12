// ==UserScript==
// @name         SudokuPad Bet Tree
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Add a bet tree control to SudokuPad
// @author       Chameleon
// @updateURL    https://github.com/yusitnikov/sudokupad-bet-tree/raw/main/sudokupad-bet-tree.user.js
// @match        https://crackingthecryptic.com/*
// @match        https://*.crackingthecryptic.com/*
// @match        https://sudokupad.app/*
// @match        https://*.sudokupad.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=app.crackingthecryptic.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

window.addEventListener('DOMContentLoaded', () => {
	const treeMarker = 't';

	const renderTree = (renderer, scaleCoeff, offsetX, offsetY) => {
		const scale = (x) => x * scaleCoeff;
		const translateX = (x) => offsetX + scale(x);
		const translateY = (y) => offsetY + scale(y);
		const renderPath = (g, fill, points, opacity = 1) => g.appendChild(renderer.renderPart({
			type: 'path',
			attr: {
				fill,
				d: points
					.flatMap((args, commandIndex) => {
						const type = typeof args[0] === "string" ? args.shift() : (commandIndex ? 'L' : 'M');

						return [
							type,
							...args.map((value, index) => index % 2 ? translateY(value) : translateX(value)),
						];
					})
					.join(' ') + ' Z',
				opacity,
			}
		}))
		const g = renderer.renderPart({target: 'cell-pen', type: 'g'});
		g.appendChild(renderer.renderPart({
			type: 'rect',
			attr: {
				fill: '#c80',
				x: translateX(-0.25),
				y: translateY(0.5),
				width: scale(0.5),
				height: scale(0.5),
			}
		}));
		renderPath(g, '#0c0', [
			[0, -1],
			[1, 0],
			[0.5, 0],
			[1, 0.5],
			[-1, 0.5],
			[-0.5, 0],
			[-1, 0],
		]);

		return g;
	};

	const treeIcon = renderTree(
		{
			renderPart({type, attr = {}}) {
				const el = document.createElement(type);
				for (const [key, value] of Object.entries(attr)) {
					el.setAttribute(key, value);
				}
				return el;
			}
		},
		6,
		12,
		12
	);

	const ToolBetTree = {
		button: {
			name: 'bettree',
			title: 'Bet Tree',
			content: `<div class="icon">
				<svg title="Bet Tree" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
					<path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
					${treeIcon.innerHTML}
				</svg>
			</div>Bet Tree`,
		},
		tool: {
			name: 'bettree',
			isTool: true,
			actionLong: 'bettree',
			actionShort: 'bt',
			cellHasTree: function(cell) {
				return cell.pen.find(p => p[0] === treeMarker) !== undefined;
			},
			getCellHighlightsElement() {
				return Framework.app.svgRenderer.getElem().querySelector('#cell-highlights');
			},
			handleToolEnter: function() {
				this.getCellHighlightsElement().setAttribute('opacity', 0);
			},
			handleToolExit: function() {
				this.getCellHighlightsElement().removeAttribute('opacity');
			},
			handleInputdown: function() {
				const {app} = Framework;
				const {x, y} = app.inputPos;
				const {r, c} = app.xyToRC(x, y);
				const cell = app.grid.getCell(r, c);
				const hasTree = this.cellHasTree(cell);
				const treeCells = hasTree ? [] : app.grid.cells.flat().filter(cell => this.cellHasTree(cell));

				app.act({type: 'groupstart'});
				app.act({type: 'deselect'});
				app.act({type: 'select', arg: [cell, ...treeCells]});
				app.act({type: 'pen', arg: treeMarker});
				app.act({type: 'deselect'});
				app.act({type: 'groupend'});
			}
		}
	};

	let initialized = false;
	function init() {
		if (initialized) {
			return;
		}
		initialized = true;

		const coreRenderPen = Framework.app.svgRenderer.renderPen;
		Framework.app.svgRenderer.renderPen = function(opts = {}) {
			const {row, col, className, value} = opts;

			if (value !== treeMarker) {
				return coreRenderPen.call(this, opts);
			}

			return renderTree(
				this,
				0.3 * SvgRenderer.CellSize,
				(col + 0.5) * SvgRenderer.CellSize,
				(row + 0.5) * SvgRenderer.CellSize
			);
		};

		const style = document.createElement('style');
		style.innerText = '.controls-main.tool-bettree .controls-input { opacity: 0; pointer-events: none; }';
		document.head.appendChild(style);

		setTimeout(() => addTool(ToolBetTree), 10);
	}

	if (typeof Framework !== "undefined") {
		if (Framework.app) {
			init();
		} else {
			const coreStart = window.start;
			window.start = () => {
				coreStart();
				init();
			}
		}
	}
});
