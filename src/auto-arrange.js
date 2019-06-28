import dagre from "dagre"

export class AutoArrange {
    constructor(editor, margin, depth) {
        this.editor = editor;
        this.margin = margin;
        this.depth = depth;
    }

    getNodes(node, type = 'output') {
        const nodes = [];
        const key = `${type}s`;

        for (let io of node[key].values())
            for (let connection of io.connections.values())
                nodes.push(connection[type === 'input' ? 'output' : 'input'].node);

        return nodes;
    }

    getNodesTable(node, cols = [], depth = 0) {
        if (this.depth && depth > this.depth) return;
        if (!cols[depth]) cols[depth] = [];
        if (cols[depth].includes(node)) return;

        cols[depth].push(node);

        this.getNodes(node, 'output').map(n => this.getNodesTable(n, cols, depth + 1));
        this.getNodes(node, 'input').map(n => this.getNodesTable(n, cols, depth - 1));

        return cols;
    }

    nodeSize(node) {
        const el = this.editor.view.nodes.get(node).el;

        return {
            width: el.clientWidth,
            height: el.clientHeight
        }
    }

    arrange(node = this.editor.nodes[0]) {
        const graph = {
          id: "root",
          layoutOptions: { "elk.algorithm": "layered" },
          children: this.editor.nodes.map((n,i) => ({
            id: n.id,
            ...this.nodeSize(n)
          })),
          edges:
            this.editor.nodes.flatMap((n, i) => {
              const edges = []
              for (const [name, {connections: [{output}]}] of n.inputs.entries()) {
                edges.push({
                  id: `e.${i}.${name}`,
                  sources: [n.id],
                  targets: [output.node.id]
                })
              }
              return edges
            })
        }

        const g = new dagre.graphlib.Graph()

        g.setGraph({
          rankdir: "RL",
          align: "dl"
        })
        g.setDefaultEdgeLabel(function() { return {}; });


        for (const node of graph.children) {
          g.setNode(node.id, { label: node.id, width: node.width, height: node.height })
        }

        for (const edge of graph.edges) {
          g.setEdge(edge.sources[0], edge.targets[0])
        }

        dagre.layout(g, {
          rankdir: "RL",
          align: "dl",
        })

        const idToPos = {}
        g.nodes().forEach((nodeId) => {
          const pos = g.node(nodeId)
          idToPos[nodeId] = pos
        });

        for (const v of this.editor.view.nodes.values()) {
          v.translate(idToPos[v.node.id].x, idToPos[v.node.id].y)
        }
    }
}
