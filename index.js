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
  let initialPegs;    // initial state: bitmask of pegs

  // Variable state.
  let pegs;             // current state: bitmask of pegs
  let selectedPeg = -1; // index of peg selected to be moved

  const undoStack = [];
  const redoStack = [];

  const solvable = {};  // memoizes results of solve()

  // Returns the next state after moving peg `i` in direction `dir`, or 0 if
  // the move is not valid.
  function getNext(mask, i, dir) {
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

  function solve(pegs) {
    let result = solvable[pegs];
    if (result != undefined) return result;
    result = false;
  loop:
    for (let i = 0; (1 << i) <= pegs; ++i) {
      if ((pegs & (1 << i)) !== 0) {
        for (let d = 0; d < 8; ++d) {
          let nextPegs = getNext(pegs, i, d);
          if (nextPegs !== 0 && solve(nextPegs)) {
            result = true;
            break loop;
          }
        }
      }
    }
    solvable[pegs] = result;
    return result;
  }

  function undo() {
    if (undoStack.length > 0) {
      redoStack.push(pegs);
      pegs = undoStack.pop();
      selectedPeg = -1;
      updateState();
    }
  }

  function redo() {
    if (redoStack.length > 0) {
      undoStack.push(pegs);
      pegs = redoStack.pop();
      selectedPeg = -1;
      updateState();
    }
  }

  function resetPegs() {
    pegs = initialPegs;
    selectedPeg = -1;
    undoStack.length = 0;
    redoStack.length = 0;
    updateState();
  }

  function updatePegs(newPegs) {
    undoStack.push(pegs);
    redoStack.length = 0;
    pegs = newPegs;
    selectedPeg = -1;
    updateState();
  }

  function updateState() {
    for (let i = 0; i < cells.length; ++i) {
      let cell = cells[i];
      if ((pegs & (1 << i)) !== 0) {
        cell.classList.remove('hole');
        cell.classList.add('peg');
        if (selectedPeg === i) {
          cell.classList.add('selected');
        } else {
          cell.classList.remove('selected');
        }
      } else {
        cell.classList.remove('peg');
        cell.classList.add('hole');
        let k;
        if (selectedPeg >= 0 && (k = middle[selectedPeg][i]) != null &&
            (pegs & (1 << k)) !== 0) {
          cell.classList.add('target');
        } else {
          cell.classList.remove('target');
        }
      }
    }
    updateHints();
    resetButton.disabled = pegs === initialPegs;
    undoButton.disabled = undoStack.length == 0;
    redoButton.disabled = redoStack.length == 0;
  }

  function updateHints() {
    const hints = {};
    if (showSolutionCheckbox.checked) {
      if (selectedPeg >= 0) {
        let i = selectedPeg;
        for (let d = 0; d < 8; ++d) {
          let k = adj[i][d];
          if (k >= 0 && (pegs & (1 << k)) !== 0) {
            let j = adj[k][d];
            if (j >= 0 && (pegs & (1 << j)) == 0) {
              if (solve(pegs - (1 << i) + (1 << j) - (1 << k))) {
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
              let next = getNext(pegs, i, d);
              if (next != null && solve(next)) {
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

  function onCellClicked(i) {
    const peg = (pegs & (1 << i)) !== 0;
    if (pegs === initialPegs) {
      // Remove initial peg.
      if (peg) updatePegs(pegs - (1 << i));
    } else if (peg) {
      // Select a starting peg (or unselect current one).
      selectedPeg = selectedPeg !== i ? i : -1;
      updateState();
    } else if (selectedPeg >= 0) {
      // Jump selected peg to the destination (if possible).
      let k = middle[selectedPeg][i];
      if (k != null && (pegs & (1 << k)) !== 0) {
        updatePegs(pegs - (1 << selectedPeg) + (1 << i) - (1 << k));
      }
    }
  }

  // Create cell elements. (Each cell is a hole or a peg.)
  for (let row = 0; row < H; ++row) {
    idx[row] = [];
    for (let col = 0; col < W; ++col) {
      const ch = template[row][col];
      const i = cells.length;
      if (ch == ',') {
        const goalElem = document.createElement('div');
        goalElem.classList.add('goal');
        goalElem.style.gridRow = row + 1;
        goalElem.style.gridColumn = col + 1;
        gridElem.append(goalElem);
        solvable[1 << i] = true;
      }
      if (ch == '.' || ch == ',') {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        cellElem.style.gridRow = row + 1;
        cellElem.style.gridColumn = col + 1;
        //cellElem.textContent = row + ',' + col;
        cellElem.onclick = () => onCellClicked(i);
        gridElem.append(cellElem);
        idx[row][col] = i;
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
    if (solve(i)) ++ones; else ++zeros;
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
