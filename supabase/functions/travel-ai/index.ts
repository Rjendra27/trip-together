// Lovable AI-powered travel recommendations for an Indian destination.
// Returns structured JSON: best_time, foods, hidden_gems, safety_tips, budget_tips, packing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  destination: string;
  trip_type?: string;
  start_date?: string;
  end_date?: string;
  budget_min?: number;
  budget_max?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.destination || typeof body.destination !== "string") {
      return json({ error: "destination is required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userPrompt = `Destination: ${body.destination} (India)
Trip type: ${body.trip_type || "general"}
Dates: ${body.start_date || "flexible"} to ${body.end_date || "flexible"}
Budget per person (INR): ${body.budget_min ?? "?"} - ${body.budget_max ?? "?"}

Generate concise, practical travel recommendations for an Indian traveler. Be specific with local names, dish names, neighborhoods, and approximate INR costs where useful.`;

    const tool = {
      type: "function",
      function: {
        name: "travel_recommendations",
        description: "Structured travel recommendations for a destination.",
        parameters: {
          type: "object",
          properties: {
            best_time: { type: "string", description: "1-2 sentences on best season/months and why." },
            foods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name", "description"],
                additionalProperties: false,
              },
              description: "5 must-try local dishes.",
            },
            hidden_gems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name", "description"],
                additionalProperties: false,
              },
              description: "4 off-beat places most tourists miss.",
            },
            safety_tips: { type: "array", items: { type: "string" }, description: "5 short safety tips." },
            budget_tips: { type: "array", items: { type: "string" }, description: "5 short money-saving tips." },
            packing: { type: "array", items: { type: "string" }, description: "8 essential packing items for this destination/season." },
          },
          required: ["best_time", "foods", "hidden_gems", "safety_tips", "budget_tips", "packing"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert India travel guide. Reply ONLY by calling the travel_recommendations tool." },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "travel_recommendations" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Rate limit hit, please retry shortly." }, 429);
      if (resp.status === 402) return json({ error: "AI credits exhausted. Add credits in workspace settings." }, 402);
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No tool call returned" }, 500);

    const parsed = JSON.parse(args);
    return json(parsed, 200);
  } catch (e) {
    console.error("travel-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
