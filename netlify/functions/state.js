const { neon } = require("@neondatabase/serverless");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store"
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const dbUrl = process.env.NETLIFY_DATABASE_URL;
  if (!dbUrl) return json(500, { error: "Missing NETLIFY_DATABASE_URL" });

  const sql = neon(dbUrl);
  const id = (event.queryStringParameters && event.queryStringParameters.id) || "default";

  try {
    if (event.httpMethod === "GET") {
      const rows = await sql`
        select state, updated_at
        from budget_state
        where id = ${id}
        limit 1
      `;
      if (!rows.length) return json(200, { id, state: null });
      return json(200, { id, state: rows[0].state, updated_at: rows[0].updated_at });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) return json(400, { error: "Missing body" });
      const incoming = JSON.parse(event.body);

      await sql`
        insert into budget_state (id, state, updated_at)
        values (${id}, ${incoming}, now())
        on conflict (id)
        do update set state = excluded.state, updated_at = now()
      `;
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: err.message });
  }
};