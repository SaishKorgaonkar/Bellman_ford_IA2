# Bellman-Ford Algorithm Simulation

An interactive web-based visualization of the Bellman-Ford algorithm for finding shortest paths in a graph, even when negative edge weights are present.

## Project Features

- **Interactive Graph Editor**
  - **Add, move, and delete nodes** with intuitive controls
  - **Create weighted edges** between nodes
  - Support for **negative edge weights**
  - Clear visualization of graph structure

- **Algorithm Visualization**
  - **Step-by-step execution** of the Bellman-Ford algorithm
  - Visual indication of **relaxation operations**
  - Clear highlighting of **shortest paths** found
  - Detection and visualization of **negative weight cycles**
  - **Speed control** for the animation

- **Educational Components**
  - **Explanatory tooltips** describing each step of the algorithm
  - **Distance table** showing updates at each iteration
  - Detailed **path reconstruction**
  - Algorithm **complexity and limitations** explained

- **User Interface**
  - **Clean, responsive design** that works on various screen sizes
  - **Intuitive controls** for graph manipulation
  - **Dark/light mode** toggle
  - **Export and import** graph configurations

## How It Works

The Bellman-Ford algorithm finds the shortest path from a source vertex to all other vertices in a weighted graph. Unlike Dijkstra's algorithm, it can handle graphs with **negative edge weights**.

The simulation demonstrates the algorithm's core operations:
1. **Initialize distances** (source node to 0, all others to infinity)
2. **Relax all edges** |V|-1 times (where |V| is the number of vertices)
3. **Check for negative weight cycles** with an additional relaxation pass

## Technologies Used

This project is built using:
- **HTML5**
- **CSS3**
- **Vanilla JavaScript**

## Usage

1. **Create your graph** by adding nodes and edges
2. **Select a source node**
3. Click "**Run Algorithm**" to start the visualization
4. Use the **step controls** to move through the algorithm execution
5. Observe how **distances update** and shortest paths form
