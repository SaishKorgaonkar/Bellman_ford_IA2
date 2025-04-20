// Global variables
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
let isRunning = false;

// Code highlighting mapping
const codeHighlightMap = {
  'init': [1, 2, 3, 4],
  'source': [5],
  'outer': [7, 8],
  'inner': [9],
  'condition': [10],
  'update': [11],
  'check': [13, 14, 15, 16, 17],
  'result': [19]
};

// Get DOM elements
const svg = document.getElementById('graph-svg');
const graphTypeToggle = document.getElementById('graphTypeToggle');
const simulationModeToggle = document.getElementById('simulationModeToggle');
const graphTypeLabel = document.getElementById('graphTypeLabel');
const simulationModeLabel = document.getElementById('simulationModeLabel');
const iterationCounter = document.getElementById('iteration-counter');
const distanceTable = document.getElementById('distance-table');

// Setup event listeners
graphTypeToggle.addEventListener('change', (e) => {
  isDirected = e.target.checked;
  graphTypeLabel.textContent = isDirected ? "Directed" : "Undirected";
  redraw();
});

simulationModeToggle.addEventListener('change', (e) => {
  isAuto = e.target.checked;
  simulationModeLabel.textContent = isAuto ? "Auto" : "Manual";
});

svg.addEventListener('click', (e) => {
  if (isRunning) return; // Prevent adding nodes during simulation
  
  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check if we clicked on empty space
  const clickedOnNode = nodes.some(node => {
    const dx = node.x - x;
    const dy = node.y - y;
    return Math.sqrt(dx * dx + dy * dy) < 20; // 20 is the node radius
  });
  
  if (!clickedOnNode) {
    saveState();
    addNode(x, y);
  }
});

// Button event listeners
document.getElementById('start-btn').addEventListener('click', startSimulation);
document.getElementById('next-btn').addEventListener('click', nextStep);
document.getElementById('reset-btn').addEventListener('click', reset);
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);

// Functions
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

function calculateEdgePosition(from, to) {
  // Calculate the distance between nodes
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate the position on the circle's edge
  const radius = 20; // Node radius
  const ratio = radius / dist;
  
  // Calculate the arrow adjustment
  const arrowAdjustment = isDirected ? radius : 0;
  
  return {
    fromX: from.x + dx * ratio,
    fromY: from.y + dy * ratio,
    toX: to.x - dx * ratio - (dx / dist) * arrowAdjustment,
    toY: to.y - dy * ratio - (dy / dist) * arrowAdjustment,
    midX: (from.x + to.x) / 2,
    midY: (from.y + to.y) / 2
  };
}

function redraw(highlightedNodes = [], highlightedEdges = []) {
  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#fff"/>
      </marker>
      <marker id="highlighted-arrow" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth="8" markerHeight="8" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="yellow"/>
      </marker>
    </defs>`;

  // Draw edges first so they appear behind nodes
  edges.forEach(edge => {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    if (!from || !to) return;

    const pos = calculateEdgePosition(from, to);
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", pos.fromX);
    line.setAttribute("y1", pos.fromY);
    line.setAttribute("x2", pos.toX);
    line.setAttribute("y2", pos.toY);

    const isHighlighted = highlightedEdges.some(e => e.from === edge.from && e.to === edge.to);
    
    if (isHighlighted) {
      line.setAttribute("stroke", "yellow");
      line.setAttribute("stroke-width", "4");
      if (isDirected) line.setAttribute("marker-end", "url(#highlighted-arrow)");
    } else {
      line.setAttribute("stroke", "#888");
      line.setAttribute("stroke-width", "2");
      if (isDirected) line.setAttribute("marker-end", "url(#arrow)");
    }

    svg.appendChild(line);

    // Add a background for the weight text for better readability
    const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    textBg.setAttribute("x", pos.midX - 15);
    textBg.setAttribute("y", pos.midY - 15);
    textBg.setAttribute("width", "30");
    textBg.setAttribute("height", "20");
    textBg.setAttribute("class", "edge-weight-bg");
    svg.appendChild(textBg);

    // Add the weight text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.midX);
    text.setAttribute("y", pos.midY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("class", "edge-weight");
    text.textContent = edge.weight;
    svg.appendChild(text);
  });

  // Draw nodes
  nodes.forEach(node => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 20);

    if (highlightedNodes.includes(node.id)) {
      circle.setAttribute("fill", "#ffeb3b"); // Brighter yellow for highlighted nodes
      circle.setAttribute("stroke", "#ff9800"); // Orange stroke
      circle.setAttribute("stroke-width", "3");
    } else if (selectedEdgeNodes.includes(node)) {
      circle.setAttribute("fill", "#4caf50"); // Green for selected nodes
      circle.setAttribute("stroke", "#2e7d32");
      circle.setAttribute("stroke-width", "2");
    } else {
      circle.setAttribute("fill", "#00bcd4"); // Default color
      circle.setAttribute("stroke", "#0097a7");
      circle.setAttribute("stroke-width", "2");
    }

    circle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!isRunning) {
        handleNodeClick(node);
      }
    });
    svg.appendChild(circle);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "black");
    text.setAttribute("font-weight", "bold");
    text.textContent = node.id;
    svg.appendChild(text);
  });
}

function handleNodeClick(node) {
  if (isRunning) return;
  
  // If this node is already selected, deselect it
  const existingIndex = selectedEdgeNodes.findIndex(n => n.id === node.id);
  if (existingIndex !== -1) {
    selectedEdgeNodes.splice(existingIndex, 1);
    redraw();
    return;
  }
  
  selectedEdgeNodes.push(node);
  
  if (selectedEdgeNodes.length === 2) {
    // Check if an edge already exists
    const existingEdge = edges.find(e => 
      e.from === selectedEdgeNodes[0].id && e.to === selectedEdgeNodes[1].id
    );
    
    if (existingEdge) {
      alert(`An edge from ${selectedEdgeNodes[0].id} to ${selectedEdgeNodes[1].id} already exists.`);
      selectedEdgeNodes = [];
      redraw();
      return;
    }
    
    const weightInput = prompt(`Enter weight from ${selectedEdgeNodes[0].id} → ${selectedEdgeNodes[1].id}`);
    
    // Validate the weight input
    if (weightInput === null) {
      selectedEdgeNodes = [];
      redraw();
      return;
    }
    
    const weight = parseInt(weightInput);
    if (isNaN(weight)) {
      alert("Please enter a valid number for weight.");
      selectedEdgeNodes = [];
      redraw();
      return;
    }
    
    saveState();
    
    // Add the edge
    edges.push({
      from: selectedEdgeNodes[0].id,
      to: selectedEdgeNodes[1].id,
      weight: weight
    });
    
    // For undirected graphs, add the reverse edge
    if (!isDirected) {
      edges.push({
        from: selectedEdgeNodes[1].id,
        to: selectedEdgeNodes[0].id,
        weight: weight
      });
    }
    
    selectedEdgeNodes = [];
    redraw();
  } else {
    // Only one node selected, highlight it
    redraw();
  }
}

function startSimulation() {
  if (nodes.length === 0) {
    alert("Please add at least one node to the graph.");
    return;
  }
  
  // Stop any existing simulation
  if (stepInterval) {
    clearInterval(stepInterval);
    stepInterval = null;
  }
  
  isRunning = true;
  steps = [];
  currentStep = 0;
  
  // Highlight initialization code
  highlightCode('init');
  
  const distances = {};
  nodes.forEach(n => distances[n.id] = Infinity);
  
  // Use the first node as the source
  const sourceNode = nodes[0].id;
  distances[sourceNode] = 0;
  
  // Add initialization step
  steps.push({
    distances: JSON.parse(JSON.stringify(distances)),
    highlights: [sourceNode],
    phase: 'init',
    message: 'Initializing distances: all nodes set to Infinity'
  });
  
  // Add source node setting step
  steps.push({
    distances: JSON.parse(JSON.stringify(distances)),
    highlights: [sourceNode],
    phase: 'source',
    message: `Setting source node ${sourceNode} distance to 0`
  });
  
  // Main relaxation loop
  for (let i = 0; i < nodes.length - 1; i++) {
    const iterationChanges = {};
    let relaxed = false;
    
    // Add step for the beginning of each iteration
    steps.push({
      distances: JSON.parse(JSON.stringify(distances)),
      highlights: [],
      phase: 'outer',
      iteration: i + 1,
      message: `Starting iteration ${i + 1} of ${nodes.length - 1}`
    });
    
    // Process each edge
    edges.forEach((edge) => {
      const { from, to, weight } = edge;
      
      // Add step for examining each edge
      steps.push({
        distances: JSON.parse(JSON.stringify(distances)),
        highlights: [from],
        highlightedEdges: [edge],
        phase: 'inner',
        iteration: i + 1,
        message: `Examining edge: ${from} → ${to} (weight: ${weight})`
      });
      
      // Check if we can relax this edge
      if (distances[from] !== Infinity && distances[from] + weight < distances[to]) {
        const oldDistance = distances[to];
        distances[to] = distances[from] + weight;
        relaxed = true;
        
        // Add step for updating distance
        steps.push({
          distances: JSON.parse(JSON.stringify(distances)),
          highlights: [to],
          highlightedEdges: [edge],
          phase: 'update',
          iteration: i + 1,
          message: `Updating distance to node ${to}: ${oldDistance === Infinity ? '∞' : oldDistance} → ${distances[to]}`
        });
      } else {
        // Add step for checking but not updating
        steps.push({
          distances: JSON.parse(JSON.stringify(distances)),
          highlights: [],
          highlightedEdges: [edge],
          phase: 'condition',
          iteration: i + 1,
          message: distances[from] === Infinity ? 
            `Node ${from} has distance ∞, skipping edge` : 
            `No update needed: ${distances[from]} + ${weight} >= ${distances[to] === Infinity ? '∞' : distances[to]}`
        });
      }
    });
    
    // If no relaxation in an iteration, we can break early
    if (!relaxed && i > 0) {
      steps.push({
        distances: JSON.parse(JSON.stringify(distances)),
        highlights: [],
        phase: 'outer',
        iteration: i + 1,
        message: `No updates in iteration ${i + 1}, algorithm could terminate early`
      });
    }
  }
  
  // Check for negative weight cycles
  let hasNegativeCycle = false;
  edges.forEach((edge) => {
    const { from, to, weight } = edge;
    
    steps.push({
      distances: JSON.parse(JSON.stringify(distances)),
      highlights: [],
      highlightedEdges: [edge],
      phase: 'check',
      message: `Checking for negative cycle: edge ${from} → ${to}`
    });
    
    if (distances[from] !== Infinity && distances[from] + weight < distances[to]) {
      hasNegativeCycle = true;
      steps.push({
        distances: JSON.parse(JSON.stringify(distances)),
        highlights: [from, to],
        highlightedEdges: [edge],
        phase: 'check',
        message: `Negative weight cycle detected! ${from} → ${to}`
      });
    }
  });
  
  // Final step
  steps.push({
    distances: JSON.parse(JSON.stringify(distances)),
    highlights: [],
    phase: 'result',
    message: hasNegativeCycle ? 
      'Algorithm found a negative weight cycle!' : 
      'Algorithm completed successfully'
  });
  
  // Apply the first step
  if (steps.length > 0) {
    applyStep(steps[currentStep]);
    
    // For auto mode, start the interval
    if (isAuto) {
      stepInterval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps.length) {
          clearInterval(stepInterval);
          stepInterval = null;
          return;
        }
        applyStep(steps[currentStep]);
      }, 1000);
    }
  }
}

function applyStep(step) {
  if (!step) return;
  
  updateDistanceTable(step.distances);
  redraw(step.highlights || [], step.highlightedEdges || []);
  
  // Highlight the corresponding code
  highlightCode(step.phase);
  
  // Update status text
  if (step.message) {
    iterationCounter.textContent = step.message;
  } else if (step.iteration) {
    iterationCounter.textContent = `Iteration ${step.iteration} of ${nodes.length - 1}`;
  } else {
    iterationCounter.textContent = 'Completed';
  }
}

function nextStep() {
  if (!isRunning) {
    alert("Please start the simulation first.");
    return;
  }
  
  currentStep++;
  if (currentStep >= steps.length) {
    currentStep = steps.length - 1;
    alert("Simulation complete!");
    return;
  }
  
  applyStep(steps[currentStep]);
}

function updateDistanceTable(distances) {
  distanceTable.innerHTML = '';
  
  if (!distances) return;
  
  Object.entries(distances).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([node, dist]) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${node}</td><td>${dist === Infinity ? '∞' : dist}</td>`;
    distanceTable.appendChild(row);
  });
}

function reset() {
  if (stepInterval) clearInterval(stepInterval);
  
  nodes = [];
  edges = [];
  nodeIdCounter = 1;
  selectedEdgeNodes = [];
  currentStep = 0;
  steps = [];
  isRunning = false;
  
  distanceTable.innerHTML = '';
  iterationCounter.textContent = 'Not started';
  
  // Reset code highlights
  document.querySelectorAll('.code-line').forEach(line => {
    line.classList.remove('highlighted-code');
  });
  
  redraw();
}

function undo() {
  if (isRunning) return;
  
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
  if (isRunning) return;
  
  if (redoStack.length > 0) {
    historyStack.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      nodeIdCounter
    });
    
    const next = redoStack.pop();
    nodes = next.nodes;
    edges = next.edges;
    nodeIdCounter = next.nodeIdCounter;
    
    redraw();
  }
}

// Initialize the visualization
redraw();