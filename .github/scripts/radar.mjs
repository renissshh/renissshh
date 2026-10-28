// Draws the "activity overview" radar (commits / issues / PRs / code review share) as a noir + crimson SVG.
// Needs GITHUB_TOKEN and GITHUB_USER; writes dist/activity-overview.svg.
import { mkdirSync, writeFileSync } from "node:fs";

const user = process.env.GITHUB_USER;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query($u:String!){user(login:$u){contributionsCollection{totalCommitContributions totalIssueContributions totalPullRequestContributions totalPullRequestReviewContributions}}}`,
    variables: { u: user },
  }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(`GraphQL failed: ${res.status} ${JSON.stringify(json.errors ?? json)}`);

const c = json.data.user.contributionsCollection;
const total = c.totalCommitContributions + c.totalIssueContributions + c.totalPullRequestContributions + c.totalPullRequestReviewContributions || 1;
const pct = (n) => n / total;
// order: top, right, bottom, left (same layout as GitHub's own radar)
const axes = [
  ["Code review", pct(c.totalPullRequestReviewContributions)],
  ["Issues", pct(c.totalIssueContributions)],
  ["Pull requests", pct(c.totalPullRequestContributions)],
  ["Commits", pct(c.totalCommitContributions)],
];
const W = 520, H = 360, cx = W / 2, cy = 190, R = 90;
const dir = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const pt = (i, f) => [cx + dir[i][0] * R * f, cy + dir[i][1] * R * f];

const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${dir.map((_, i) => pt(i, f).join(",")).join(" ")}" fill="none" stroke="#222224"/>`).join("");
const spokes = dir.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="#2a2a2c"/>`).join("");
const shape = axes.map(([, v], i) => pt(i, Math.max(v, 0.03)).map((n) => n.toFixed(1)).join(",")).join(" ");
const dots = axes.map(([, v], i) => { const [x, y] = pt(i, Math.max(v, 0.03)); return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#e8e4dc"/>`; }).join("");
const labels = axes.map(([name, v], i) => {
  const [x, y] = pt(i, 1.2);
  const anchor = i === 1 ? "start" : i === 3 ? "end" : "middle";
  const dy = i === 0 ? -14 : i === 2 ? 28 : 4;
  return `<text x="${x}" y="${y + dy}" text-anchor="${anchor}" fill="#e8e4dc" font-size="13">${Math.round(v * 100)}%</text><text x="${x}" y="${y + dy + 16}" text-anchor="${anchor}" fill="#8a8680" font-size="12">${name}</text>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Courier New',monospace">
<rect width="${W}" height="${H}" fill="#0b0b0c" stroke="#c1121f" stroke-width="2"/>
<text x="${W / 2}" y="26" text-anchor="middle" fill="#e8e4dc" font-size="14" font-weight="bold" letter-spacing="3">ACTIVITY OVERVIEW</text>
${rings}${spokes}<polygon points="${shape}" fill="#c1121f" fill-opacity=".3" stroke="#c1121f" stroke-width="3"/>${dots}${labels}
</svg>`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/activity-overview.svg", svg);
