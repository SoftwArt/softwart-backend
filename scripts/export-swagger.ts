import * as fs   from "fs";
import * as path from "path";
import spec       from "../src/docs/swagger";

const out = path.join(__dirname, "..", "swagger.json");
fs.writeFileSync(out, JSON.stringify(spec, null, 2));
console.log(`✅  swagger.json exported → ${out}`);
