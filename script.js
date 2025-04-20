let isDirected = true;
let isAuto = false;
let nodes = [];
let edges = [];
let nodeIdCounter = 1;
let selectedEdgeNodes = [];
let currentStep = 0;
let historyStack = [];
let redoStack = [];
let stepInterval = null;
let steps = [];

// Code highlighting configuration
let codeHighlightMap = {
  'init': [1, 2, 3, 4],
  'source': [5],
  'outer': [7, 8],
  'inner': [9],
  'condition': [10],
  'update': [11],
  'check': [13, 14, 15, 16, 17],
  'result': [19]
};

const svg = document.getElementById('graph-svg');

document.getElementById('graphTypeToggle').addEventListener('change', (e) => {
  isDirected = e.target.checked;
  document.getElementById('graphTypeLabel').textContent = isDirected ? "Directed" : "Undirected";
  redraw();
});

document.getElementById('simulationModeToggle').addEventListener('change', (e) => {
  isAuto = e.target.checked;
  document.getElementById('simulationModeLabel').textContent = isAuto ? "Auto" : "Manual";
});

svg.addEventListener('click', (e) => {
  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  saveState();
  addNode(x, y);
});

function addNode(x, y) {
  nodes.push({ id: nodeIdCounter++, x, y });
  redraw();
}

function saveState() {
  historyStack.push({
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    nodeIdCounter
  });
  redoStack = [];
}

function highlightCode(phase) {
  // Reset all highlights
  document.querySelectorAll('.code-line').forEach(line => {
    line.classList.remove('highlighted-code');
  });
  
  // Apply highlight to the relevant lines
  if (codeHighlightMap[phase]) {
    codeHighlightMap[phase].forEach(lineNumber => {
      const line = document.getElementById(`line-${lineNumber}`);
      if (line) line.classList.add('highlighted-code');
    });
  }
}

function redraw(highlightedNodes = [], highlightedEdges = []) {
  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 -5 10 10" refX="30" refY="0"
        markerWidth="10" markerHeight="10" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="#fff"/>
      </marker>
      <marker id="highlighted-arrow" viewBox="0 -5 10 10" refX="30" refY="0"
        markerWidth="12" markerHeight="12" orient="auto">
        <path d="M0,-5L10,0L0,5" fill="yellow"/>
      </marker>
    </defs>`;

  edges.forEach(edge => {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    if (!from || !to) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);

    if (highlightedEdges.some(e => e.from === edge.from && e.to === edge.to)) {
      line.setAttribute("stroke", "yellow");
      line.setAttribute("stroke-width", "4");
      if (isDirected) line.setAttribute("marker-end", "url(#highlighted-arrow)");
    } else {
      line.setAttribute("stroke", "#888");
      line.setAttribute("stroke-width", "2");
      if (isDirected) line.setAttribute("marker-end", "url(#arrow)");
    }

    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", (from.x + to.x) / 2);
    text.setAttribute("y", (from.y + to.y) / 2 - 10);
    text.textContent = edge.weight;
    text.setAttribute("fill", "#fff");
    svg.appendChild(text);
  });

  nodes.forEach(node => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 20);

    if (highlightedNodes.includes(node.id)) {
      circle.setAttribute("fill", "yellow");
      circle.setAttribute("stroke", "orange");
      circle.setAttribute("stroke-width", "3");
    } else {
      circle.setAttribute("fill", "#00bcd4");
      circle.setAttribute("stroke", "none");
    }

    circle.addEventListener("click", (e) => {
      e.stopPropagation();
      handleNodeClick(node);
    });
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "black");
    text.textContent = node.id;
    svg.appendChild(text);
  });
}

function handleNodeClick(node) {
  selectedEdgeNodes.push(node);
  if (selectedEdgeNodes.length === 2) {
    const weight = prompt(`Enter weight from ${selectedEdgeNodes[0].id} → ${selectedEdgeNodes[1].id}`);
    if (weight !== null) {
      saveState();
      edges.push({
        from: selectedEdgeNodes[0].id,
        to: selectedEdgeNodes[1].id,
        weight: parseInt(weight)
      });
      if (!isDirected) {
        edges.push({
          from: selectedEdgeNodes[1].id,
          to: selectedEdgeNodes[0].id,
          weight: parseInt(weight)
        });
      }
      selectedEdgeNodes = [];
      redraw();
    } else {
      selectedEdgeNodes = [];
    }
  }
}

function startSimulation() {
  if (stepInterval) clearInterval(stepInterval);
  if (nodes.length === 0) return;

  // Highlight initialization code
  highlightCode('init');
  
  const distances = {};
  steps = [];
  nodes.forEach(n => distances[n.id] = Infinity);
  distances[nodes[0].id] = 0;
  
  // After initialization, highlight the source node setting
  setTimeout(() => highlightCode('source'), 1000);
  
  // Track edges that are being checked in each step
  let edgesBeingChecked = [];
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const stepChanges = {};
    
    // For each iteration, create step entries for edges being checked
    edges.forEach(edge => {
      const { from, to, weight } = edge;
      
      // Create a step for checking this edge
      steps.push({
        distances: JSON.parse(JSON.stringify(distances)),
        highlights: [to],
        edgeHighlights: [edge],
        phase: 'condition',
        iteration: i + 1,
        edgeChecking: true,
        message: `Checking edge ${from} → ${to} (weight: ${weight})`
      });
      
      // If the edge causes a relaxation, add a step for updating
      if (distances[from] !== Infinity && distances[from] + weight < (distances[to] || Infinity)) {
        distances[to] = distances[from] + weight;
        stepChanges[to] = true;
        
        steps.push({
          distances: JSON.parse(JSON.stringify(distances)),
          highlights: [to],
          edgeHighlights: [edge],
          phase: 'update',
          iteration: i + 1,
          edgeUpdating: true,
          message: `Updating distance to node ${to}: ${distances[to]}`
        });
      }
    });
    
    // Add a step for completing this iteration
    steps.push({
      distances: JSON.parse(JSON.stringify(distances)),
      highlights: Object.keys(stepChanges).map(Number),
      phase: i === 0 ? 'outer' : 'inner',
      iteration: i + 1,
      message: `Completed iteration ${i + 1}`
    });
  }

  // Add a step for checking negative cycles
  steps.push({
    distances: JSON.parse(JSON.stringify(distances)),
    highlights: [],
    phase: 'check',
    message: 'Checking for negative weight cycles'
  });
  
  // Add a final step to show the completion
  steps.push({
    distances: JSON.parse(JSON.stringify(distances)),
    highlights: [],
    phase: 'result',
    message: 'Algorithm completed'
  });

  currentStep = 0;
  if (isAuto) {
    stepInterval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(stepInterval);
        return;
      }
      applyStep(steps[currentStep++]);
    }, 1000);
  } else {
    applyStep(steps[currentStep]);
  }
}

function applyStep(step) {
  updateDistanceTable(step.distances);
  
  // Draw graph with highlighted nodes
  redraw(step.highlights, step.edgeHighlights || []);
  
  // Highlight code based on the phase
  highlightCode(step.phase);
  
  // Update status text
  let statusText = step.message || '';
  if (step.iteration) {
    document.getElementById('iteration-counter').textContent = 
      `${statusText} - Iteration ${step.iteration} of ${nodes.length - 1}`;
  } else {
    document.getElementById('iteration-counter').textContent = statusText;
  }
}

function nextStep() {
  if (currentStep < steps.length) {
    applyStep(steps[currentStep++]);
  }
}

function updateDistanceTable(distances) {
  const table = document.getElementById('distance-table');
  table.innerHTML = '';
  Object.entries(distances).forEach(([node, dist]) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${node}</td><td>${dist === Infinity ? '∞' : dist}</td>`;
    table.appendChild(row);
  });
}

function reset() {
  nodes = [];
  edges = [];
  nodeIdCounter = 1;
  selectedEdgeNodes = [];
  currentStep = 0;
  steps = [];
  if (stepInterval) clearInterval(stepInterval);
  document.getElementById('distance-table').innerHTML = '';
  document.getElementById('iteration-counter').textContent = 'Not started';
  // Reset code highlights
  document.querySelectorAll('.code-line').forEach(line => {
    line.classList.remove('highlighted-code');
  });
  redraw();
}

function undo() {
  if (historyStack.length > 0) {
    redoStack.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      nodeIdCounter
    });
    const prev = historyStack.pop();
    nodes = prev.nodes;
    edges = prev.edges;
    nodeIdCounter = prev.nodeIdCounter;
    redraw();
  }
}

function redo() {
  if (redoStack.length > 0) {
    saveState();
    const next = redoStack.pop();
    nodes = next.nodes;
    edges = next.edges;
    nodeIdCounter = next.nodeIdCounter;
    redraw();
  }
}