/* dijkstra.js (fixed full version) */

/* ------------- initial data (keeps same structure as before) ------------- */
let nodes = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
  { id: "d" },
  { id: "e" },
  { id: "f" },
  { id: "g" },
  { id: "h" },
];

let links = [
  { source:  "a", target: "b", weight: 42, id: "a-b" },
  { source: "a", target: "c", weight: 4, id: "a-c" },
  { source: "a", target: "d", weight: 10, id: "a-d" },
  { source: "b", target: "e", weight: 14, id: "b-e" },
  { source: "b", target: "f", weight: 3, id: "b-f" },
  { source: "c", target: "d", weight: 3, id: "c-d" },
  { source: "c", target: "g", weight: 15, id: "c-g" },
  { source: "d", target: "e", weight: 1, id: "d-e" },
  { source: "d", target: "g", weight: 15, id: "d-g" },
  { source: "d", target: "h", weight: 20, id: "d-h" },
  { source: "e", target: "f", weight: 11, id: "e-f" },
  { source: "g", target: "h", weight: 7, id: "g-h" },
  { source: "f", target: "h", weight: 9, id: "f-h" },
];

/* ---------------- SVG + D3 simulation ---------------- */
const svg = d3.select("#graph");
const viewBox = svg.attr("viewBox").split(" ");
const width = +viewBox[2];
const height = +viewBox[3];


let simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3
      .forceLink()
      .id((d) => d.id)
      .distance(110)
  )
  .force("charge", d3.forceManyBody().strength(-400))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collide", d3.forceCollide().radius(40))
  .force("x", d3.forceX(width / 2).strength(0.05))
  .force("y", d3.forceY(height / 2).strength(0.05));

let linkGroup = svg.append("g").attr("class", "links");
let nodeGroup = svg.append("g").attr("class", "nodes");
let labelGroup = svg.append("g").attr("class", "labels");
let weightGroup = svg.append("g").attr("class", "weights");

/* ---------------- state for animation/steps ---------------- */
let serverSteps = []; // steps returned from backend (array of StepDto)
let currentStepIndex = -1;
let running = false;
let stepTimer = null;
let consideringAnimationTimer = null; // interval nhấp nháy
const SERVER_BASE = "http://localhost:5196";
const PAGE_SIZE = 6;

/* ---------------- helpers ---------------- */
function getEndpoints(link) {
  const s = link.source && link.source.id ? link.source.id : link.source;
  const t = link.target && link.target.id ? link.target.id : link.target;
  return { s, t };
}
function ensureLinkIds() {
  links.forEach((l) => {
    const { s, t } = getEndpoints(l);
    if (!l.id) l.id = `${s}-${t}`;
  });
}
function normId(raw) {
  return raw ? raw.toString().trim().toLowerCase() : "";
}

/* ---------------- render / restart ---------------- */
function restart() {
  ensureLinkIds();

  // LINKS
  const link = linkGroup.selectAll("line").data(links, (d) => d.id);
  link.exit().remove();
  const linkEnter = link
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("id", (d) => "edge-" + d.id)
    .style("cursor", "pointer");
  linkEnter.on("click", () => {});

  // WEIGHTS
  const wlabel = weightGroup.selectAll("text").data(links, (d) => d.id);
  wlabel.exit().remove();
  const wEnter = wlabel
    .enter()
    .append("text")
    .attr("class", "weight")
    .attr("data-edge", (d) => d.id)
    .attr("fill", "black")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .text((d) => d.weight);
  wlabel.merge(wEnter).text((d) => d.weight);

  // NODES
  const node = nodeGroup.selectAll("circle").data(nodes, (d) => d.id);
  node.exit().remove();
  const nodeEnter = node
    .enter()
    .append("circle")
    .attr("r", 20)
    .attr("fill", "black")
    .attr("stroke", "#E6BE8A")
    .attr("stroke-width", 4)
    .attr("id", (d) => "node-" + d.id)
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

  // LABELS
  const label = labelGroup.selectAll("text").data(nodes, (d) => d.id);
  label.exit().remove();
  const labelEnter = label
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("fill", "white")
    .attr("font-size", 14)
    .attr("font-weight", "700")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .text((d) => d.id.toUpperCase());

  // update simulation
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();

  simulation.on("tick", () => {
    linkGroup
      .selectAll("line")
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeGroup
      .selectAll("circle")
      .attr("cx", (d) => {
        d.x = Math.max(24, Math.min(width - 24, d.x));
        return d.x;
      })
      .attr("cy", (d) => {
        d.y = Math.max(24, Math.min(height - 24, d.y));
        return d.y;
      });

    labelGroup
      .selectAll("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y);

    weightGroup
      .selectAll("text")
      .attr("x", (d) => (d.source.x + d.target.x) / 2)
      .attr("y", (d) => (d.source.y + d.target.y) / 2);
  });
}

/* ---------------- styling helpers ----------------- */
function resetStyles() {
  // edges & weights
  linkGroup.selectAll("line").attr("stroke", "#999").attr("stroke-width", 2);
  weightGroup.selectAll("text").attr("fill", "black");
  nodeGroup.selectAll("circle").attr("fill", "black").attr("stroke", "#E6BE8A");
}

// --------------- applyStepVisuals ---------------
function applyStepVisuals(stepIndex) {
  if (!serverSteps || serverSteps.length === 0) return;
  const cur = serverSteps[stepIndex];
  if (!cur) return;

  const acceptedNodes = new Set(
    (cur.AcceptedNodes || []).map((n) => n.toLowerCase())
  );
  const acceptedEdges = new Set(
    (cur.AcceptedEdges || []).map((e) => e.toLowerCase())
  );

  const consideringNodes = (cur.Highlight?.Nodes || []).map((n) =>
    n.toLowerCase()
  );
  const consideringEdges = (cur.Highlight?.Edges || []).map((e) =>
    e.toLowerCase()
  );

  // 1) Giữ nguyên các node/edge đã xanh trước đó
  nodeGroup.selectAll("circle").each(function (d) {
    const id = d.id.toLowerCase();
    if (acceptedNodes.has(id)) {
      d3.select(this)
        .attr("fill", "#4caf50")
        .attr("stroke", "#E6BE8A")
        .attr("stroke-width", 2);
    }
  });
  linkGroup.selectAll("line").each(function (d) {
    const id = d.id.toLowerCase();
    if (acceptedEdges.has(id)) {
      d3.select(this).attr("stroke", "#4caf50").attr("stroke-width", 4);
      weightGroup
        .selectAll("text")
        .filter((wd) => String(wd.id).toLowerCase() === id)
        .attr("fill", "#4caf50");
    }
  });

  // 2) Nhấp nháy cam 2s cho node/edge đang xét
  consideringNodes.forEach((nid) => {
    const node = nodeGroup
      .selectAll("circle")
      .filter((d) => d.id.toLowerCase() === nid);
    node
      .transition()
      .duration(400)
      .attr("fill", "#ffc107")
      .transition()
      .duration(400)
      .attr("fill", "black")
      .transition()
      .duration(400)
      .attr("fill", "#ffc107")
      .transition()
      .duration(400)
      .attr("fill", acceptedNodes.has(nid) ? "#4caf50" : "black");
  });

  consideringEdges.forEach((eid) => {
    const line = linkGroup
      .selectAll("line")
      .filter((d) => d.id.toLowerCase() === eid);
    const text = weightGroup
      .selectAll("text")
      .filter((d) => String(d.id).toLowerCase() === eid);
    line
      .transition()
      .duration(400)
      .attr("stroke", "#ffc107")
      .attr("stroke-width", 4)
      .transition()
      .duration(400)
      .attr("stroke", "#999")
      .attr("stroke-width", 2)
      .transition()
      .duration(400)
      .attr("stroke", "#ffc107")
      .attr("stroke-width", 4)
      .transition()
      .duration(400)
      .attr("stroke", acceptedEdges.has(eid) ? "#4caf50" : "#999")
      .attr("stroke-width", acceptedEdges.has(eid) ? 4 : 2);

    text
      .transition()
      .duration(800)
      .attr("fill", acceptedEdges.has(eid) ? "#4caf50" : "black");
  });
}

// --------------- play animation ---------------
function play() {
  if (running) return;
  if (!serverSteps || serverSteps.length === 0) return;

  running = true;

  function stepNext() {
    if (!running || currentStepIndex >= serverSteps.length - 1) {
      running = false;
      return;
    }

    currentStepIndex++;
    applyStepVisuals(currentStepIndex);
    renderStepsList();

    // timeout dựa trên thời gian nhấp nháy (2s)
    stepTimer = setTimeout(stepNext, 1000);
  }

  if (currentStepIndex >= serverSteps.length - 1) currentStepIndex = -1;
  stepNext();
}

function pause() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}

function prevStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

function nextStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.min(serverSteps.length - 1, currentStepIndex + 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

/* ----------------- animation control ----------------- */
function stopAnimation() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
  if (consideringAnimationTimer) {
    clearInterval(consideringAnimationTimer);
    consideringAnimationTimer = null;
  }
}

function play() {
  if (running) return;
  if (!serverSteps || serverSteps.length === 0) {
    runDijkstra().catch((err) => {
      console.error(err);
      alert("Không thể lấy steps: " + err.message);
    });
    return;
  }
  if (currentStepIndex >= serverSteps.length - 1) {
    currentStepIndex = -1;
    resetStyles();
  }
  running = true;
  stepNextLoop();
}

function stepNextLoop() {
  if (!running) return;
  const speedVal = +document.getElementById("speed")?.value || 3;
  const duration = Math.max(90, Math.round(700 / speedVal));

  if (currentStepIndex < serverSteps.length - 1) {
    currentStepIndex++;
    applyStepVisuals(currentStepIndex);
    renderStepsList();
    stepTimer = setTimeout(stepNextLoop, duration);
  } else running = false;
}

function pause() {
  running = false;
  if (stepTimer) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }
}
function prevStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, currentStepIndex - 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}
function nextStep() {
  pause();
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.min(serverSteps.length - 1, currentStepIndex + 1);
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

/* ----------------- drag handlers ----------------- */
function dragstarted(event, d) {
  if (d._fixed) return;
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}
function dragged(event, d) {
  if (d._fixed) return;
  d.fx = event.x;
  d.fy = event.y;
}
function dragended(event, d) {
  if (d._fixed) return;
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/* ----------------- UI and graph functions (add/remove/reset/random) ----------------- */
function showCreate() {
  let form = document.getElementById("createForm");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

function addNode() {
  let id = normId(document.getElementById("nodeName").value);
  if (!id) {
    alert("Nhập tên node");
    return;
  }
  if (nodes.find((n) => n.id === id)) {
    alert("Node đã tồn tại");
    return;
  }
  nodes.push({
    id: id,
    x: width / 2 + (Math.random() - 0.5) * 60,
    y: height / 2 + (Math.random() - 0.5) * 60,
  });
  restart();
  document.getElementById("nodeName").value = "";
}
function removeNode() {
  let id = normId(document.getElementById("nodeName").value);
  if (!id) {
    alert("Nhập tên node để xóa");
    return;
  }
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx === -1) {
    alert("Node không tồn tại");
    return;
  }
  nodes.splice(idx, 1);
  links = links.filter((l) => {
    const { s, t } = getEndpoints(l);
    return s !== id && t !== id;
  });
  restart();
  document.getElementById("nodeName").value = "";
}

function addEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);
  const wRaw = document.getElementById("edgeValue").value.trim();
  if (!src || !tgt) {
    alert("Nhập source và target");
    return;
  }
  if (src === tgt) {
    alert("Không thể nối chính nó");
    return;
  }
  if (!nodes.find((n) => n.id === src) || !nodes.find((n) => n.id === tgt)) {
    alert("Source/Target phải tồn tại");
    return;
  }
  const existing = links.find((l) => {
    const { s, t } = getEndpoints(l);
    return (
      (s.toLowerCase() === src && t.toLowerCase() === tgt) ||
      (s.toLowerCase() === tgt && t.toLowerCase() === src)
    );
  });
  if (existing) {
    if (wRaw !== "") {
      const newW = Number(wRaw);
      const ok = confirm(
        `Cạnh ${existing.id} đã tồn tại. Thay trọng số ${existing.weight} → ${newW}?`
      );
      if (ok) {
        existing.weight = newW;
        restart();
      } else {
        alert("Cạnh giữ nguyên");
      }
    } else {
      alert("Cạnh đã tồn tại.");
    }
    return;
  }
  const weight = wRaw !== "" ? Number(wRaw) : 1;
  links.push({ source: src, target: tgt, weight: weight, id: `${src}-${tgt}` });
  restart();
  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
  document.getElementById("edgeValue").value = "";
}
function removeEdge() {
  const src = normId(document.getElementById("fromNode").value);
  const tgt = normId(document.getElementById("toNode").value);
  if (!src || !tgt) {
    alert("Nhập source và target");
    return;
  }
  const idx = links.findIndex((l) => {
    const { s, t } = getEndpoints(l);
    return (
      (s.toLowerCase() === src && t.toLowerCase() === tgt) ||
      (s.toLowerCase() === tgt && t.toLowerCase() === src)
    );
  });
  if (idx === -1) {
    alert("Edge không tồn tại");
    return;
  }
  links.splice(idx, 1);
  restart();
  document.getElementById("fromNode").value = "";
  document.getElementById("toNode").value = "";
}

function resetGraph() {
  nodes = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
    { id: "e" },
    { id: "f" },
    { id: "g" },
    { id: "h" },
  ];
  links = [
    { source: "a", target: "b", weight: 42, id: "a-b" },
    { source: "a", target: "c", weight: 4, id: "a-c" },
    { source: "a", target: "d", weight: 10, id: "a-d" },
    { source: "b", target: "e", weight: 14, id: "b-e" },
    { source: "b", target: "f", weight: 3, id: "b-f" },
    { source: "c", target: "d", weight: 3, id: "c-d" },
    { source: "c", target: "g", weight: 15, id: "c-g" },
    { source: "d", target: "e", weight: 1, id: "d-e" },
    { source: "d", target: "g", weight: 15, id: "d-g" },
    { source: "d", target: "h", weight: 20, id: "d-h" },
    { source: "e", target: "f", weight: 11, id: "e-f" },
    { source: "g", target: "h", weight: 7, id: "g-h" },
    { source: "f", target: "h", weight: 9, id: "f-h" },
  ];
  stopAnimation();
  serverSteps = [];
  currentStepIndex = -1;
  renderStepsList();
  restart();
  resetStyles();
}

function randomGraph() {
  stopAnimation();
  const N = 8,
    extraEdges = 6;
  const letters = "abcdefghijklmnopqrstuvwxyz";
  nodes = [];
  links = [];
  for (let i = 0; i < N; i++) {
    nodes.push({
      id: letters[i],
      x: width / 2 + (Math.random() - 0.5) * 120,
      y: height / 2 + (Math.random() - 0.5) * 120,
    });
  }
  let available = nodes.map((n) => n.id),
    connected = [available.shift()];
  while (available.length) {
    const a = connected[Math.floor(Math.random() * connected.length)];
    const idx = Math.floor(Math.random() * available.length);
    const b = available.splice(idx, 1)[0];
    const w = Math.floor(Math.random() * 20) + 1;
    links.push({ source: a, target: b, weight: w, id: `${a}-${b}` });
    connected.push(b);
  }
  for (let k = 0; k < extraEdges; k++) {
    const i = Math.floor(Math.random() * N),
      j = Math.floor(Math.random() * N);
    if (i === j) continue;
    const a = nodes[i].id,
      b = nodes[j].id;
    const id = `${a}-${b}`;
    if (links.find((l) => l.id === id || l.id === `${b}-${a}`)) continue;
    const w = Math.floor(Math.random() * 20) + 1;
    links.push({ source: a, target: b, weight: w, id: id });
  }
  serverSteps = [];
  currentStepIndex = -1;
  restart();
  resetStyles();
  renderStepsList();
}

/* ----------------- Steps UI ----------------- */
function renderStepsList() {
  const container = document.getElementById("steps");
  if (!container) return;
  container.querySelectorAll(".step-entry").forEach((n) => n.remove());
  let pageStart = 0;
  if (currentStepIndex >= 0)
    pageStart = Math.floor(currentStepIndex / PAGE_SIZE) * PAGE_SIZE;
  for (
    let i = pageStart;
    i < Math.min(serverSteps.length, pageStart + PAGE_SIZE);
    i++
  ) {
    const s = serverSteps[i];
    const div = document.createElement("div");
    div.className = "step-entry";
    div.style.margin = "10px";
    div.style.padding = "12px";
    div.style.background =
      i === currentStepIndex ? "#3e2d10" : "rgba(255,255,255,0.04)";
    div.style.borderRadius = "8px";
    div.style.cursor = "pointer";
    div.style.color = "#fff";
    div.innerText = `Step ${s.Step}: ${s.Pseudo}`;
    div.onclick = () => {
      stopAnimation();
      goToStep(i);
    };
    container.appendChild(div);
  }
}

function goToStep(index) {
  if (!serverSteps || serverSteps.length === 0) return;
  currentStepIndex = Math.max(0, Math.min(index, serverSteps.length - 1));
  applyStepVisuals(currentStepIndex);
  renderStepsList();
}

/* ----------------- Backend integration ----------------- */
async function runDijkstra(startNode) {
  stopAnimation();
  serverSteps = [];
  currentStepIndex = -1;
  renderStepsList();
  const payload = {
    Nodes: nodes.map((n) => n.id),
    Edges: links.map((l) => {
      const { s, t } = getEndpoints(l);
      return { From: s, To: t, Weight: Number(l.weight) };
    }),
    Directed: false,
  };
  const createResp = await fetch(`${SERVER_BASE}/api/graphs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const createData = await createResp.json();
  const id = createData.id;
  const start =
    (startNode && String(startNode)) || (nodes.length ? nodes[0].id : "");
  const runResp = await fetch(
    `${SERVER_BASE}/api/graphs/${id}/teach?start=${start}`
  );
  if (!runResp.ok) throw new Error("Run graph failed: " + runResp.statusText);
  const runData = await runResp.json();
  serverSteps = runData.pages.flat();
  currentStepIndex = -1;
  renderStepsList();
  play();
}

/* ----------------- expose globals ----------------- */
window.showCreate = showCreate;
window.addNode = addNode;
window.removeNode = removeNode;
window.addEdge = addEdge;
window.removeEdge = removeEdge;
window.resetGraph = resetGraph;
window.randomGraph = randomGraph;
window.play = play;
window.pause = pause;
window.prevStep = prevStep;
window.nextStep = nextStep;
window.runDijkstra = runDijkstra;

/* ----------------- kickoff ----------------- */
restart();
resetStyles();
renderStepsList();
