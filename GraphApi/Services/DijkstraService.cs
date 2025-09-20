using GraphApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GraphApi.Services;

public class DijkstraService
{
    private readonly Dictionary<Guid, GraphRequest> _graphs = new();

    public Guid CreateGraph(GraphRequest request)
    {
        var id = Guid.NewGuid();
        _graphs[id] = request;
        return id;
    }

    public List<StepDto> Run(Guid id, string start)
    {
        if (!_graphs.TryGetValue(id, out var graph))
            throw new InvalidOperationException("Graph not found");

        // Biến giống console
        HashSet<string> T = new();               // tập đỉnh đã xét (chốt)
        List<Edge> E = graph.Edges.ToList();     // danh sách cạnh nguyên thủy
        List<string> Q = new();                  // hàng đợi Q (đỉnh đã phát hiện chờ xử lý)
        List<Edge> H = new();                    // danh sách cạnh đang xét (dùng để log)
        Dictionary<string, double> Dist = new(); // khoảng cách
        Dictionary<string, string> Pre = new();  // node trước (predecessor)
        List<string> V = graph.Nodes.ToList();   // tập đỉnh

        // build adjacency list (treat edges as undirected by default)
        var adj = new Dictionary<string, List<(string To, double W)>>();
        foreach (var v in V) adj[v] = new List<(string, double)>();
        foreach (var e in E)
        {
            if (!adj.ContainsKey(e.From)) adj[e.From] = new List<(string, double)>();
            if (!adj.ContainsKey(e.To)) adj[e.To] = new List<(string, double)>();

            // thêm hướng from -> to
            if (!adj[e.From].Any(x => x.To == e.To && Math.Abs(x.W - e.Weight) < 1e-9))
                adj[e.From].Add((e.To, e.Weight));

            // thêm ngược lại để xử lý như undirected (nếu dữ liệu đã chứa cả 2 hướng thì check duplicate)
            if (!adj[e.To].Any(x => x.To == e.From && Math.Abs(x.W - e.Weight) < 1e-9))
                adj[e.To].Add((e.From, e.Weight));
        }

        var steps = new List<StepDto>();
        int buoc = 1;

        // ===== BƯỚC 1: KHỞI TẠO =====
        T.Clear();
        AddStep(steps, $"{buoc}", "T := {}", "Khởi tạo danh sách T rỗng",
            $"T = {{}}", "Chưa tô");

        foreach (var v in V)
        {
            Dist[v] = double.PositiveInfinity;
            Pre[v] = "None";
        }
        AddStep(steps, $"{buoc}", "For t ∈ V: Dist[t] := ∞; Pre[t] := None",
            "Đặt toàn bộ Dist = ∞, Pre = None",
            $"Dist = {{{PrintDict(Dist)}}}\nPre = {{{PrintPre(Pre)}}}", "Chưa tô");

        // check start
        if (!Dist.ContainsKey(start))
            throw new ArgumentException($"Start node '{start}' không tồn tại trong graph.");

        Dist[start] = 0;
        AddStep(steps, $"{buoc}", $"Dist[{start}] = 0, Pre[{start}] = None",
            $"Đặt Dist[{start}] = 0",
            $"Dist = {{{PrintDict(Dist)}}}\nPre = {{{PrintPre(Pre)}}}", "Chưa tô",
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        // put start vào Q
        Q.Add(start);
        AddStep(steps, $"{buoc}", $"Q := ∅; put({start}, Q)",
            $"Khởi tạo hàng đợi Q = {{{start}}}",
            $"Q = {{{string.Join(", ", Q)}}}", "Chưa tô",
            highlight: new HighlightDto { Nodes = new List<string> { start } });

        H.Clear();
        AddStep(steps, $"{buoc}", "H := ∅", "Khởi tạo danh sách H",
            $"H = {{{string.Join(", ", H)}}}", "Chưa tô");

        // ===== VÒNG LẶP CHÍNH =====
        while (Q.Count > 0)
        {
            buoc++;
            int buocnho = 1;

            // --- chọn đỉnh có Dist nhỏ nhất trong Q ---
            string t = Q.OrderBy(x => Dist.ContainsKey(x) ? Dist[x] : double.PositiveInfinity).First();
            Q.Remove(t);

            // Step: lấy t (highlight node t)
            AddStep(steps, $"{buoc}.{buocnho++}",
                $"t := get(min(Dist[Q])) := {t}",
                $"Lấy đỉnh {t} có Dist nhỏ nhất ra khỏi Q",
                $"Q = {{{string.Join(", ", Q)}}}",
                $"Tô đỏ đỉnh {t}",
                highlight: new HighlightDto { Nodes = new List<string> { t } },
                acceptedNodes: BuildAcceptedNodes(Pre, start),
                acceptedEdges: BuildAcceptedEdges(Pre));

            // --- thêm vào T ---
            T.Add(t);
            AddStep(steps, $"{buoc}.{buocnho++}",
                $"Append(T, {t})",
                $"Duyệt đỉnh {t} và thêm vào T",
                $"T = {{{string.Join(", ", T)}}}",
                $"Chuyển đỉnh {t} sang xanh",
                highlight: null,
                acceptedNodes: BuildAcceptedNodes(Pre, start),
                acceptedEdges: BuildAcceptedEdges(Pre));

            // --- tìm các cạnh xuất phát từ t (H) ---
            H = adj[t]
     .Select(nb => new Edge { From = t, To = nb.To, Weight = (int)nb.W })
     .ToList();

            string hEdges = string.Join(", ", H.Select(e => $"({e.From},{e.To},{e.Weight})"));

            // Step: tô cam cho tất cả cạnh trong H (nhấp nháy) — frontend có thể animate
            AddStep(steps, $"{buoc}.{buocnho++}",
                $"For e ∈ E if e.From = {t} → thêm vào H",
                $"Tìm các cạnh xuất phát từ {t}: {hEdges}",
                $"H = {{{hEdges}}}",
                $"Tô đỏ các cạnh {{{hEdges}}}",
                highlight: new HighlightDto { Edges = H.Select(e => $"{e.From}-{e.To}").ToList() },
                acceptedNodes: BuildAcceptedNodes(Pre, start),
                acceptedEdges: BuildAcceptedEdges(Pre));

            // Step: For e ∈ H (giữ highlight H)
            AddStep(steps, $"{buoc}.{buocnho++}",
                "For e ∈ H",
                "Xét từng cạnh trong H",
                $"H = {{{hEdges}}}",
                $"Giữ nguyên màu đỏ các cạnh {{{hEdges}}}",
                highlight: new HighlightDto { Edges = H.Select(e => $"{e.From}-{e.To}").ToList() },
                acceptedNodes: BuildAcceptedNodes(Pre, start),
                acceptedEdges: BuildAcceptedEdges(Pre));

            // --- xét từng cạnh trong H, xử lý từng cạnh riêng lẻ ---
            foreach (var e in H)
            {
                string u = e.From;
                string v = e.To;
                double w = e.Weight;

                // Bước 1: highlight cạnh đang xét (cam)
                AddStep(steps, $"{buoc}.{buocnho++}",
                    $"Xét cạnh ({u},{v},{w})",
                    $"Đang xét cạnh {u}->{v} (trọng số {w})",
                    $"Dist = {{{PrintDict(Dist)}}}; Pre = {{{PrintPre(Pre)}}}",
                    $"Highlight cạnh {u}-{v}",
                    highlight: new HighlightDto { Edges = new List<string> { $"{u}-{v}" }, Nodes = new List<string> { v } },
                    acceptedNodes: BuildAcceptedNodes(Pre, start),
                    acceptedEdges: BuildAcceptedEdges(Pre));

                double du = Dist.ContainsKey(u) ? Dist[u] : double.PositiveInfinity;
                double dv = Dist.ContainsKey(v) ? Dist[v] : double.PositiveInfinity;
                double alt = double.IsInfinity(du) ? double.PositiveInfinity : du + w;

                if (alt < dv)
                {
                    // relax thành công => update Dist, Pre
                    Dist[v] = alt;
                    Pre[v] = u;
                    if (!Q.Contains(v)) Q.Add(v);

                    // Khi cạnh được chọn, tạo accepted list hiện tại từ Pre (nó sẽ phản ánh các cạnh đang được chọn)
                    var acceptedEdgesNow = BuildAcceptedEdges(Pre);
                    var acceptedNodesNow = BuildAcceptedNodes(Pre, start);

                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Dist[{v}] = min({(double.IsInfinity(dv) ? "∞" : dv.ToString())}, {du} + {w}) = {Dist[v]}",
                        $"Cập nhật Dist[{v}] = {Dist[v]}, Pre[{v}] = {u}",
                        $"Dist = {{{PrintDict(Dist)}}}\nPre = {{{PrintPre(Pre)}}}\nQ = {{{string.Join(", ", Q)}}}",
                        $"Cạnh {u}-{v} chuyển xanh, đỉnh {v} chuyển xanh",
                        highlight: new HighlightDto { Edges = new List<string> { $"{u}-{v}" }, Nodes = new List<string> { v } },
                        acceptedNodes: acceptedNodesNow,
                        acceptedEdges: acceptedEdgesNow);
                }
                else
                {
                    // Không cập nhật => bỏ highlight (giải trình step reset, accepted giữ như trước)
                    AddStep(steps, $"{buoc}.{buocnho++}",
                        $"Dist[{v}] ≤ Dist[{u}] + {w}",
                        $"Không cập nhật Dist[{v}]",
                        $"Dist = {{{PrintDict(Dist)}}}\nPre = {{{PrintPre(Pre)}}}",
                        "Không chọn cạnh (trả về mặc định)",
                        highlight: null,
                        acceptedNodes: BuildAcceptedNodes(Pre, start),
                        acceptedEdges: BuildAcceptedEdges(Pre));
                }
            } // end foreach e in H

            // --- reset H ---
            H.Clear();
            AddStep(steps, $"{buoc}.{buocnho++}",
                "H := ∅",
                "Đặt H về rỗng",
                $"H = {{{string.Join(", ", H)}}}",
                "Chưa tô",
                highlight: null,
                acceptedNodes: BuildAcceptedNodes(Pre, start),
                acceptedEdges: BuildAcceptedEdges(Pre));
        } // end while Q

        return steps;
    }

    // ========== helper AddStep và helper build accepted ==========
    private void AddStep(
        List<StepDto> steps,
        string step,
        string pseudo,
        string explain,
        string state,
        string color,
        HighlightDto? highlight = null,
        List<string>? acceptedNodes = null,
        List<string>? acceptedEdges = null)
    {
        steps.Add(new StepDto
        {
            Step = step,
            Pseudo = pseudo,
            Explain = explain,
            State = state,
            Color = color,
            Highlight = highlight ?? new HighlightDto(),
            AcceptedNodes = acceptedNodes ?? new List<string>(),
            AcceptedEdges = acceptedEdges ?? new List<string>()
        });
    }

    // Build accepted edges list theo Pre map (các cạnh hiện đang làm Pre)
    private List<string> BuildAcceptedEdges(Dictionary<string, string> pre)
    {
        var list = new List<string>();
        foreach (var kv in pre)
        {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Value != "None")
            {
                list.Add($"{kv.Value}-{kv.Key}");
            }
        }
        return list;
    }

    // Build accepted nodes: bao gồm start và các node có Pre != None
    private List<string> BuildAcceptedNodes(Dictionary<string, string> pre, string start)
    {
        var set = new HashSet<string>();
        set.Add(start);
        foreach (var kv in pre)
        {
            if (!string.IsNullOrEmpty(kv.Value) && kv.Value != "None")
            {
                set.Add(kv.Key);
                set.Add(kv.Value);
            }
        }
        return set.ToList();
    }

    private string PrintDict(Dictionary<string, double> dict)
    {
        return string.Join(", ", dict.Select(kv =>
            $"{kv.Key}:{(double.IsInfinity(kv.Value) ? "∞" : kv.Value.ToString())}"));
    }

    private string PrintPre(Dictionary<string, string> dict)
    {
        return string.Join(", ", dict.Select(kv => $"{kv.Key}:{kv.Value}"));
    }
}
