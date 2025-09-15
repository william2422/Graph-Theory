namespace GraphApi.Models;

public class StepDto
{
    public int Step { get; set; }
    public string Pseudo { get; set; } = "";   // Mã giả
    public string Explain { get; set; } = "";  // Giải thích ngắn
    public string State { get; set; } = "";    // Dist, Pre, Q, T, H
    public string Color { get; set; } = "";    // thông tin tô màu
    public HighlightDto? Highlight { get; set; }
    public List<string>? AcceptedNodes { get; set; } // các node thuộc đường đi ngắn nhất
    public List<string>? AcceptedEdges { get; set; } // các cạnh thuộc đường đi ngắn nhất
}

public class HighlightDto
{
    public List<string>? Nodes { get; set; }
    public List<string>? Edges { get; set; }
}
