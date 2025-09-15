using GraphApi.Models;

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

        var steps = new List<StepDto>();

        var T = new HashSet<string>(); // tập đỉnh đã duyệt
        var Q = new List<string>();    // hàng đợi
        var H = new List<Edge>();      // cạnh đang xét
        var Dist = new Dictionary<string, double>();
        var Pre = new Dictionary<string, string>();

        // --- Bước 1: Khởi tạo ---
        foreach (var v in graph.Nodes)
        {
            Dist[v] = double.PositiveInfinity;
            Pre[v] = "None";
        }
        steps.Add(new StepDto
        {
            Step = steps.Count + 1,
            Pseudo = "For t ∈ V: Dist[t] := ∞; Pre[t] := None",
            Explain = "Đặt toàn bộ Dist = ∞, Pre = None",
            State = PrintState(Dist, Pre, Q, T, H),
            Color = "Chưa tô"
        });

        Dist[start] = 0;
        steps.Add(new StepDto
        {
            Step = steps.Count + 1,
            Pseudo = $"Dist[{start}] = 0",
            Explain = $"Đặt Dist[{start}] = 0",
            State = PrintState(Dist, Pre, Q, T, H),
            Color = "Tô đỏ đỉnh",
            Highlight = new HighlightDto { Nodes = new() { start } }
        });

        Q.Add(start);
        steps.Add(new StepDto
        {
            Step = steps.Count + 1,
            Pseudo = "Q := ∅; put(start, Q)",
            Explain = "Khởi tạo hàng đợi Q với đỉnh nguồn",
            State = PrintState(Dist, Pre, Q, T, H),
            Color = "Chưa tô"
        });

        // --- Vòng lặp chính ---
        while (Q.Count > 0)
        {
            var t = Q.OrderBy(v => Dist[v]).First();
            Q.Remove(t);

            steps.Add(new StepDto
            {
                Step = steps.Count + 1,
                Pseudo = $"t := get(min(Dist[Q])) = {t}",
                Explain = $"Lấy đỉnh {t} có Dist nhỏ nhất ra khỏi Q",
                State = PrintState(Dist, Pre, Q, T, H),
                Color = "Tô đỏ đỉnh",
                Highlight = new HighlightDto { Nodes = new() { t } }
            });

            // thêm vào T
            T.Add(t);
            steps.Add(new StepDto
            {
                Step = steps.Count + 1,
                Pseudo = $"Append(T, {t})",
                Explain = $"Duyệt đỉnh {t} và thêm vào T",
                State = PrintState(Dist, Pre, Q, T, H),
                Color = "Chuyển đỉnh sang xanh",
                Highlight = new HighlightDto { Nodes = new() { t } },
                AcceptedNodes = T.ToList() // <-- quan trọng, cập nhật node accepted
            });

            // tìm cạnh từ t
            H = graph.Edges.Where(e => e.From == t).ToList();
            if (H.Any())
            {
                steps.Add(new StepDto
                {
                    Step = steps.Count + 1,
                    Pseudo = $"For e ∈ E if e.From = {t} → thêm vào H",
                    Explain = $"Tìm các cạnh xuất phát từ {t}",
                    State = PrintState(Dist, Pre, Q, T, H),
                    Color = "Tô đỏ cạnh",
                    Highlight = new HighlightDto { Edges = H.Select(e => $"{e.From}-{e.To}").ToList() }
                });
            }

            foreach (var e in H)
            {
                var u = e.From;
                var v = e.To;
                var w = e.Weight;

                if (Dist[v] > Dist[u] + w)
                {
                    var old = Dist[v];
                    Dist[v] = Dist[u] + w;
                    Pre[v] = u;
                    if (!Q.Contains(v)) Q.Add(v);

                    steps.Add(new StepDto
                    {
                        Step = steps.Count + 1,
                        Pseudo = $"Dist[{v}] = min({old}, {Dist[u]} + {w}) = {Dist[v]}",
                        Explain = $"Cập nhật Dist[{v}] = {Dist[v]}, Pre[{v}] = {u}",
                        State = PrintState(Dist, Pre, Q, T, H),
                        Color = "Chuyển cạnh sang xanh",
                        Highlight = new HighlightDto { Edges = new() { $"{u}-{v}" }, Nodes = new() { v } },
                        AcceptedNodes = new List<string>(T) { v },        // node vừa accepted
                        AcceptedEdges = new List<string> { $"{u}-{v}" }  // edge vừa accepted
                    });
                }
                else
                {
                    steps.Add(new StepDto
                    {
                        Step = steps.Count + 1,
                        Pseudo = $"Dist[{v}] ≤ Dist[{u}] + {w}",
                        Explain = $"Không cập nhật Dist[{v}]",
                        State = PrintState(Dist, Pre, Q, T, H),
                        Color = "Giữ nguyên"
                    });
                }
            }

            H.Clear();
            steps.Add(new StepDto
            {
                Step = steps.Count + 1,
                Pseudo = "H := ∅",
                Explain = "Đặt H về rỗng",
                State = PrintState(Dist, Pre, Q, T, H),
                Color = "Reset cạnh"
            });
        }

        // --- Xác định đường đi ngắn nhất ---
        var shortestNodes = new HashSet<string>();
        var shortestEdges = new HashSet<string>();

        foreach (var v in graph.Nodes)
        {
            if (v == start) continue;
            var path = new List<string>();
            var cur = v;
            while (Pre.ContainsKey(cur) && Pre[cur] != "None")
            {
                path.Add(cur);
                cur = Pre[cur];
            }
            if (cur == start && path.Count > 0)
            {
                shortestNodes.Add(start);
                foreach (var node in path)
                    shortestNodes.Add(node);

                cur = v;
                while (Pre.ContainsKey(cur) && Pre[cur] != "None")
                {
                    var u = Pre[cur];
                    var edgeId = $"{u}-{cur}";
                    shortestEdges.Add(edgeId.ToLower());
                    cur = u;
                }
            }
        }

        // gán AcceptedNodes/Edges cho step cuối cùng
        if (steps.Count > 0)
        {
            var lastStep = steps.Last();
            lastStep.AcceptedNodes = shortestNodes.ToList();
            lastStep.AcceptedEdges = shortestEdges.ToList();
        }

        return steps;
    }

    private string PrintState(Dictionary<string, double> Dist,
                              Dictionary<string, string> Pre,
                              List<string> Q,
                              HashSet<string> T,
                              List<Edge> H)
    {
        string distStr = string.Join(", ", Dist.Select(kv => $"{kv.Key}:{(double.IsInfinity(kv.Value) ? "∞" : kv.Value)}"));
        string preStr = string.Join(", ", Pre.Select(kv => $"{kv.Key}:{kv.Value}"));
        string qStr = string.Join(", ", Q);
        string tStr = string.Join(", ", T);
        string hStr = string.Join(", ", H.Select(e => $"({e.From},{e.To},{e.Weight})"));

        return $"Dist = {{{distStr}}}; Pre = {{{preStr}}}; Q = {{{qStr}}}; T = {{{tStr}}}; H = {{{hStr}}}";
    }
}
