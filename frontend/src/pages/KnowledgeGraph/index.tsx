import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Share2, RefreshCw, Info } from 'lucide-react';
import { PageHeader } from '../../components/shared/index';
import { GlassPanel } from '../../components/shared/GlassPanel';
import { useCaseStore } from '../../stores/caseStore';
import { graphApi, type GraphData } from '../../services/api';

const NODE_COLORS: Record<string, string> = {
  Host:    '#adc6ff',
  Process: '#4cd7f6',
  File:    '#ffb84d',
  IP:      '#ff5c7c',
  Domain:  '#ff5c7c',
  User:    '#4edea3',
  Finding: '#ff5c7c',
  Alert:   '#ffb84d',
};

// Simple force-directed layout approximation
function layoutNodes(nodes: any[], edges: any[]) {
  const COLS = 4;
  const H_SPACING = 220;
  const V_SPACING = 140;

  return nodes.map((node, idx) => ({
    ...node,
    position: {
      x: (idx % COLS) * H_SPACING + 80,
      y: Math.floor(idx / COLS) * V_SPACING + 80,
    },
  }));
}

export default function KnowledgeGraph() {
  const { selectedCaseId, cases } = useCaseStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const loadGraph = async (caseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphApi.getGraph(caseId);
      setGraphData(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) loadGraph(selectedCaseId);
  }, [selectedCaseId]);

  const flowNodes = useMemo(() => {
    if (!graphData) return [];
    const rawNodes = graphData.nodes.map((node) => {
      const color = NODE_COLORS[node.type] ?? '#ffffff';
      const isFinding = node.type === 'Finding';
      const isIP = node.type === 'IP';
      return {
        id: node.id,
        data: {
          label: (
            <div className="text-[10px] font-mono p-1 text-center font-bold">
              <p className="text-[8px] opacity-60 uppercase mb-0.5">{node.type}</p>
              <p className="truncate max-w-[120px]">{node.name}</p>
            </div>
          ),
          raw: node,
        },
        style: {
          background: 'rgba(9, 14, 28, 0.95)',
          color: '#dee1f7',
          border: `1.5px solid ${color}`,
          borderRadius: '6px',
          boxShadow: (isFinding || isIP) ? `0 0 14px ${color}40` : `0 0 6px ${color}15`,
          width: 150,
        },
        position: { x: 0, y: 0 },
      };
    });
    return layoutNodes(rawNodes, graphData.edges);
  }, [graphData]);

  const flowEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.map((edge, idx) => ({
      id: `e-${idx}`,
      source: edge.source,
      target: edge.target,
      label: edge.relationship,
      animated: edge.relationship.includes('C2') || edge.relationship.includes('COMMUNICATED'),
      style: { stroke: 'rgba(173, 198, 255, 0.35)', strokeWidth: 1.5 },
      labelStyle: { fill: '#94a3b8', fontSize: 8, fontFamily: 'monospace', fillOpacity: 0.8 },
      labelBgStyle: { fill: 'rgba(9, 14, 28, 0.9)', fillOpacity: 0.95 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'rgba(173, 198, 255, 0.5)',
      },
    }));
  }, [graphData]);

  const selectedCaseName = cases.find((c) => c.id === selectedCaseId)?.title ?? 'Unknown';

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <PageHeader
        title="Knowledge Graph"
        description="Relationship graph of entities, processes, IPs and findings extracted from forensic evidence"
        icon={<Share2 size={20} />}
      />

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs font-mono text-sift-muted">
          Case: <span className="text-sift-cyan">{selectedCaseName}</span>
          {graphData && (
            <> · <span className="text-white">{graphData.nodes.length} nodes</span>
              {' '} · <span className="text-white">{graphData.edges.length} edges</span>
            </>
          )}
        </p>
        <button
          onClick={() => selectedCaseId && loadGraph(selectedCaseId)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-sift-muted hover:text-white border border-white/10 rounded px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-sift-danger/10 border border-sift-danger/30 text-xs text-sift-danger font-mono">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

        {/* React Flow */}
        <div className="lg:col-span-3 border border-white/08 rounded-xl bg-[#090e1c]/90 overflow-hidden relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-sift-cyan/40 border-t-sift-cyan animate-spin mx-auto" />
                <p className="text-xs font-mono text-sift-muted">Loading graph data...</p>
              </div>
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              fitView
              onNodeClick={(_, node) => setSelectedNode(node.data.raw)}
              nodeTypes={{}}
            >
              <Background color="rgba(255,255,255,0.02)" gap={16} />
              <Controls className="bg-sift-panel border border-white/10 text-white rounded" />
              <MiniMap
                nodeColor={(node) => {
                  const raw = graphData.nodes.find((n) => n.id === node.id);
                  return raw ? (NODE_COLORS[raw.type] ?? '#fff') : '#fff';
                }}
                maskColor="rgba(0,0,0,0.6)"
                className="bg-[#050814] border border-white/10 rounded"
              />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Share2 size={32} className="mx-auto text-sift-muted/40" />
                <p className="text-xs font-mono text-sift-muted">No graph data for this case.</p>
                <p className="text-[11px] text-sift-muted/60">Upload evidence and run the pipeline to generate the knowledge graph.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Legend */}
          <GlassPanel className="p-4 space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Node Types</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded border flex-shrink-0" style={{ borderColor: color, backgroundColor: `${color}15` }} />
                  <span className="text-sift-muted truncate">{type}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Selected Node Info */}
          {selectedNode ? (
            <GlassPanel className="p-4 space-y-2 border border-sift-cyan/15">
              <div className="flex items-center gap-2 mb-2">
                <Info size={12} className="text-sift-cyan" />
                <h4 className="text-xs font-bold text-white">Node Details</h4>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-sift-muted">Type</span>
                  <span
                    className="px-2 py-0.5 rounded text-[9px]"
                    style={{ color: NODE_COLORS[selectedNode.type] ?? '#fff', background: `${NODE_COLORS[selectedNode.type] ?? '#fff'}15` }}
                  >
                    {selectedNode.type}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sift-muted flex-shrink-0">Name</span>
                  <span className="text-white text-right break-all max-w-[120px]">{selectedNode.name}</span>
                </div>
                {Object.entries(selectedNode.properties ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-sift-muted capitalize flex-shrink-0">{k.replace(/_/g, ' ')}</span>
                    <span className="text-white/70 text-right text-[10px] max-w-[120px] truncate">{String(v)}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-4">
              <p className="text-[11px] text-sift-muted font-mono text-center">Click a node to see details</p>
            </GlassPanel>
          )}

          {/* Graph Stats */}
          {graphData && (
            <GlassPanel className="p-4 space-y-2">
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Graph Stats</h4>
              <div className="space-y-1.5 text-[11px] font-mono">
                {(['Host','User','Process','IP','Finding'] as const).map((type) => {
                  const count = graphData.nodes.filter((n) => n.type === type).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sift-muted">{type}s</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-1 border-t border-white/08">
                  <span className="text-sift-muted">Relationships</span>
                  <span className="text-white font-bold">{graphData.edges.length}</span>
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
