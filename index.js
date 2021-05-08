'use strict';

function initialize() {
  const gridElem = document.getElementById('grid');
  const resetButton = document.getElementById('resetButton');
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  const showSolutionCheckbox = document.getElementById('showSolutionCheckbox');

  const template = [
      "     . ",
      "    ...",
      "...... ",
      "....,  ",
      "...... ",
      "    ...",
      "     . "];
  const H = template.length;
  const W = template[0].length;

  const idx = [];     // idx[r][c] == field index or -1 if invalid
  const cells = [];   // cells[i] == div element of field `i`
  const adj = [];     // adj[i][d] == index of field adjacent to `i` in direction `d`, or -1 if none
  const middle = [];  // middle[i][j] == k, if k lies directly between `i` and `j`, or undefined if there is no such `k`
  let goalIndex = -1; // index of goal field

  let initialPegs;        // initial state: bitmask of pegs
  let pegs;               // current state: bitmask of pegs
  let draggedIndex = -1;  // index of peg currently being dragged

  const undoStack = [];
  const redoStack = [];

  const memo = {};

  function Next(mask, i, dir) {
    if (i >= 0 && (mask & (1 << i)) !== 0) {
      let k = adj[i][dir];
      if (k >= 0 && (mask & (1 << k)) !== 0) {
        let j = adj[k][dir];
        if (j >= 0 && (mask & (1 << j)) == 0) {
          return mask - (1 << i) + (1 << j) - (1 << k);
        }
      }
    }
    return 0;
  }

  function Solve(pegs) {
    let result = memo[pegs];
    if (result != undefined) return result;
    result = false;
  loop:
    for (let i = 0; (1 << i) <= pegs; ++i) {
      if ((pegs & (1 << i)) !== 0) {
        for (let d = 0; d < 8; ++d) {
          let nextPegs = Next(pegs, i, d);
          if (nextPegs !== 0 && Solve(nextPegs)) {
            result = true;
            break loop;
          }
        }
      }
    }
    memo[pegs] = result;
    return result;
  }

  function undo() {
    if (undoStack.length > 0) {
      redoStack.push(pegs);
      pegs = undoStack.pop();
      updateState();
    }
  }

  function redo() {
    if (redoStack.length > 0) {
      undoStack.push(pegs);
      pegs = redoStack.pop();
      updateState();
    }
  }

  function resetPegs() {
    pegs = initialPegs;
    undoStack.length = 0;
    redoStack.length = 0;
    updateState();
  }

  function updatePegs(newPegs) {
    undoStack.push(pegs);
    redoStack.length = 0;
    pegs = newPegs;
    updateState();
  }

  function removePeg(i) {
    if (pegs !== initialPegs || (pegs & (1 << i)) === 0) return;
    updatePegs(pegs - (1 << i));
  }

  function movePeg(i, j) {
    if ((pegs & (1 << i)) === 0) return;
    if ((pegs & (1 << j)) !== 0) return;
    let k = middle[i][j];
    if (k == null) return;
    if ((pegs & (1 << k)) === 0) return;
    updatePegs(pegs - (1 << i) + (1 << j) - (1 << k));
  }

  function updateState() {
    const pegMimeType = 'application/x-peg';
    const firstMove = pegs === initialPegs;
    for (let i = 0; i < cells.length; ++i) {
      let cell = cells[i];
      let peg = (pegs & (1 << i)) !== 0;
      if (peg) {
        cell.classList.remove('hole');
        cell.classList.add('peg');
      } else {
        cell.classList.remove('peg');
        cell.classList.add('hole');
      }
      if (peg && firstMove) {
        cell.onclick = () => removePeg(i);
      } else {
        cell.onclick = undefined;
      }
      if (peg && !firstMove) {
        cell.draggable = true;
        cell.ondragstart = (ev) => {
          ev.dataTransfer.setData(pegMimeType, String(i));
          cell.classList.add('dragged');
          draggedIndex = i;
          updateHints();
        };
        cell.ondragend = (ev) => {
          cell.classList.remove('dragged');
          if (draggedIndex === i) draggedIndex = -1;
          updateHints();
        }
        cell.ondragover = undefined;
        cell.ondragleave = undefined;
        cell.ondrop = undefined;
      } else {
        cell.draggable = false;
        cell.ondragstart = undefined;
        cell.ondragover = (ev) => {
          // Note: can't check if this is *valid* drop target because we don't
          // have access to event data until item is dropped.
          cell.classList.add('droppable');
          ev.preventDefault();  // necessary to accept drop
        };
        cell.ondragleave = (ev) => {
          cell.classList.remove('droppable');
        };
        cell.ondrop = (ev) => {
          cell.classList.remove('droppable');
          let j = Number(ev.dataTransfer.getData(pegMimeType));
          if (middle[i][j] != null) {
            ev.preventDefault();
            movePeg(j, i);
          }
        }
      }
    }
    updateHints();
    resetButton.disabled = firstMove;
    undoButton.disabled = undoStack.length == 0;
    redoButton.disabled = redoStack.length == 0;
  }

  function updateHints() {
    const hints = {};
    if (showSolutionCheckbox.checked) {
      if (draggedIndex >= 0) {
        let i = draggedIndex;
        for (let d = 0; d < 8; ++d) {
          let k = adj[i][d];
          if (k >= 0 && (pegs & (1 << k)) !== 0) {
            let j = adj[k][d];
            if (j >= 0 && (pegs & (1 << j)) == 0) {
              if (Solve(pegs - (1 << i) + (1 << j) - (1 << k))) {
                hints[j] = true;
              }
            }
          }
        }
      } else {
      loop:
        for (let i = 0; i < cells.length; ++i) {
          if ((pegs & (1 << i)) !== 0) {
            for (let d = 0; d < 8; ++d) {
              let next = Next(pegs, i, d);
              if (next != null && Solve(next)) {
                hints[i] = true;
                break;
              }
            }
          }
        }
      }
    }
    for (let i = 0; i < cells.length; ++i) {
      let cell = cells[i];
      if (hints[i]) {
        cell.classList.add('hint');
      } else {
        cell.classList.remove('hint');
      }
    }
  }

  // Create cell elements. (Each cell is a hole or a peg.)
  for (let row = 0; row < H; ++row) {
    idx[row] = [];
    for (let col = 0; col < W; ++col) {
      let ch = template[row][col];
      if (ch == ',') {
        const goalElem = document.createElement('div');
        goalElem.classList.add('goal');
        goalElem.style.gridRow = row + 1;
        goalElem.style.gridColumn = col + 1;
        gridElem.append(goalElem);
        memo[1 << cells.length] = true;
      }
      if (ch == '.' || ch == ',') {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        cellElem.style.gridRow = row + 1;
        cellElem.style.gridColumn = col + 1;
        //cellElem.textContent = row + ',' + col;
        gridElem.append(cellElem);
        idx[row][col] = cells.length;
        cells.push(cellElem);
      } else {
        idx[row][col] = -1;
      }
    }
  }
  // Calculate adjacency. (Direction indices are paired so that opposite
  // directions come in pairs. e.g. 0/1 is up/down, 2/3 is right/left, etc.
  // This property is currently not used for anything.)
  for (let r = 0; r < H; ++r) {
    for (let c = 0; c < W; ++c) {
      let i = idx[r][c];
      if (i >= 0) {
        let a = [-1, -1, -1, -1, -1, -1, -1, -1];
        if (r > 0     && idx[r - 1][c] >= 0) a[0] = idx[r - 1][c];
        if (r + 1 < H && idx[r + 1][c] >= 0) a[1] = idx[r + 1][c];
        if (c > 0     && idx[r][c - 1] >= 0) a[2] = idx[r][c - 1];
        if (c + 1 < W && idx[r][c + 1] >= 0) a[3] = idx[r][c + 1];
        if (r > 0     && c > 0     && idx[r - 1][c - 1] >= 0) a[4] = idx[r - 1][c - 1];
        if (r + 1 < H && c + 1 < W && idx[r + 1][c + 1] >= 0) a[5] = idx[r + 1][c + 1];
        if (r > 0     && c + 1 < W && idx[r - 1][c + 1] >= 0) a[6] = idx[r - 1][c + 1];
        if (r + 1 < H && c > 0     && idx[r + 1][c - 1] >= 0) a[7] = idx[r + 1][c - 1];
        adj[i] = a;
      }
    }
  }
  // Calculate middle fields.
  for (let i = 0; i < cells.length; ++i) {
    middle[i] = {};
    for (let d = 0; d < 8; ++d) {
      let k = adj[i][d];
      if (k >= 0) {
        let j = adj[k][d];
        if (j >= 0) middle[i][j] = k;
      }
    }
  }

  /*
  // Benchmark: calculate all solutions.
  let startTime = new Date().getTime();
  let zeros = 0, ones = 0;
  for (let i = 1, n = (1 << cells.length); i < n; ++i) {
    if (Solve(i)) ++ones; else ++zeros;
  }
  console.log(zeros, ones, (new Date().getTime() - startTime)/1000);
  // prints: 14050415 19504016 (~30 seconds)
  */

  resetButton.onclick = function() {
    if (confirm('Are you sure you want to reset the board?')) {
      resetPegs();
    }
  };
  undoButton.onclick = undo;
  redoButton.onclick = redo;
  showSolutionCheckbox.onchange = updateHints;

  initialPegs = (1 << cells.length) - 1;
  resetPegs();
}
