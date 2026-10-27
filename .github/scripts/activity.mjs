// Renders the last 30 days of contributions as a pixel-themed SVG line graph.
// Needs GITHUB_TOKEN and GITHUB_USER; writes dist/activity-graph.svg.
import { mkdirSync, writeFileSync } from "node:fs";

const user = process.env.GITHUB_USER;
const to = new Date();
const from = new Date(to.getTime() - 29 * 864e5);
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query($u:String!,$f:DateTime!,$t:DateTime!){user(login:$u){contributionsCollection(from:$f,to:$t){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
    variables: { u: user, f: from.toISOString(), t: to.toISOString() },
  }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(`GraphQL failed: ${res.status} ${JSON.stringify(json.errors ?? json)}`);

const days = json.data.user.contributionsCollection.contributionCalendar.weeks
  .flatMap((w) => w.contributionDays)
  .slice(-30);

const W = 800, H = 280, L = 50, R = 20, T = 60, B = 40;
const max = Math.max(4, ...days.map((d) => d.contributionCount));
const x = (i) => L + (i * (W - L - R)) / (days.length - 1);
const y = (v) => T + (1 - v / max) * (H - T - B);
const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.contributionCount).toFixed(1)}`);
const total = days.reduce((s, d) => s + d.contributionCount, 0);

const grid = Array.from({ length: 5 }, (_, i) => {
  const v = Math.round((max * i) / 4);
  return `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#222224"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
}).join("");
const labels = days
  .map((d, i) => (i % 5 === 0 ? `<text x="${x(i)}" y="${H - 14}" text-anchor="middle">${d.date.slice(5)}</text>` : ""))
  .join("");
const dots = days.map((d, i) => `<rect x="${x(i) - 3}" y="${y(d.contributionCount) - 3}" width="6" height="6" fill="#e8e4dc"/>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Courier New',monospace" font-size="12" fill="#8a8680">
<rect width="${W}" height="${H}" fill="#0b0b0c" stroke="#c1121f" stroke-width="2"/>
<text x="${W / 2}" y="34" text-anchor="middle" font-size="16" font-weight="bold" fill="#e8e4dc">${user.toUpperCase()} // LAST 30 DAYS: ${total} CONTRIBUTIONS</text>
${grid}${labels}
<polygon points="${L},${y(0)} ${pts.join(" ")} ${x(days.length - 1)},${y(0)}" fill="#c1121f" fill-opacity=".18"/>
<polyline points="${pts.join(" ")}" fill="none" stroke="#c1121f" stroke-width="3" stroke-linejoin="miter"/>
${dots}
</svg>`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/activity-graph.svg", svg);
