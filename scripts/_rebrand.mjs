import fs from "fs";
import path from "path";

const MAP = {
  // ---- Ink / structure ----
  "#12281A": "#0B1020", "#12281a": "#0b1020", "#102a1d": "#0B1020",
  "#173823": "#141B41", "#18392b": "#141B41", "#1a3828": "#141B41", "#1b3927": "#141B41",
  "#112d22": "#101635",
  // ---- Brand accent ----
  "#1e4d33": "#5B3DF5", "#1E4D33": "#5B3DF5",
  "#2a6647": "#4A2FD6", "#2A6647": "#4A2FD6", "#2d6549": "#4A2FD6",
  "#42A85D": "#7C5CFF", "#42a85d": "#7C5CFF",
  "#1f563a": "#4A2FD6", "#1f5539": "#3B2BA8", "#1f5133": "#3B2BA8",
  "#2b5b3d": "#3B2BA8", "#1e4630": "#3B2BA8", "#9fb8a5": "#A9A3E8",
  // ---- Soft tints ----
  "#f3f8f2": "#F5F4FF", "#f3f7f2": "#F5F4FF", "#edf5ed": "#F0EEFF", "#eef5ed": "#F0EEFF",
  "#eef5ee": "#F0EEFF", "#ecf5eb": "#EDEAFF", "#eaf5ea": "#EDEAFF", "#e7f2e8": "#EAE7FF",
  "#e1efe2": "#E4E0FF", "#f1f8f2": "#F2F0FF", "#f0f7f1": "#F3F2FF", "#f0f6ee": "#F2F1FF",
  "#eff7ee": "#F1F0FF", "#edf3ee": "#F1F1F6", "#eef4ec": "#EFEFF6", "#f1f5f0": "#F2F2F7",
  "#f4f8f3": "#F4F4F9", "#f3f7f3": "#F5F5F9", "#f8fbf8": "#FAFAFD", "#f7faf7": "#F9F9FC",
  "#fafcf9": "#FBFBFE", "#fbfdfb": "#FCFCFE", "#f8faf7": "#FAFAFD",
  "#FBFAF7": "#FAFAFC", "#fbfaf7": "#FAFAFC", "#f5f1ea": "#F4F5F8", "#efe7dc": "#ECEDF4",
  // ---- Lines ----
  "#dfe8dd": "#E6E7EF", "#e3ebdf": "#E6E7EF", "#e6efe2": "#E9EAF2", "#e7eee4": "#E7E8F0",
  "#e8f0e6": "#ECEDF4", "#e2ecdf": "#E8E9F1", "#d9e7d7": "#E2E3EC", "#d7e6d8": "#E0E1EA",
  "#d5e2d6": "#DEDFEA", "#d7e4d4": "#E0E1EA",
  // ---- Success stays semantic ----
  "#dceee0": "#CDEBD8", "#f3faf4": "#ECFAF1",
  // ---- Muted text ----
  "#587261": "#5B6178", "#5b7265": "#5B6178", "#536d5d": "#5B6178", "#4f6257": "#5B6178",
  "#456356": "#5B6178", "#4e6258": "#5B6178", "#4a6959": "#5B6178", "#496154": "#5B6178",
  "#4d6259": "#5B6178", "#526b5e": "#5B6178", "#5a7266": "#5B6178", "#5f7b6d": "#5B6178",
  "#5d7c69": "#5B6178", "#5d796d": "#5B6178", "#60796d": "#5B6178", "#4f6358": "#5B6178",
  "#5e7869": "#5B6178", "#5f796d": "#5B6178",
  "#617e70": "#8A90A6", "#617d70": "#8A90A6", "#6a7f72": "#8A90A6", "#6d8578": "#8A90A6",
  "#7a8c7f": "#8A90A6", "#7a8f82": "#8A90A6", "#7c9184": "#8A90A6",
  // ---- Light on dark ----
  "#b9d3c4": "#C3C6E8", "#cfe2d4": "#D6D9F0", "#dfeadf": "#E7E4FF",
  // ---- Destructive / warning ----
  "#8b2d2d": "#B42318", "#6c2323": "#8F1D14", "#8a6d3b": "#8A6116",
};

const RGBA = [
  ["rgba(18,40,26,", "rgba(11,16,32,"],
  ["rgba(18, 40, 26,", "rgba(11, 16, 32,"],
  ["rgba(17,45,34,", "rgba(16,22,53,"],
  ["rgba(15,52,31,", "rgba(11,16,32,"],
  ["rgba(66,168,93,", "rgba(124,92,255,"],
  ["rgba(66, 168, 93,", "rgba(124, 92, 255,"],
  ["rgba(30,77,51,", "rgba(91,61,245,"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...walk("app"), ...walk("components")];
let touched = 0, totalSubs = 0;
const perFile = [];

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const before = text;
  let subs = 0;
  for (const [from, to] of Object.entries(MAP)) {
    if (!text.includes(from)) continue;
    const parts = text.split(from);
    subs += parts.length - 1;
    text = parts.join(to);
  }
  for (const [from, to] of RGBA) {
    if (!text.includes(from)) continue;
    const parts = text.split(from);
    subs += parts.length - 1;
    text = parts.join(to);
  }
  if (text !== before) {
    fs.writeFileSync(file, text);
    touched += 1;
    totalSubs += subs;
    perFile.push(`${subs.toString().padStart(3)}  ${file}`);
  }
}

console.log(`files changed: ${touched} | substitutions: ${totalSubs}`);
console.log(perFile.sort((a, b) => parseInt(b) - parseInt(a)).join("\n"));
